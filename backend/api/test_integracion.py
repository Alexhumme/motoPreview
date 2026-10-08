"""Pruebas de integración con PostgreSQL real (flujos completos).

Se omiten por defecto. Para activarlas hace falta una ``MOTOPREVIEW_DATABASE_URL``
cuyo usuario pueda crear bases de datos (el runner de Django crea ``test_<nombre>``):

    $env:RUN_DB_TESTS = "1"
    python manage.py test api.test_integracion -v 2

Los modelos de negocio son ``managed=False`` y no tienen migraciones, así que
este módulo monta el esquema sobre la base de prueba antes de correr los flujos:
enums de PostgreSQL, todas las tablas y la tabla compuesta ``usuario_rol``.

Flujos cubiertos (lo que la revisión P2 pedía probar contra BD real):

* Registro publico -> token de verificación firmado -> verificación -> login.
* Login bloqueado mientras el correo no esté verificado.
* Compatibilidad con tokens de verificación legacy (columna verificacion_token).
* Rechazo de contraseñas de más de 72 bytes y de emails duplicados.
* Crear cotizaciones: límite de ítems, totales calculados, transiciones de estado
  válidas e inválidas y vistas por cliente/admin.
* Inventario: creación, movimientos de entrada/salida, stock y estados.
"""
import os
import uuid
import unittest
from decimal import Decimal

from django.db import connection
from django.test import TestCase
from rest_framework.test import APIClient

from api import tokens
from api.models import (
    Accessory,
    AccessoryCategory,
    AccessoryCompatibility,
    AccessoryToken,
    AccessoryType,
    Configuration,
    ConfigurationDetail,
    Inventory,
    InventoryMovement,
    Model3D,
    Motorcycle,
    MotorcycleBrand,
    MotorcycleModel,
    MovementType,
    Product,
    ProductCategory,
    Quote,
    QuoteDetail,
    QuoteStatusHistory,
    Role,
    Store,
    SubscriptionPlan,
    User,
)
from api.security import ROLE_ADMIN, ROLE_CUSTOMER, ROLE_SELLER

RUN_DB_TESTS = os.environ.get("RUN_DB_TESTS") == "1"

_ENUMS = {
    "plan_estado_enum": ["activo", "inactivo", "suspendido"],
    "tienda_estado_enum": ["activa", "inactiva", "suspendida"],
    "usuario_estado_enum": ["activo", "inactivo", "bloqueado"],
    "inventario_estado_enum": ["normal", "bajo", "agotado"],
    "cotizacion_estado_enum": ["pendiente", "aprobada", "rechazada", "completada"],
}

# Orden de creación respetando las dependencias entre claves foráneas.
_ORDEN_TABLAS = [
    AccessoryCategory,
    ProductCategory,
    AccessoryType,
    Product,
    Accessory,
    MotorcycleBrand,
    MotorcycleModel,
    Motorcycle,
    AccessoryCompatibility,
    Model3D,
    SubscriptionPlan,
    Store,
    Role,
    User,
    Inventory,
    MovementType,
    InventoryMovement,
    Quote,
    QuoteDetail,
    QuoteStatusHistory,
    Configuration,
    ConfigurationDetail,
    AccessoryToken,
]

_esquema_listo = False


def montar_esquema():
    """Crea (idempotente) los enums, las tablas y `usuario_rol` en la base de prueba.

    Debe llamarse desde el runner (motopreview/test_runner.py) o desde un
    setUpClass, pero siempre fuera de las transacciones atómicas de cada test:
    el DDL de PostgreSQL vive en la transacción actual y se revertiría al final
    de una clase TestCase si se creara dentro de ella.
    """
    global _esquema_listo
    if _esquema_listo:
        return
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT typname FROM pg_type WHERE typname = ANY(%s)",
            [list(_ENUMS)],
        )
        existentes = {fila[0] for fila in cursor.fetchall()}
        for nombre, valores in _ENUMS.items():
            if nombre not in existentes:
                labels = ", ".join("'%s'" % valor for valor in valores)
                cursor.execute('CREATE TYPE "%s" AS ENUM (%s)' % (nombre, labels))

        cursor.execute("SELECT to_regclass('public.usuario_rol')")
        if cursor.fetchone()[0] is None:
            cursor.execute(
                "CREATE TABLE usuario_rol ("
                " id_usuario uuid NOT NULL,"
                " id_rol uuid NOT NULL,"
                " PRIMARY KEY (id_usuario, id_rol))"
            )

        for modelo in _ORDEN_TABLAS:
            cursor.execute(
                "SELECT to_regclass(%s)", ["public." + modelo._meta.db_table]
            )
            if cursor.fetchone()[0] is not None:
                continue
            with connection.schema_editor(atomic=False) as editor:
                editor.create_model(modelo)
    _esquema_listo = True


def seed_base():
    """Roles y plan base. Idempotente: no toca filas existentes."""
    for pk, nombre in (
        (ROLE_ADMIN, "admin"),
        (ROLE_SELLER, "vendedor"),
        (ROLE_CUSTOMER, "cliente"),
    ):
        Role.objects.get_or_create(pk=pk, defaults={"nombre_rol": nombre})
    plan, _ = SubscriptionPlan.objects.get_or_create(
        plan_nombre="Plan de prueba",
        defaults={
            "plan_descripcion": "Creado por los tests de integración",
            "precio_mensual": Decimal("50000.00"),
            "limite_productos": 100,
            "limite_usuarios": 100,
        },
    )
    return plan


@unittest.skipUnless(RUN_DB_TESTS, "Requiere RUN_DB_TESTS=1 (ver docstring del módulo).")
class EsquemaTestCase(TestCase):
    """Base común: el esquema lo monta el runner, o, como respaldo, aquí."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        montar_esquema()

    def _crear_usuario(self, nombre, rol_id, *, tienda, email=None, verificado=True):
        from api.views import hash_password, update_user_role

        usuario = User.objects.create(
            tienda_id=tienda.id_tienda if tienda else None,
            usu_nombre=nombre,
            usu_email=email or f"{nombre.lower()}-{uuid.uuid4().hex[:8]}@test.dev",
            password_hash=hash_password("Clave-Segura-123"),
            estado_usuario="activo",
            email_verificado=verificado,
        )
        update_user_role(usuario.id_usuario, rol_id)
        return usuario

    def _correo(self, prefijo):
        return f"{prefijo}-{uuid.uuid4().hex[:8]}@test.dev"

    def _crear_tienda(self, plan, nombre):
        return Store.objects.create(
            plan=plan,
            nombre_tienda=nombre or f"Tienda-{uuid.uuid4().hex[:6]}",
            estado_tienda="activa",
        )


class AuthFlowTests(EsquemaTestCase):
    """Registro publico -> verificación -> login, con la BD real."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        seed_base()

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.email = self._correo("cliente")

    def _registrar(self, password, email=None):
        return self.client.post(
            "/api/auth/register",
            {
                "usu_nombre": "Ana Test",
                "usu_email": email or self.email,
                "password": password,
                "id_rol": ROLE_CUSTOMER,
            },
            format="json",
        )

    def test_registro_y_verificacion_y_login(self):
        respuesta = self._registrar("Clave-Segura-123")
        self.assertEqual(respuesta.status_code, 201, respuesta.json())
        self.assertIn("usuario", respuesta.json())

        # Sin verificar, el login queda bloqueado.
        login = self.client.post(
            "/api/auth/login",
            {"usu_email": self.email, "password": "Clave-Segura-123"},
            format="json",
        )
        self.assertEqual(login.status_code, 403, login.json())
        self.assertIn("verificar", login.json()["error"].lower())

        # La verificación usa el token firmado (independiente del correo SMTP).
        usuario = User.objects.get(usu_email__iexact=self.email)
        self.assertFalse(usuario.email_verificado)
        firma = tokens.verification_token_for(usuario)
        verificacion = self.client.get(f"/api/auth/verificar/{firma}")
        self.assertEqual(verificacion.status_code, 200, verificacion.json())

        usuario.refresh_from_db()
        self.assertTrue(usuario.email_verificado)

        login = self.client.post(
            "/api/auth/login",
            {"usu_email": self.email, "password": "Clave-Segura-123"},
            format="json",
        )
        self.assertEqual(login.status_code, 200, login.json())
        self.assertIn("token", login.json())
        self.assertEqual(login.json()["usuario"]["usu_email"], self.email)

    def test_token_legacy_sigue_verificando(self):
        respuesta = self._registrar("Clave-Segura-123")
        self.assertEqual(respuesta.status_code, 201)
        usuario = User.objects.get(usu_email__iexact=self.email)
        usuario.verificacion_token = "token-legacy-de-prueba"
        usuario.save(update_fields=["verificacion_token"])

        verificacion = self.client.get("/api/auth/verificar/token-legacy-de-prueba")
        self.assertEqual(verificacion.status_code, 200, verificacion.json())

        usuario.refresh_from_db()
        self.assertTrue(usuario.email_verificado)
        self.assertIsNone(usuario.verificacion_token)

    def test_login_con_contrasena_invalida(self):
        self._registrar("Clave-Segura-123")
        # Verificamos primero para aislar el chequeo de credenciales.
        usuario = User.objects.get(usu_email__iexact=self.email)
        firma = tokens.verification_token_for(usuario)
        self.client.get(f"/api/auth/verificar/{firma}")
        login = self.client.post(
            "/api/auth/login",
            {"usu_email": self.email, "password": "otra-clave-invalida"},
            format="json",
        )
        self.assertEqual(login.status_code, 401, login.json())

    def test_registro_rechaza_password_de_mas_de_72_bytes(self):
        respuesta = self._registrar("a" * 73)
        self.assertEqual(respuesta.status_code, 400, respuesta.json())
        self.assertIn("72", respuesta.json()["error"])

    def test_registro_duplicado_da_409(self):
        self.assertEqual(self._registrar("Clave-Segura-123").status_code, 201)
        respuesta = self._registrar("Clave-Segura-123")
        self.assertEqual(respuesta.status_code, 409, respuesta.json())


class QuoteFlowTests(EsquemaTestCase):
    """Creación de cotizaciones, totales y transiciones de estado."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.plan = seed_base()

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.tienda = self._crear_tienda(self.plan, None)
        self.admin = self._crear_usuario(
            "Admin", ROLE_ADMIN, tienda=self.tienda, email=self._correo("admin")
        )
        self._login(self.admin)

        self.categoria = ProductCategory.objects.create(
            nombre=f"Categoría-{uuid.uuid4().hex[:6]}"
        )
        self.tipo = AccessoryType.objects.create(nombre=f"Tipo-{uuid.uuid4().hex[:6]}")
        self.cat_acc = AccessoryCategory.objects.create(
            cat_nombre=f"CatAcc-{uuid.uuid4().hex[:6]}"
        )
        self.accesorios = {}
        for precio in (Decimal("100.00"), Decimal("50.00")):
            producto = Product.objects.create(
                nombre=f"Producto-{uuid.uuid4().hex[:6]}",
                estado="disponible",
                categoria_producto=self.categoria,
                precio=precio,
            )
            accesorio = Accessory.objects.create(
                categoria=self.cat_acc,
                producto=producto,
                tipo=self.tipo,
                color="Negro",
            )
            self.accesorios[precio] = accesorio

        self.marca = MotorcycleBrand.objects.create(marca_nombre=f"Marca-{uuid.uuid4().hex[:6]}")
        self.modelo = MotorcycleModel.objects.create(marca=self.marca, modelo_nombre="Modelo X")
        self.moto = Motorcycle.objects.create(modelo=self.modelo, moto_anio=2024)

    def _login(self, usuario):
        from api.views import issue_jwt

        token = issue_jwt(usuario)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def _crear_cotizacion(self, *accesorios_cantidades):
        items = [
            {"id_accesorio": str(acc.id_accesorio), "cantidad": cantidad}
            for acc, cantidad in accesorios_cantidades
        ]
        return self.client.post(
            "/api/cotizaciones",
            {"id_moto": str(self.moto.id_moto), "items": items},
            format="json",
        )

    def test_crear_cotizacion_con_totales_correctos(self):
        a100, a50 = self.accesorios[Decimal("100.00")], self.accesorios[Decimal("50.00")]
        respuesta = self._crear_cotizacion((a100, 2), (a50, 1))
        self.assertEqual(respuesta.status_code, 201, respuesta.json())
        data = respuesta.json()
        self.assertEqual(Decimal(data["total"]), Decimal("250.00"))
        self.assertEqual(len(data["detalle_cotizacion"]), 2)

        cotizacion = Quote.objects.get(pk=data["id_cotizacion"])
        self.assertEqual(cotizacion.total, Decimal("250.00"))
        self.assertEqual(
            QuoteDetail.objects.filter(cotizacion=cotizacion).count(), 2
        )

    def test_cotizacion_con_accesorios_inexistentes_se_rechaza(self):
        a100 = self.accesorios[Decimal("100.00")]
        respuesta = self._crear_cotizacion((a100, 1))
        # Forzamos un ítem con un UUID inexistente.
        respuesta = self.client.post(
            "/api/cotizaciones",
            {
                "id_moto": str(self.moto.id_moto),
                "items": [
                    {"id_accesorio": str(uuid.uuid4()), "cantidad": 1},
                ],
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, 400, respuesta.json())

    def test_transiciones_de_estado_validas_e_invalidas(self):
        a100 = self.accesorios[Decimal("100.00")]
        cotizacion = self._crear_cotizacion((a100, 1))
        self.assertEqual(cotizacion.status_code, 201)
        pk = cotizacion.json()["id_cotizacion"]

        cambio = self.client.put(
            f"/api/cotizaciones/{pk}/estado",
            {"coti_estado": "aprobada"},
            format="json",
        )
        self.assertEqual(cambio.status_code, 200, cambio.json())
        cambio = self.client.put(
            f"/api/cotizaciones/{pk}/estado",
            {"coti_estado": "completada"},
            format="json",
        )
        self.assertEqual(cambio.status_code, 200, cambio.json())

        # De "completada" no se puede volver a "pendiente".
        invalido = self.client.put(
            f"/api/cotizaciones/{pk}/estado",
            {"coti_estado": "pendiente"},
            format="json",
        )
        self.assertEqual(invalido.status_code, 400, invalido.json())
        self.assertIn("No se puede pasar", invalido.json()["error"])

        historial = QuoteStatusHistory.objects.filter(cotizacion_id=pk).count()
        # Solo las transiciones válidas registran historial.
        self.assertEqual(historial, 2)

    def test_cliente_solo_ve_y_edita_sus_cotizaciones(self):
        a100 = self.accesorios[Decimal("100.00")]
        cotizacion = self._crear_cotizacion((a100, 1))
        pk = cotizacion.json()["id_cotizacion"]

        cliente = self._crear_usuario(
            "Cliente", ROLE_CUSTOMER, tienda=None, email=self._correo("cliente")
        )
        self._login(cliente)

        lista = self.client.get("/api/cotizaciones")
        self.assertEqual(lista.status_code, 200, lista.json())
        # El cliente no ve cotizaciones ajenas (lista plana vacía).
        self.assertEqual(lista.json(), [])

        cambio = self.client.put(
            f"/api/cotizaciones/{pk}/estado",
            {"coti_estado": "aprobada"},
            format="json",
        )
        self.assertEqual(cambio.status_code, 403, cambio.json())

        detalle = self.client.get(f"/api/cotizaciones/{pk}")
        self.assertEqual(detalle.status_code, 404, detalle.json())


class InventoryFlowTests(EsquemaTestCase):
    """Inventario real: creación, movimientos, stock y estados."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.plan = seed_base()
        cls.tipo_entrada, _ = MovementType.objects.get_or_create(
            id_tipomov=uuid.UUID("33333333-0000-0000-0000-000000000001"),
            defaults={"tipomov_nombre": "entrada", "descripcion_tipomov": "Entrada de stock"},
        )
        cls.tipo_salida, _ = MovementType.objects.get_or_create(
            id_tipomov=uuid.UUID("33333333-0000-0000-0000-000000000002"),
            defaults={"tipomov_nombre": "salida", "descripcion_tipomov": "Salida de stock"},
        )

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.tienda = self._crear_tienda(self.plan, None)
        self.admin = self._crear_usuario(
            "Admin", ROLE_ADMIN, tienda=self.tienda, email=self._correo("admin")
        )
        self._login(self.admin)

        self.categoria = ProductCategory.objects.create(nombre=f"Categoría-{uuid.uuid4().hex[:6]}")
        self.tipo = AccessoryType.objects.create(nombre=f"Tipo-{uuid.uuid4().hex[:6]}")
        self.cat_acc = AccessoryCategory.objects.create(cat_nombre=f"CatAcc-{uuid.uuid4().hex[:6]}")
        producto = Product.objects.create(
            nombre=f"Producto-{uuid.uuid4().hex[:6]}",
            estado="disponible",
            categoria_producto=self.categoria,
            precio=Decimal("80.00"),
        )
        self.accesorio = Accessory.objects.create(
            categoria=self.cat_acc, producto=producto, tipo=self.tipo, color="Rojo"
        )

    def _login(self, usuario):
        from api.views import issue_jwt

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {issue_jwt(usuario)}")

    def _crear_inventario(self, stock=5, minimo=2):
        return self.client.post(
            "/api/inventario",
            {
                "id_accesorio": str(self.accesorio.id_accesorio),
                "stock_actual": stock,
                "stock_minimo": minimo,
            },
            format="json",
        )

    def test_crear_inventario_y_aplicar_movimientos(self):
        respuesta = self._crear_inventario(stock=5, minimo=2)
        self.assertEqual(respuesta.status_code, 201, respuesta.json())
        inv = respuesta.json()
        self.assertEqual(inv["estado_inventario"], "normal")

        entrada = self.client.post(
            "/api/inventario/movimiento",
            {
                "id_inventario": inv["id_inventario"],
                "id_tipomov": str(self.tipo_entrada.id_tipomov),
                "mov_cantidad": 3,
            },
            format="json",
        )
        self.assertEqual(entrada.status_code, 201, entrada.json())
        self.assertEqual(entrada.json()["inventarioActualizado"]["stock_actual"], 8)
        self.assertEqual(entrada.json()["inventarioActualizado"]["estado_inventario"], "normal")

        salida = self.client.post(
            "/api/inventario/movimiento",
            {
                "id_inventario": inv["id_inventario"],
                "id_tipomov": str(self.tipo_salida.id_tipomov),
                "mov_cantidad": 7,
            },
            format="json",
        )
        self.assertEqual(salida.status_code, 201, salida.json())
        self.assertEqual(salida.json()["inventarioActualizado"]["stock_actual"], 1)
        self.assertEqual(salida.json()["inventarioActualizado"]["estado_inventario"], "bajo")
        self.assertEqual(salida.json()["movimiento"]["mov_cantidad"], -7)

    def test_movimiento_que_deja_stock_negativo_se_rechaza(self):
        respuesta = self._crear_inventario(stock=2, minimo=2)
        inv = respuesta.json()
        salida = self.client.post(
            "/api/inventario/movimiento",
            {
                "id_inventario": inv["id_inventario"],
                "id_tipomov": str(self.tipo_salida.id_tipomov),
                "mov_cantidad": 5,
            },
            format="json",
        )
        self.assertEqual(salida.status_code, 400, salida.json())
        self.assertIn("negativo", salida.json()["error"])

    def test_inventario_requiere_autenticacion(self):
        sin_token = APIClient()
        respuesta = sin_token.get("/api/inventario")
        self.assertEqual(respuesta.status_code, 401, respuesta.json())