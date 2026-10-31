"""Pruebas del RBAC: scopes de `usuario_tiene_permiso`, recurso por vista y
serializador de permisos de rol.

No necesitan base de datos: se sustituye el manager de `RolRecurso` por un
doble que registra los filtros recibidos, igual que el resto de la suite de
extremos.

Ejecutar:  python manage.py test api
"""
from contextlib import nullcontext
from types import SimpleNamespace
from unittest import mock

from django.db.models import Q
from django.test import SimpleTestCase
from rest_framework import serializers

from .security import (
    RECURSOS_CON_TIENDA,
    SCOPES,
    EscribirConPermiso,
    HasPermiso,
    IsSuperAdmin,
    ROLE_ADMIN,
    ROLE_CUSTOMER,
    ROLE_SELLER,
    ROLE_SUPERADMIN,
    es_rol_de_sede,
    es_superadmin,
    filas_del_scope,
    get_accion_from_method,
    get_recurso_from_view,
    normalizar_concesiones,
    normalizar_scope,
    puede_asignar_rol,
    propietario_del_objeto,
    scopes_aplicables,
    scopes_validos,
    tienda_del_objeto,
    validar_concesion,
    usuario_tiene_permiso,
)
from .serializers import RolRecursoSerializer
from .views import (
    ConfigurationDetail,
    DatabaseGuardMixin,
    InventoryDetail,
    InventoryMovementView,
    QuoteDetailView,
    QuoteHistoryView,
    QuoteStatus,
    ResourceCollection,
    ResourceDetail,
    UserDetail,
    denegar_edicion_de_cuenta,
    register,
)

CODIGOS_RECURSO_SEMBRADOS = {
    "productos", "categorias", "tipos", "inventario", "cotizaciones", "ventas",
    "usuarios", "roles", "tiendas", "configuraciones", "marcas", "modelos",
    "motos", "compatibilidad", "modelos3d",
}

TIENDA = "aaaaaaaa-0000-0000-0000-000000000001"
OTRA_TIENDA = "bbbbbbbb-0000-0000-0000-000000000002"
USUARIO = "cccccccc-0000-0000-0000-000000000003"


def usuario(tienda=None, roles=(ROLE_ADMIN,), id_usuario=USUARIO, superadmin_vigente=True):
    """Cuenta de prueba sin BD.

    `superadmin_vigente` precarga el atributo que `es_superadmin` consulta contra
    la tabla `rol`; con `False` se prueba el rol de sede desactivado sin base de
    datos.
    """
    return SimpleNamespace(
        is_authenticated=True,
        is_anonymous=False,
        pk=id_usuario,
        id_usuario=id_usuario,
        id_tienda=tienda,
        role_ids=list(roles),
        rol_superadmin_vigente=superadmin_vigente,
    )


class DobleConsulta:
    """QuerySet falso: guarda los filtros recibidos y responde con scopes.

    `concedido` admite un booleano (todo lo que la consulta pedía, o nada) o la
    lista literal de scopes de las filas, para probar una concesión concreta.
    No es iterable a propósito: el código que recorriera el queryset (como hacía
    la versión anterior de `usuario_tiene_permiso`) revienta aquí, y eso es justo
    lo que queremos detectar.
    """

    def __init__(self, concedido):
        self.concedido = concedido
        self.filtros = None
        self.consultas = 0

    def filter(self, **filtros):
        self.filtros = filtros
        self.consultas += 1
        return self

    def exists(self):
        return bool(self.concedido)

    def values_list(self, campo, flat=False):
        if isinstance(self.concedido, (list, tuple, set)):
            return list(self.concedido)
        if not self.concedido:
            return []
        if campo != "scope":
            return []
        return list((self.filtros or {}).get("scope__in") or [])


def _clases_de_permiso(permisos):
    """Aplana las composiciones (`IsAuthenticated & EscribirConPermiso`).

    DRF guarda los dos lados del operador en `op1_class`/`op2_class`, así que
    una vista puede estar gobernada por la matriz sin que la clase aparezca
    directamente en `permission_classes`.
    """
    clases = []
    for permiso in permisos:
        if isinstance(permiso, type):
            clases.append(permiso)
            continue
        for attr in ("op1_class", "op2_class"):
            valor = getattr(permiso, attr, None)
            if valor is not None:
                clases.extend(_clases_de_permiso([valor]))
    return clases


class ScopesDePermisoTests(SimpleTestCase):
    def test_superadmin_no_consulta_la_matriz(self):
        doble = DobleConsulta(concedido=False)
        with mock.patch("api.models.RolRecurso.objects", doble):
            self.assertTrue(usuario_tiene_permiso(
                usuario(roles=[ROLE_SUPERADMIN]), "productos", "crear"))
        self.assertIsNone(doble.filtros)

    def test_deniega_al_anonimo(self):
        anonimo = SimpleNamespace(is_authenticated=False, role_ids=[])
        self.assertFalse(usuario_tiene_permiso(anonimo, "productos", "crear"))

    def test_deniega_sin_roles(self):
        doble = DobleConsulta(concedido=True)
        with mock.patch("api.models.RolRecurso.objects", doble):
            self.assertFalse(usuario_tiene_permiso(
                usuario(roles=[]), "productos", "crear"))
        self.assertIsNone(doble.filtros)

    def test_consulta_el_recurso_y_la_accion_correctos(self):
        doble = DobleConsulta(concedido=True)
        with mock.patch("api.models.RolRecurso.objects", doble):
            self.assertTrue(usuario_tiene_permiso(
                usuario(), "productos", "crear", tienda_id=OTRA_TIENDA, usuario_id="otro"))
        self.assertEqual(doble.filtros["recurso_accion__recurso__codigo"], "productos")
        self.assertEqual(doble.filtros["recurso_accion__accion__codigo"], "crear")

    def test_tienda_ajena_se_deniega_sin_consultar_la_matriz(self):
        """Un admin con tienda no alcanza filas de otra tienda ni con scope `global`.

        La semilla da `global` al rol Admin de tienda en todos los recursos; si
        ese scope se lee sin techo, cambiar el `pk` abre la tienda vecina. La
        denegación es directa: no tiene sentido ni consultar.
        """
        doble = DobleConsulta(concedido=True)
        with mock.patch("api.models.RolRecurso.objects", doble):
            self.assertFalse(usuario_tiene_permiso(
                usuario(tienda=TIENDA), "inventario", "leer", tienda_id=OTRA_TIENDA))
        self.assertIsNone(doble.filtros)

    def test_cuenta_sin_tienda_no_alcanza_la_fila_de_otra(self):
        """Sin tienda y sin ser de la sede, el `global` no recorre filas ajenas.

        Era el hueco que dejaba el `global` sembrado para el rol Admin: una
        cuenta mal asignada, sin tienda propia, podía escribir en cualquier tienda
        cambiando el `pk` porque no había con qué acotar el alcance.
        """
        doble = DobleConsulta(concedido=True)
        with mock.patch("api.models.RolRecurso.objects", doble):
            self.assertFalse(usuario_tiene_permiso(
                usuario(tienda=None), "inventario", "leer", tienda_id=OTRA_TIENDA))
        self.assertIsNone(doble.filtros)

    def test_el_listado_de_una_cuenta_sin_tienda_si_consulta_la_matriz(self):
        """Sin fila concreta la autorización corre y el filtrado da el 400 propio."""
        doble = DobleConsulta(concedido=True)
        with mock.patch("api.models.RolRecurso.objects", doble):
            self.assertTrue(usuario_tiene_permiso(
                usuario(tienda=None), "inventario", "leer"))
        self.assertEqual(tuple(doble.filtros["scope__in"]), SCOPES)

    def test_consulta_solo_roles_vigentes(self):
        doble = DobleConsulta(concedido=True)
        with mock.patch("api.models.RolRecurso.objects", doble):
            usuario_tiene_permiso(usuario(tienda=TIENDA), "inventario", "leer")
        self.assertTrue(doble.filtros["rol__activo"])
        self.assertTrue(doble.filtros["activo"])

    def test_roles_multiples_se_combinan_con_or(self):
        doble = DobleConsulta(concedido=True)
        with mock.patch("api.models.RolRecurso.objects", doble):
            self.assertTrue(usuario_tiene_permiso(
                usuario(tienda=TIENDA, roles=[ROLE_SELLER, ROLE_ADMIN]),
                "inventario", "leer"))
        self.assertEqual(
            sorted(str(x) for x in doble.filtros["rol_id__in"]),
            sorted([ROLE_SELLER, ROLE_ADMIN]))

    def test_usuario_bloqueado_no_autoriza(self):
        doble = DobleConsulta(concedido=True)
        bloqueado = usuario(tienda=TIENDA)
        bloqueado.estado_usuario = "bloqueado"
        with mock.patch("api.models.RolRecurso.objects", doble):
            self.assertFalse(usuario_tiene_permiso(bloqueado, "inventario", "leer"))
        self.assertIsNone(doble.filtros)

    def test_un_scope_no_aplicable_deja_inerte_la_concesion(self):
        """Vendedor tiene `productos:crear` con scope `tienda` y `producto` no tiene tienda.

        La concesión no se convierte en acceso global: queda inerte hasta que se
        corrija el dato, que es donde está el error.
        """
        doble = DobleConsulta(concedido=["tienda"])
        with mock.patch("api.models.RolRecurso.objects", doble):
            self.assertFalse(usuario_tiene_permiso(
                usuario(tienda=TIENDA), "productos", "crear"))

    def test_la_matriz_se_consulta_una_sola_vez_por_par_recurso_accion(self):
        """Autorizar y filtrar filas son la misma lectura; el par se cachea en la cuenta."""
        doble = DobleConsulta(concedido=["global", "tienda"])
        cuenta = usuario(tienda=TIENDA)
        with mock.patch("api.models.RolRecurso.objects", doble):
            self.assertTrue(usuario_tiene_permiso(cuenta, "inventario", "leer"))
            self.assertTrue(usuario_tiene_permiso(cuenta, "inventario", "leer", TIENDA))
            self.assertTrue(usuario_tiene_permiso(cuenta, "inventario", "crear"))
        self.assertEqual(doble.consultas, 2)

    def test_fila_propia_ofrece_global_y_tienda(self):
        self.assertEqual(scopes_aplicables(usuario(tienda=TIENDA), "inventario", TIENDA),
                         ["global", "tienda"])

    def test_sin_fila_concreta_tambien_se_acota_a_la_tienda(self):
        self.assertEqual(scopes_aplicables(usuario(tienda=TIENDA), "inventario"),
                         ["global", "tienda"])

    def test_tienda_ajena_no_ofrece_ningun_scope(self):
        self.assertEqual(scopes_aplicables(usuario(tienda=TIENDA), "inventario", OTRA_TIENDA), [])

    def test_sin_tienda_no_hay_scope_tienda(self):
        self.assertEqual(scopes_aplicables(usuario(tienda=None), "inventario"), ["global"])

    def test_recurso_sin_columna_de_tienda_no_acepta_scope_tienda(self):
        """`producto`, `categoria_producto` y `tipo_accesorio` no tienen tienda.

        Aceptar un scope `tienda` sobre esas tablas daría a una tienda escritura
        sobre el catálogo global de las otras, así que el alcance que se ofrece
        es `global` y ninguna concesión `tienda` lo cruza.
        """
        self.assertEqual(scopes_aplicables(usuario(tienda=TIENDA), "productos", TIENDA),
                         ["global"])

    def test_el_dueño_de_la_fila_ofrece_el_scope_propio(self):
        self.assertIn("propio", scopes_aplicables(
            usuario(tienda=TIENDA), "cotizaciones", TIENDA, USUARIO))

    def test_destino_distinto_excluye_el_scope_propio(self):
        self.assertNotIn("propio", scopes_aplicables(
            usuario(tienda=TIENDA), "cotizaciones", TIENDA, "otro-usuario"))

    def test_sin_destino_ofrece_el_scope_propio(self):
        self.assertIn("propio", scopes_aplicables(usuario(tienda=TIENDA), "configuraciones"))

    def test_recurso_sin_dueño_no_acepta_scope_propio(self):
        self.assertNotIn("propio", scopes_aplicables(usuario(tienda=TIENDA), "inventario"))


class FiltradoDeFilasTests(SimpleTestCase):
    """Las filas que ve cada ruta salen de los scopes, no del rol del llamador.

    `request.user.id_tienda` a mano en el queryset daba los dos errores
    contrarios: la cuenta de sede sin tienda asignada se quedaba sin filas (400 o
    404) y un cliente con scope `propio` recibía la tienda entera cuando el rol
    era de personal. Aquí se comprueba el `Q` que produce cada combinación.
    """

    def test_la_sede_no_pone_filtro_de_tienda(self):
        """`Q()` sin condiciones: la sede ve todas las filas, tenga o no tienda."""
        predicado, error = filas_del_scope(
            usuario(roles=[ROLE_SUPERADMIN]), "inventario", set(SCOPES))
        self.assertIsNone(error)
        self.assertEqual(predicado.deconstruct(), Q().deconstruct())

    def test_el_scope_global_de_una_tienda_se_acota_a_ella(self):
        predicado, error = filas_del_scope(
            usuario(tienda=TIENDA, roles=[ROLE_ADMIN]), "inventario", {"global"})
        self.assertIsNone(error)
        self.assertEqual(predicado.deconstruct(), Q(tienda_id=TIENDA).deconstruct())

    def test_el_scope_tienda_filtra_por_la_tienda_propia(self):
        predicado, error = filas_del_scope(
            usuario(tienda=TIENDA, roles=[ROLE_SELLER]), "inventario", {"tienda"})
        self.assertIsNone(error)
        self.assertEqual(predicado.deconstruct(), Q(tienda_id=TIENDA).deconstruct())

    def test_el_scope_propio_filtra_por_el_dueno(self):
        cliente = usuario(tienda=None, roles=[ROLE_CUSTOMER])
        predicado, error = filas_del_scope(
            cliente, "cotizaciones", {"propio"}, campo_dueno="usuario_id")
        self.assertIsNone(error)
        self.assertEqual(predicado.deconstruct(), Q(usuario_id=USUARIO).deconstruct())

    def test_la_tienda_de_las_configuraciones_es_la_del_dueno(self):
        """La tabla `configuracion` no tiene columna de tienda: se alcanza por el usuario."""
        predicado, error = filas_del_scope(
            usuario(tienda=TIENDA, roles=[ROLE_SELLER]), "configuraciones", {"tienda"},
            campo_tienda="usuario__tienda", campo_dueno="usuario_id")
        self.assertIsNone(error)
        self.assertEqual(predicado.deconstruct(),
                         Q(usuario__tienda=TIENDA).deconstruct())

    def test_los_scopes_combinados_se_unen_con_or(self):
        """Un rol con `tienda` y `propio` sobre la misma tabla ve la unión."""
        predicado, error = filas_del_scope(
            usuario(tienda=TIENDA, roles=[ROLE_ADMIN]), "cotizaciones",
            {"tienda", "propio"}, campo_dueno="usuario_id")
        self.assertIsNone(error)
        self.assertEqual(
            predicado.deconstruct(),
            (Q(tienda_id=TIENDA) | Q(usuario_id=USUARIO)).deconstruct())

    def test_sin_scopes_no_hay_filas(self):
        """Nadie que no tenga ninguna concesión sobre el recurso recibe filas."""
        predicado, error = filas_del_scope(
            usuario(tienda=TIENDA, roles=[ROLE_ADMIN]), "inventario", set())
        self.assertIsNone(predicado)
        self.assertEqual(error[0], 403)

    def test_cuenta_sin_tienda_recibe_el_error_de_costumbre(self):
        """No es un 403 vacío: el panel ya muestra el mensaje de la tienda asignada."""
        predicado, error = filas_del_scope(
            usuario(tienda=None, roles=[ROLE_ADMIN]), "usuarios", {"global"})
        self.assertIsNone(predicado)
        self.assertEqual(error, (400, "El usuario no tiene una tienda asignada."))

    def test_la_cuenta_sin_tienda_con_scope_propio_si_tiene_filas(self):
        """El cliente sin tienda no recibe el 400: su alcance es `propio`.

        Es el caso que la ruta de cotizaciones resolvía por rol y no por matriz:
        el 400 de "sin tienda" habría dejado el historial del cliente vacío.
        """
        cliente = usuario(tienda=None, roles=[ROLE_CUSTOMER])
        predicado, error = filas_del_scope(
            cliente, "cotizaciones", {"global", "propio"}, campo_dueno="usuario_id")
        self.assertIsNone(error)
        self.assertEqual(predicado.deconstruct(), Q(usuario_id=USUARIO).deconstruct())

    def test_las_rutas_de_filas_usan_el_filtrado_por_scope(self):
        """Garantía estructural: la fila la acota la matriz, no un `if` del rol.

        Sin esta comprobación vuelve a colarse un `filter(tienda_id=...)` escrito
        a mano en cualquier ruta nueva y el filtro deja de salir de la concesión.
        """
        import inspect

        import api.views as module

        rutas = ["InventoryCollection", "InventoryDetail", "InventoryMovementView",
                 "QuoteCollection", "QuoteDetailView", "QuoteStatus", "QuoteHistoryView",
                 "UserCollection", "UserDetail", "ConfigurationCollection",
                 "ConfigurationDetail"]
        sin_filtrar = []
        for nombre in rutas:
            texto = inspect.getsource(getattr(module, nombre))
            # Las dos configuraciones comparten el arma de queryset de abajo.
            if "filtrar_por_scope" not in texto and "scope_configurations(self" not in texto:
                sin_filtrar.append(nombre)
        self.assertEqual(sin_filtrar, [], "rutas que filtran filas fuera de la matriz")

    def test_scope_configurations_filtra_por_la_matriz(self):
        import inspect

        import api.views as module

        self.assertIn("filtrar_por_scope", inspect.getsource(module.scope_configurations))

    def test_ningun_listado_repite_la_tienda_del_usuario(self):
        """Quedan fuera la creación de inventario y el resumen del panel.

        Las dos excepciones legítimas son un destino, no un filtro: `POST
        /api/inventario` nace en la tienda de quien crea y el resumen sin tienda
        asignada responde ceros para que el panel cargue.
        """
        import inspect

        import api.views as module

        rutas = ["InventoryDetail", "InventoryMovementView", "QuoteCollection",
                 "QuoteDetailView", "QuoteStatus", "QuoteHistoryView", "UserCollection",
                 "UserDetail", "scope_configurations"]
        repetidos = [nombre for nombre in rutas
                     if "request.user.id_tienda" in inspect.getsource(getattr(module, nombre))]
        self.assertEqual(repetidos, [], "rutas que aún filtran por la tienda del usuario")


class DobleQueryset:
    """Queryset falso que anota los filtros encadenados y nunca devuelve fila.

    Basta para ver el predicado que la vista aplica: la fila no existe (no hay
    base de datos) y la ruta responde 404, pero el `Q` queda registrado.
    """

    def __init__(self):
        self.filtros = []

    def all(self):
        return self

    def select_related(self, *campos):
        return self

    def prefetch_related(self, *relaciones):
        return self

    def order_by(self, *campos):
        return self

    def select_for_update(self):
        return self

    def filter(self, *args, **kwargs):
        self.filtros.append((args, kwargs))
        return self

    def first(self):
        return None

    def exists(self):
        return False

    def predica(self, indice=0):
        """El `Q` que la vista aplicó en la posición indicada."""
        return self.filtros[indice][0][0]


class RutasFiltranSusFilasTests(SimpleTestCase):
    """Cada ruta de filas aplica el `Q` de la matriz antes de resolver el `pk`.

    Es la prueba de que manipular un `pk` no abre la fila de otra tienda o de
    otro dueño: el filtro va en la consulta, no en un `if` posterior. Se anota el
    predicado en lugar del resultado porque aquí no hay filas que devolver.
    """

    def peticion(self, method, user, datos=None):
        return SimpleNamespace(method=method.upper(), user=user, data=dict(datos or {}),
                               query_params={})

    def inventario(self, user, concesion=("global", "tienda")):
        filas = DobleQueryset()
        with mock.patch("api.models.RolRecurso.objects", DobleConsulta(concedido=list(concesion))), \
                mock.patch("api.views.Inventory.objects",
                           SimpleNamespace(select_related=lambda *campos: filas)):
            respuesta = InventoryDetail().get(self.peticion("GET", user), "pk-ajeno")
        self.assertEqual(respuesta.status_code, 404)
        return filas

    def test_el_detalle_de_inventario_filtra_por_su_tienda(self):
        filas = self.inventario(usuario(tienda=TIENDA, roles=[ROLE_ADMIN]))
        self.assertEqual(filas.predica().deconstruct(), Q(tienda_id=TIENDA).deconstruct())
        self.assertEqual(filas.filtros[1][1], {"pk": "pk-ajeno"})

    def test_la_sede_sin_tienda_resuelve_el_pk_sin_filtro_de_tienda(self):
        """El usuario de sede ya no recibe 404 por no tener tienda propia."""
        filas = self.inventario(usuario(roles=[ROLE_SUPERADMIN]))
        self.assertEqual(filas.predica().deconstruct(), Q().deconstruct())

    def test_el_movimiento_busca_la_fila_del_scope(self):
        filas = DobleQueryset()
        peticion = self.peticion("POST", usuario(tienda=TIENDA, roles=[ROLE_SELLER]),
                                 {"id_inventario": "pk-ajeno", "id_tipomov": "t",
                                  "mov_cantidad": 1})
        with mock.patch("api.models.RolRecurso.objects",
                        DobleConsulta(concedido=["tienda"])), \
                mock.patch("api.views.Inventory.objects", SimpleNamespace(all=lambda: filas)), \
                mock.patch("api.views.transaction.atomic", return_value=nullcontext()):
            respuesta = InventoryMovementView().post(peticion)
        self.assertEqual(respuesta.status_code, 404)
        self.assertEqual(filas.predica().deconstruct(), Q(tienda_id=TIENDA).deconstruct())

    def test_la_cotizacion_detalle_filtra_tienda_o_dueno(self):
        casos = [
            (usuario(tienda=TIENDA, roles=[ROLE_ADMIN]), ("global", "tienda"),
             Q(tienda_id=TIENDA)),
            (usuario(tienda=None, roles=[ROLE_CUSTOMER]), ("propio",),
             Q(usuario_id=USUARIO)),
        ]
        for user, concesion, esperado in casos:
            filas = DobleQueryset()
            with mock.patch("api.models.RolRecurso.objects",
                            DobleConsulta(concedido=list(concesion))), \
                    mock.patch("api.views.Quote.objects",
                               SimpleNamespace(select_related=lambda *campos: filas,
                                               all=lambda: filas)):
                respuesta = QuoteDetailView().get(self.peticion("GET", user), "pk-ajeno")
            self.assertEqual(respuesta.status_code, 404)
            self.assertEqual(filas.predica().deconstruct(), esperado.deconstruct())

    def test_el_estado_de_la_cotizacion_solo_toca_la_fila_del_scope(self):
        filas = DobleQueryset()
        peticion = self.peticion("PUT", usuario(tienda=TIENDA, roles=[ROLE_ADMIN]),
                                 {"coti_estado": "aprobada"})
        with mock.patch("api.models.RolRecurso.objects",
                        DobleConsulta(concedido=["global", "tienda"])), \
                mock.patch("api.views.Quote.objects", SimpleNamespace(all=lambda: filas)), \
                mock.patch("api.views.transaction.atomic", return_value=nullcontext()):
            respuesta = QuoteStatus().update_status(peticion, "pk-ajeno")
        self.assertEqual(respuesta.status_code, 404)
        self.assertEqual(filas.predica().deconstruct(), Q(tienda_id=TIENDA).deconstruct())

    def test_el_historial_se_lee_solo_si_la_fila_es_del_scope(self):
        filas = DobleQueryset()
        peticion = self.peticion("GET", usuario(tienda=OTRA_TIENDA, roles=[ROLE_ADMIN]))
        with mock.patch("api.models.RolRecurso.objects",
                        DobleConsulta(concedido=["global", "tienda"])), \
                mock.patch("api.views.Quote.objects", SimpleNamespace(all=lambda: filas)):
            respuesta = QuoteHistoryView().get(peticion, "pk-de-otra-tienda")
        self.assertEqual(respuesta.status_code, 404)
        self.assertEqual(filas.predica().deconstruct(), Q(tienda_id=OTRA_TIENDA).deconstruct())

    def test_la_ficha_de_usuario_filtra_por_su_tienda(self):
        filas = DobleQueryset()
        peticion = self.peticion("GET", usuario(tienda=TIENDA, roles=[ROLE_ADMIN]))
        with mock.patch("api.models.RolRecurso.objects",
                        DobleConsulta(concedido=["global"])), \
                mock.patch("api.views.User.objects", SimpleNamespace(all=lambda: filas)):
            respuesta = UserDetail().get(peticion, "pk-ajeno")
        self.assertEqual(respuesta.status_code, 404)
        self.assertEqual(filas.predica().deconstruct(), Q(tienda_id=TIENDA).deconstruct())

    def test_una_cuenta_sin_tienda_y_sin_sede_no_recibe_filas(self):
        """El 400 de siempre, pero dicho por la matriz: no hay tienda que filtrar."""
        filas = DobleQueryset()
        peticion = self.peticion("GET", usuario(tienda=None, roles=[ROLE_ADMIN]))
        with mock.patch("api.models.RolRecurso.objects",
                        DobleConsulta(concedido=["global"])), \
                mock.patch("api.views.User.objects", SimpleNamespace(all=lambda: filas)):
            respuesta = UserDetail().get(peticion, "pk-cualquiera")
        self.assertEqual(respuesta.status_code, 404)
        self.assertEqual(filas.filtros, [], "la vista consultó sin alcance de filas")

    def test_sin_concesion_sobre_el_recurso_no_hay_consulta(self):
        filas = DobleQueryset()
        peticion = self.peticion("GET", usuario(tienda=TIENDA, roles=[ROLE_SELLER]))
        with mock.patch("api.models.RolRecurso.objects", DobleConsulta(concedido=[])), \
                mock.patch("api.views.Inventory.objects",
                           SimpleNamespace(select_related=lambda *campos: filas)):
            respuesta = InventoryDetail().get(peticion, "pk-cualquiera")
        self.assertEqual(respuesta.status_code, 403)
        self.assertEqual(filas.filtros, [])


class ScopeConfigurationsTests(SimpleTestCase):
    """Las configuraciones se filtran por la tienda del dueño: la tabla no tiene columna.

    `configuracion` solo tiene `id_usuario`, así que el scope `tienda` del
    personal alcanza las fichas de los usuarios de su tienda y el `propio` del
    cliente las suyas. Resuelto con `request.user.id_tienda` a mano, el cliente
    se llevaba el 400 de "sin tienda asignada".
    """

    def detalle(self, user, concesion):
        doble = DobleQueryset()
        peticion = SimpleNamespace(method="GET", user=user, query_params={})
        with mock.patch("api.models.RolRecurso.objects",
                        DobleConsulta(concedido=list(concesion))), \
                mock.patch("api.views.Configuration.objects",
                           SimpleNamespace(select_related=lambda *campos: doble)):
            respuesta = ConfigurationDetail().get(peticion, "pk-una")
        self.assertEqual(respuesta.status_code, 404)
        return doble

    def test_el_personal_de_tienda_ve_las_fichas_de_sus_usuarios(self):
        doble = self.detalle(usuario(tienda=TIENDA, roles=[ROLE_ADMIN]), ["global", "tienda"])
        self.assertEqual(doble.predica().deconstruct(),
                         Q(usuario__tienda=TIENDA).deconstruct())

    def test_el_cliente_ve_las_suyas_sin_tienda_asignada(self):
        doble = self.detalle(usuario(tienda=None, roles=[ROLE_CUSTOMER]), ["propio"])
        self.assertEqual(doble.predica().deconstruct(), Q(usuario_id=USUARIO).deconstruct())


class RecursoPorVistaTests(SimpleTestCase):
    def test_vista_sin_permiso_recurso_se_deniega(self):
        class VistaSinDeclarar(ResourceCollection):
            pass

        with self.assertLogs("api.security", level="WARNING"):
            self.assertIsNone(get_recurso_from_view(VistaSinDeclarar()))

    def test_toda_vista_de_escritura_declara_si_su_lectura_es_publica(self):
        """`lectura_sin_matriz` se declara; no declarada, la lectura se deniega.

        El catálogo es la vidriera y se lee sin sesión, pero eso tiene que ser
        una decisión visible por ruta. Las vistas de administración leen con la
        matriz (`False`) o con `True` compuesto con `IsAuthenticated`, como las
        tiendas, que no son vitrina pero las necesita el vendedor de la suya.
        """
        import api.views as module

        sin_declarar = []
        for nombre in dir(module):
            objeto = getattr(module, nombre)
            if not isinstance(objeto, type):
                continue
            if not issubclass(objeto, DatabaseGuardMixin):
                continue
            if objeto in (ResourceCollection, ResourceDetail):
                continue  # las bases definen la regla; la declaran las subclases
            clases = _clases_de_permiso(objeto.permission_classes)
            if not any(issubclass(c, EscribirConPermiso) for c in clases):
                continue
            if getattr(objeto, "lectura_sin_matriz", None) is None:
                sin_declarar.append(nombre)

        self.assertEqual(sin_declarar, [], "vistas con lectura sin declarar")

    def test_las_rutas_fuera_de_la_matriz_quedan_listadas(self):
        """Ninguna ruta se queda fuera de la matriz sin justificación escrita.

        La lista es la documentación de las lecturas públicas y de los puertas
        por rol. Si alguien añade una vista nueva y no la gobierna la matriz,
        tiene que aparecer aquí con su razón o la prueba se cae.
        """
        import api.views as module

        fuera_de_la_matriz = {
            # La administración de la matriz la gobierna el rol Superadmin: no
            # tiene sentido autorizar con la propia matriz la creación de la matriz.
            "RecursoCollection": "administración de la matriz (IsSuperAdmin)",
            "RecursoDetail": "administración de la matriz (IsSuperAdmin)",
            "AccionCollection": "administración de la matriz (IsSuperAdmin)",
            "AccionDetail": "administración de la matriz (IsSuperAdmin)",
            "RecursoAccionCollection": "administración de la matriz (IsSuperAdmin)",
            "RecursoAccionDetail": "administración de la matriz (IsSuperAdmin)",
            "RolRecursoCollection": "administración de la matriz (IsSuperAdmin)",
            "RolRecursoDetail": "administración de la matriz (IsSuperAdmin)",
            "RecursoConPermisosCollection": "matriz de un rol, solo Superadmin",
            "RolePermisosBulkUpdateView": "reasignar concesiones, solo Superadmin",
            # Datos propios del usuario autenticado.
            "PermisosUsuarioView": "el usuario lee sus propios permisos",
            # Vidriera: lectura de catálogo por relación, sin sesión.
            "Model3DByAccessory": "visor 3D público del accesorio",
            "CompatibilityByModelo": "configurador público: compatibilidad por modelo",
            "CompatibilityByAccesorio": "configurador público: compatibilidad por accesorio",
        }

        encontradas = {}
        for nombre in dir(module):
            objeto = getattr(module, nombre)
            if not isinstance(objeto, type):
                continue
            if not issubclass(objeto, DatabaseGuardMixin):
                continue
            if objeto in (DatabaseGuardMixin, ResourceCollection, ResourceDetail):
                continue
            if getattr(objeto, "permiso_recurso", None):
                continue
            encontradas[nombre] = objeto

        self.assertEqual(sorted(encontradas), sorted(fuera_de_la_matriz),
                         "vistas sin recurso RBAC y sin justificación documentada")

    def test_toda_vista_gobernada_por_la_matriz_declara_su_recurso(self):
        """Denegar por defecto también es un contrato estructural del código.

        Cualquier vista —genérica o escrita a mano— que incluya `HasPermiso` o
        `EscribirConPermiso` en sus permisos (incluso compuesta con `&`) tiene
        que decir sobre qué recurso decide. Sin esa declaración la ruta se
        autodeniega en producción y el fallo es silencioso.
        """
        import api.views as module

        sin_declarar, invalidos = [], []
        for nombre in dir(module):
            objeto = getattr(module, nombre)
            if not isinstance(objeto, type):
                continue
            if not issubclass(objeto, DatabaseGuardMixin):
                continue
            if objeto in (DatabaseGuardMixin, ResourceCollection, ResourceDetail):
                continue
            clases = _clases_de_permiso(objeto.permission_classes)
            if not any(issubclass(c, (HasPermiso, EscribirConPermiso)) for c in clases):
                continue
            recurso = getattr(objeto, "permiso_recurso", None)
            if not recurso:
                sin_declarar.append(nombre)
            elif recurso not in CODIGOS_RECURSO_SEMBRADOS:
                invalidos.append("%s=%s" % (nombre, recurso))

        self.assertEqual(sin_declarar, [], "vistas con la matriz sin permiso_recurso")
        self.assertEqual(invalidos, [], "permiso_recurso fuera de los códigos sembrados")


class SelectRelatedEnColeccionesTests(SimpleTestCase):
    """Una colección que anida el serializer de una relación debe traerla con `select_related`.

    Sin el join, Django consulta la relación fila por fila y contra una base
    remota cada fila es un viaje de red: las 90 combinaciones recurso-acción del
    catálogo RBAC tardaban 15 segundos en responder. La regla se comprueba sin
    base de datos, leyendo el `select_related` de la consulta que arma cada vista.
    """

    def relaciones_anidadas(self, serializer_class):
        """Relaciones de uno que el serializer pinta en modo lectura.

        Las listas anidadas vienen envueltas en `ListSerializer`, no son
        `ModelSerializer`, así que quedan fuera: esas se arreglan con
        `prefetch_related`, que es otra consulta y no un viaje por fila.
        """
        anidadas = []
        for campo in serializer_class().fields.values():
            if not isinstance(campo, serializers.ModelSerializer) or not campo.read_only:
                continue
            if campo.source == "*":
                continue
            anidadas.append(campo.source or campo.field_name)
        return anidadas

    def test_cada_relacion_anidada_llega_con_select_related(self):
        import api.views as module

        ofensivas = []
        for nombre in dir(module):
            vista_clase = getattr(module, nombre)
            if not isinstance(vista_clase, type):
                continue
            if not issubclass(vista_clase, ResourceCollection) or vista_clase is ResourceCollection:
                continue
            if not getattr(vista_clase, "serializer_class", None):
                continue
            anidadas = self.relaciones_anidadas(vista_clase.serializer_class)
            if not anidadas:
                continue

            vista = vista_clase()
            vista.request = SimpleNamespace(
                user=usuario(tienda=TIENDA, roles=[ROLE_SUPERADMIN]), query_params={}
            )
            rutas = getattr(vista.get_queryset().query, "select_related", None) or ()
            if isinstance(rutas, dict):
                rutas = tuple(rutas)
            raices = {str(ruta).split("__")[0] for ruta in rutas}

            faltan = sorted(set(anidadas) - raices)
            if faltan:
                ofensivas.append("%s sin %s" % (nombre, ", ".join(faltan)))

        self.assertEqual(ofensivas, [], "colecciones que anidan relaciones sin select_related")


class EscribirConPermisoTests(SimpleTestCase):
    """El catálogo es público pero las mutaciones no.

    Antes ambas reglas vivían en un `get_permissions()` fijo en la base, que
    silenciaba el `permission_classes` de las subclases: el catálogo RBAC se
    leía sin autenticar aunque declarara `IsSuperAdmin`.
    """

    def setUp(self):
        self.solicitud = SimpleNamespace(method="GET", user=usuario(roles=[ROLE_CUSTOMER]))

    def test_lectura_abierta_cuando_la_vista_la_declara(self):
        with mock.patch("api.security.usuario_tiene_permiso", return_value=False):
            self.assertTrue(EscribirConPermiso().has_permission(
                self.solicitud, SimpleNamespace(lectura_sin_matriz=True)))

    def test_lectura_sin_declarar_pasa_por_la_matriz(self):
        """Negar por defecto también arranca al lector anónimo.

        Una vista nueva que olvide declarar `lectura_sin_matriz` no abre el
        catálogo: termina pidiendo `<recurso>:listar` y se cae sola.
        """
        self.solicitud.method = "GET"
        vista = SimpleNamespace(permiso_recurso="roles", lectura_sin_matriz=False)
        with mock.patch("api.security.usuario_tiene_permiso", return_value=False):
            self.assertFalse(EscribirConPermiso().has_permission(self.solicitud, vista))

    def test_escritura_deniega_a_quien_no_tiene_el_permiso(self):
        self.solicitud.method = "POST"
        with mock.patch("api.security.usuario_tiene_permiso", return_value=False):
            self.assertFalse(EscribirConPermiso().has_permission(
                self.solicitud, SimpleNamespace(permiso_recurso="productos")))

    def test_la_subclase_puede_reemplazar_la_regla(self):
        class SoloSuperadmin(ResourceCollection):
            permission_classes = [IsSuperAdmin]
            permiso_recurso = "roles"

        aplicado = SoloSuperadmin().get_permissions()
        self.assertEqual([type(permiso) for permiso in aplicado], [IsSuperAdmin])


class AccionesPorMetodoTests(SimpleTestCase):
    def test_mapeo_de_metodo_a_accion(self):
        self.assertEqual(get_accion_from_method("GET"), "listar")
        self.assertEqual(get_accion_from_method("POST"), "crear")
        self.assertEqual(get_accion_from_method("PATCH"), "actualizar")
        self.assertEqual(get_accion_from_method("DELETE"), "eliminar")

    def test_detalle_y_coleccion_son_acciones_distintas(self):
        """`leer` es la ficha, `listar` la colección: conceder una no concede la otra."""
        self.assertEqual(get_accion_from_method("GET", detalle=True), "leer")
        self.assertEqual(get_accion_from_method("HEAD", detalle=True), "leer")
        self.assertEqual(get_accion_from_method("GET", detalle=False), "listar")

    def test_metodo_fuera_de_la_matriz_no_hereda_una_accion(self):
        """Antes cualquier verbo desconocido caía en `leer` y se autorizaba."""
        self.assertIsNone(get_accion_from_method("TRACE"))
        self.assertIsNone(get_accion_from_method("OPTIONS"))


class PermisoSobreElObjetoTests(SimpleTestCase):
    """El permiso se revalida contra la fila apuntada por el `pk`.

    `has_permission` solo conoce a quien firma, así que un `PUT /api/inventario
    /<pk-de-otra-tienda>` pasaba con el scope `global` que la semilla da al rol
    Admin de tienda. Aquí decide la tienda y el dueño del objeto.
    """

    class Vista(ResourceDetail):
        permiso_recurso = "inventario"
        permiso_detalle = True

    def solicitud(self, method, user):
        return SimpleNamespace(method=method, user=user)

    def test_deniega_la_fila_de_otra_tienda_aun_con_concesion_global(self):
        doble = DobleConsulta(concedido=True)
        with mock.patch("api.models.RolRecurso.objects", doble):
            self.assertFalse(HasPermiso().has_object_permission(
                self.solicitud("PUT", usuario(tienda=TIENDA)), self.Vista(),
                SimpleNamespace(id_tienda=OTRA_TIENDA)))
        self.assertIsNone(doble.filtros)

    def test_autoriza_la_fila_propia_con_los_scopes_del_destino(self):
        doble = DobleConsulta(concedido=True)
        with mock.patch("api.models.RolRecurso.objects", doble):
            self.assertTrue(HasPermiso().has_object_permission(
                self.solicitud("PUT", usuario(tienda=TIENDA)), self.Vista(),
                SimpleNamespace(id_tienda=TIENDA)))
        # La consulta pide los tres alcances y el cruce con lo que alcanza a la
        # fila se hace en Python: es lo que permite reutilizar la misma lectura
        # para filtrar las filas.
        self.assertEqual(tuple(doble.filtros["scope__in"]), SCOPES)

    def test_deniega_el_objeto_sin_recurso_declorado(self):
        class SinRecurso(ResourceDetail):
            pass

        with self.assertLogs("api.security", level="WARNING"):
            self.assertFalse(HasPermiso().has_object_permission(
                self.solicitud("PUT", usuario(tienda=TIENDA)), SinRecurso(),
                SimpleNamespace(id_tienda=TIENDA)))

    def test_lectura_del_detalle_sigue_abierta(self):
        """`EscribirConPermiso` abre la lectura también a nivel de objeto.

        El catálogo no tiene dimensión de tienda, así que una fila de otra tienda
        no es dato ajeno: la vidriera la muestra igual.
        """
        self.assertTrue(EscribirConPermiso().has_object_permission(
            self.solicitud("GET", usuario(roles=[ROLE_CUSTOMER])),
            SimpleNamespace(lectura_sin_matriz=True),
            SimpleNamespace(id_tienda=OTRA_TIENDA)))

    def test_la_lectura_sin_declarar_revalida_la_fila_con_la_matriz(self):
        """Sin `lectura_sin_matriz`, el detalle lee por matriz, no por defecto."""
        doble = DobleConsulta(concedido=False)
        with mock.patch("api.models.RolRecurso.objects", doble):
            self.assertFalse(EscribirConPermiso().has_object_permission(
                self.solicitud("GET", usuario(tienda=TIENDA)), self.Vista(),
                SimpleNamespace(id_tienda=TIENDA)))
        self.assertEqual(tuple(doble.filtros["scope__in"]), SCOPES)

    def test_resuelve_la_tienda_sin_cargar_la_relacion(self):
        class ConFK:
            tienda_id = TIENDA

            @property
            def tienda(self):
                raise AssertionError("forzó la carga de la FK")

        self.assertEqual(tienda_del_objeto(ConFK()), TIENDA)

    def test_resuelve_al_dueño_de_la_fila(self):
        self.assertEqual(propietario_del_objeto(SimpleNamespace(id_usuario=USUARIO)), USUARIO)
        self.assertIsNone(propietario_del_objeto(SimpleNamespace()))

    def test_la_ruta_de_detalle_revalida_la_fila(self):
        """Garantía estructural: `ResourceDetail.get_object` llama el chequeo.

        Sin esa llamada la matriz solo se consulta contra quien firma y el `pk`
        del path queda sin revisar.
        """
        fila = SimpleNamespace(id_tienda=TIENDA)

        class ConsultaFalsa:
            def select_related(self, *campos):
                return self

            def get(self, pk):
                return fila

        class Vista(ResourceDetail):
            permiso_recurso = "inventario"
            vistas = []

            def check_object_permissions(self, request, obj):
                self.vistas.append(obj)

        vista = Vista()
        vista.request = SimpleNamespace(method="PUT", user=usuario(tienda=TIENDA))
        vista.model = SimpleNamespace(objects=SimpleNamespace(all=lambda: ConsultaFalsa()))
        self.assertIs(vista.get_object("cualquier-pk"), fila)
        self.assertEqual(Vista.vistas, [fila])


class DobleManager:
    """`filter()` encadenado con una única respuesta, sin tocar la base de datos."""

    def __init__(self, *, primera=None, existe=False):
        self.primera = primera
        self.existe = existe

    def filter(self, **kwargs):
        return self

    def first(self):
        return self.primera

    def exists(self):
        return self.existe


class EscaladaDePrivilegiosTests(SimpleTestCase):
    """Nadie llega al rol de sede desde fuera de la sede.

    El bypass de Superadmin es absoluto sobre la matriz, así que el riesgo no es
    que la matriz conceda de más sino que alguien se ponga el rol: por el registro
    público, por `PUT /api/usuarios/<pk>` o apagando la vigencia del rol en la
    tabla `rol`.
    """

    SEDE = "99999999-0000-0000-0000-000000000009"

    def rol(self, pk, *, es_superadmin=False, nombre="Rol"):
        return SimpleNamespace(pk=pk, id_rol=pk, nombre_rol=nombre,
                               es_superadmin=es_superadmin, activo=True)

    def peticion(self, method, datos, user):
        """Lo único que leen `update_user` y `delete`: el body y quién firma."""
        return SimpleNamespace(method=method.upper(), data=dict(datos or {}), user=user)

    def test_admin_de_tienda_no_asigna_el_rol_de_sede(self):
        self.assertFalse(puede_asignar_rol(
            usuario(tienda=TIENDA, roles=[ROLE_ADMIN]), self.rol(ROLE_SUPERADMIN)))

    def test_superadmin_si_puede(self):
        self.assertTrue(puede_asignar_rol(
            usuario(roles=[ROLE_SUPERADMIN]), self.rol(ROLE_SUPERADMIN)))

    def test_un_rol_nuevo_marcado_como_de_sede_tambien_queda_bloqueado(self):
        self.assertTrue(es_rol_de_sede(self.rol(self.SEDE, es_superadmin=True)))
        self.assertFalse(puede_asignar_rol(
            usuario(tienda=TIENDA), self.rol(self.SEDE, es_superadmin=True)))

    def test_los_roles_de_tienda_no_quedan_restringidos(self):
        for codigo in (ROLE_ADMIN, ROLE_SELLER, ROLE_CUSTOMER):
            self.assertTrue(puede_asignar_rol(usuario(tienda=TIENDA), self.rol(codigo)))

    def test_rol_de_sede_desactivado_no_autoriza(self):
        """El bypass solo vale mientras el rol de sede esté vigente en la tabla."""
        doble = DobleConsulta(concedido=False)
        cuenta = usuario(roles=[ROLE_SUPERADMIN], superadmin_vigente=False)
        with mock.patch("api.models.RolRecurso.objects", doble):
            self.assertFalse(usuario_tiene_permiso(cuenta, "productos", "crear"))
        # Sin bypass la decisión vuelve a la matriz, y ahí el filtro `rol__activo`
        # ya no concede nada.
        self.assertIs(doble.filtros["rol__activo"], True)

    def test_la_vigencia_del_rol_se_consulta_una_sola_vez(self):
        doble = DobleConsulta(concedido=True)
        cuenta = usuario(roles=[ROLE_SUPERADMIN])
        del cuenta.rol_superadmin_vigente
        with mock.patch("api.models.Role.objects", doble):
            self.assertTrue(es_superadmin(cuenta))
            self.assertTrue(es_superadmin(cuenta))
        self.assertEqual(doble.consultas, 1)

    def test_put_usuario_deniega_el_ascenso_a_sede(self):
        objetivo = SimpleNamespace(id_usuario="destino", usu_nombre="Vendedor",
                                   estado_usuario="activo", role_ids=[ROLE_SELLER])
        peticion = self.peticion("put", {"id_rol": ROLE_SUPERADMIN},
                                 usuario(tienda=TIENDA, roles=[ROLE_ADMIN]))
        with mock.patch.object(UserDetail, "get_target", return_value=objetivo), \
                mock.patch("api.views.Role.objects",
                           DobleManager(primera=self.rol(ROLE_SUPERADMIN,
                                                         nombre="Superadmin"))):
            respuesta = UserDetail().update_user(peticion, "destino")
        self.assertEqual(respuesta.status_code, 403)

    def test_put_usuario_deniega_editarse_el_propio_estado(self):
        """Bloquearse a uno mismo apaga la plataforma sin ruido: se otra cuenta."""
        yo = usuario(tienda=TIENDA, roles=[ROLE_ADMIN])
        objetivo = SimpleNamespace(id_usuario=yo.id_usuario, usu_nombre="Admin",
                                   estado_usuario="activo", role_ids=[ROLE_ADMIN])
        peticion = self.peticion("put", {"estado_usuario": "bloqueado"}, yo)
        with mock.patch.object(UserDetail, "get_target", return_value=objetivo):
            respuesta = UserDetail().update_user(peticion, str(yo.id_usuario))
        self.assertEqual(respuesta.status_code, 403)

    def test_put_usuario_deniega_bloquear_una_cuenta_de_sede(self):
        sede = SimpleNamespace(id_usuario="sede", usu_nombre="Superadmin",
                               estado_usuario="activo", role_ids=[ROLE_SUPERADMIN])
        peticion = self.peticion("put", {"estado_usuario": "bloqueado"},
                                 usuario(tienda=TIENDA, roles=[ROLE_ADMIN]))
        with mock.patch.object(UserDetail, "get_target", return_value=sede):
            respuesta = UserDetail().update_user(peticion, "sede")
        self.assertEqual(respuesta.status_code, 403)

    def test_delete_deniega_bloquear_una_cuenta_de_sede(self):
        sede = SimpleNamespace(id_usuario="sede", usu_nombre="Superadmin",
                               estado_usuario="activo", role_ids=[ROLE_SUPERADMIN])
        peticion = self.peticion("delete", None,
                                 usuario(tienda=TIENDA, roles=[ROLE_ADMIN]))
        with mock.patch.object(UserDetail, "get_target", return_value=sede):
            respuesta = UserDetail().delete(peticion, "sede")
        self.assertEqual(respuesta.status_code, 403)

    def test_el_guard_no_toca_lo_que_no_es_privilegio(self):
        """Cambiar el nombre de un compañero de tienda no pasa por esta traba."""
        peticion = SimpleNamespace(user=usuario(tienda=TIENDA, roles=[ROLE_ADMIN]))
        objetivo = SimpleNamespace(id_usuario="otro", role_ids=[ROLE_SELLER])
        self.assertIsNone(denegar_edicion_de_cuenta(
            peticion, objetivo, toca_privilegios=False))

    def test_registro_no_permite_el_rol_de_sede(self):
        """El `id_rol` del body no asciende: ni desde el registro público ni del panel."""
        from rest_framework.test import APIRequestFactory, force_authenticate

        datos = {"usu_nombre": "Intruso", "usu_email": "intruso@test.dev",
                 "password": "1234567890ab", "id_rol": ROLE_SUPERADMIN}
        # `@api_view` pone su propio envoltorio: aquí va la petición cruda.
        peticion = APIRequestFactory().post("/api/auth/register", datos, format="json")
        force_authenticate(peticion, user=usuario(tienda=TIENDA, roles=[ROLE_ADMIN]))
        with mock.patch("api.views.database_unavailable", return_value=None), \
                mock.patch("api.views.User.objects", DobleManager(existe=False)), \
                mock.patch("api.views.Role.objects",
                           DobleManager(primera=self.rol(ROLE_SUPERADMIN,
                                                         nombre="Superadmin"))):
            respuesta = register(peticion)
        self.assertEqual(respuesta.status_code, 403)
        self.assertIn("asignar el rol", respuesta.data["error"])


class RolRecursoSerializerTests(SimpleTestCase):
    """`GET /api/rol-recursos` reventaba con AttributeError: `Meta.fields`
    listaba `rol_recurso`, que no es campo del modelo ni atributo declarado."""

    def test_resuelve_todos_los_campos(self):
        campos = RolRecursoSerializer().fields
        self.assertNotIn("rol_recurso", campos)
        self.assertIn("recurso_accion", campos)
        self.assertIn("scope", campos)


def operaciones_de_la_matriz():
    """[(nombre_vista, método, recurso, acción)] de todo lo que `views.py` declara.

    La lista se deriva del código, no de una tabla escrita a mano: una ruta nueva
    que declare `permiso_recurso` entra sola en las pruebas de permitir y denegar,
    y una que se quede sin declarar aparece como hueco en la cobertura.
    """
    import api.views as module

    filas = []
    for nombre in sorted(dir(module)):
        vista = getattr(module, nombre)
        if not isinstance(vista, type) or not issubclass(vista, DatabaseGuardMixin):
            continue
        if vista is DatabaseGuardMixin or not getattr(vista, "permiso_recurso", None):
            continue
        for metodo in ("GET", "POST", "PUT", "PATCH", "DELETE"):
            if not hasattr(vista, metodo.lower()):
                continue
            accion = getattr(vista, "permiso_accion", None) or get_accion_from_method(
                metodo, detalle=getattr(vista, "permiso_detalle", False)
            )
            if accion:
                filas.append((nombre, vista, metodo, vista.permiso_recurso, accion))
    return filas


class MatrizPermitirDenegarTests(SimpleTestCase):
    """Fase 6 del plan, caso 7: cada método y subruta con una prueba de permitir y
    otra de denegar. Se hace sobre la capa de permiso, no sobre HTTP: la denegación
    llega antes que el guard de base, y el caso de permitir tendría que consultar
    filas para decir nada.
    """

    def setUp(self):
        self.operaciones = operaciones_de_la_matriz()

    def _peticion(self, metodo, user):
        return SimpleNamespace(method=metodo, user=user)

    def test_la_matriz_declara_operaciones(self):
        self.assertGreaterEqual(len(self.operaciones), 60)

    def test_sin_concesion_se_deniega_cada_operacion(self):
        deny = []
        for nombre, vista, metodo, recurso, accion in self.operaciones:
            with mock.patch("api.models.RolRecurso.objects", DobleConsulta(concedido=[])):
                if HasPermiso().has_permission(
                        self._peticion(metodo, usuario(tienda=TIENDA)), vista()):
                    deny.append(f"{nombre} {metodo} ({recurso}:{accion})")
        self.assertEqual(deny, [], "operaciones que pasan sin concesión en la matriz")

    def test_con_la_concesion_se_permite_cada_operacion(self):
        allow = []
        for nombre, vista, metodo, recurso, accion in self.operaciones:
            with mock.patch("api.models.RolRecurso.objects",
                            DobleConsulta(concedido=["global"])):
                if not HasPermiso().has_permission(
                        self._peticion(metodo, usuario(tienda=TIENDA)), vista()):
                    allow.append(f"{nombre} {metodo} ({recurso}:{accion})")
        self.assertEqual(allow, [], "operaciones negadas teniendo la concesión")

    def test_la_fila_de_otra_tienda_se_deniega_aun_con_concesion(self):
        """El permiso sobre el recurso no abre la fila vecina (caso 5 del plan)."""
        fila_ajena = SimpleNamespace(id_tienda=OTRA_TIENDA, id_usuario="otro-usuario")
        for nombre, vista, metodo, recurso, accion in self.operaciones:
            if recurso not in RECURSOS_CON_TIENDA:
                continue
            with mock.patch("api.models.RolRecurso.objects",
                            DobleConsulta(concedido=["global", "tienda"])):
                self.assertFalse(
                    HasPermiso().has_object_permission(
                        self._peticion(metodo, usuario(tienda=TIENDA)), vista(), fila_ajena),
                    f"{nombre} {metodo} autoriza la fila de otra tienda",
                )

    def test_la_fila_propia_se_permite_con_concesion(self):
        fila_propia = SimpleNamespace(id_tienda=TIENDA, id_usuario=USUARIO)
        for nombre, vista, metodo, recurso, accion in self.operaciones:
            with mock.patch("api.models.RolRecurso.objects",
                            DobleConsulta(concedido=["global"])):
                self.assertTrue(
                    HasPermiso().has_object_permission(
                        self._peticion(metodo, usuario(tienda=TIENDA)), vista(), fila_propia),
                    f"{nombre} {metodo} niega la fila de su propia tienda",
                )

    def test_el_anonimo_no_autoriza_ninguna_operacion_de_la_matriz(self):
        anonimo = SimpleNamespace(is_authenticated=False, is_anonymous=True,
                                  role_ids=[], pk=None, id_tienda=None, id_usuario=None)
        for nombre, vista, metodo, recurso, accion in self.operaciones:
            self.assertFalse(
                HasPermiso().has_permission(self._peticion(metodo, anonimo), vista()),
                f"{nombre} {metodo} abre sin sesión",
            )

    def test_la_cuenta_bloqueada_no_autoriza_ninguna_operacion(self):
        bloqueado = usuario(tienda=TIENDA)
        bloqueado.estado_usuario = "bloqueado"
        for nombre, vista, metodo, recurso, accion in self.operaciones:
            with mock.patch("api.models.RolRecurso.objects",
                            DobleConsulta(concedido=["global"])):
                self.assertFalse(
                    HasPermiso().has_permission(self._peticion(metodo, bloqueado), vista()),
                    f"{nombre} {metodo} autoriza a una cuenta bloqueada",
                )

    def test_la_lectura_publica_declara_y_la_demas_quedan_cerradas(self):
        """Caso 8 del plan: las vidrieras abiertas son las listadas, ninguna más.

        La lista es la documentación; si una ruta nueva se marca de lectura sin
        matriz, esta prueba la nombra para que la decisión se tome en revisión.
        """
        publicas = {
            "AccesorioDetail", "AccesoriosCollection", "AccessoryTypeCollection",
            "AccessoryTypeDetail", "BrandCollection", "BrandDetail",
            "CategoryCollection", "CategoryDetail", "CompatibilityCollection",
            "CompatibilityDetail", "Model3DCollection", "Model3DDetail",
            "ModelCollection", "ModelDetail", "MotorcycleCollection",
            "MotorcycleDetail", "ProductCategoryCollection", "ProductCategoryDetail",
            "ProductCollection", "ProductDetail", "StoreCollection", "StoreDetail",
        }
        declaradas = set()
        for nombre, vista, _metodo, _recurso, _accion in self.operaciones:
            if getattr(vista, "lectura_sin_matriz", False):
                declaradas.add(nombre)
        self.assertEqual(declaradas, publicas,
                         "rutas con lectura sin matriz fuera de la lista documentada")

    def test_toda_operacion_de_escritura_pasa_por_la_matriz(self):
        """`lectura_sin_matriz=True` no abre el `POST/PUT/DELETE` de esa misma ruta."""
        for nombre, vista, metodo, recurso, accion in self.operaciones:
            if metodo == "GET":
                continue
            with mock.patch("api.models.RolRecurso.objects", DobleConsulta(concedido=[])):
                self.assertFalse(
                    EscribirConPermiso().has_permission(
                        self._peticion(metodo, usuario(tienda=TIENDA)), vista()),
                    f"{nombre} {metodo} escribe sin concesión",
                )


def combinacion(codigo_recurso, requiere_scope=True):
    """Fila de `recurso_accion` sin base de datos, para la validación de scopes."""
    return SimpleNamespace(
        recurso=SimpleNamespace(codigo=codigo_recurso),
        requiere_scope=requiere_scope,
    )


class NormalizacionDeConcesionesTests(SimpleTestCase):
    """El plan (regla 5 y fase 3) es explícita: un scope que el recurso no puede
    expresar se **rechaza**, nunca se convierte en acceso global. Y el rechazo
    tiene que pasar antes del reemplazo, que es destructivo."""

    def test_el_scope_llega_normalizado(self):
        self.assertEqual(normalizar_scope(" Tienda "), "tienda")
        self.assertEqual(normalizar_scope("GLOBAL"), "global")
        self.assertEqual(normalizar_scope(None), "global")
        self.assertEqual(normalizar_scope(""), "global")

    def test_un_recurso_sin_columna_de_tienda_no_admite_tienda(self):
        """`producto`, `categoria_producto` y `tipo_accesorio` no tienen tienda."""
        self.assertEqual(scopes_validos("productos"), ("global",))
        self.assertEqual(scopes_validos("categorias"), ("global",))
        self.assertEqual(scopes_validos("movimientos"), ("global",))

    def test_un_recurso_sin_columna_de_duenio_no_admite_propio(self):
        self.assertEqual(scopes_validos("inventario"), ("global", "tienda"))
        self.assertNotIn("propio", scopes_validos("usuarios"))

    def test_cotizaciones_acepta_los_tres(self):
        self.assertEqual(scopes_validos("cotizaciones"), ("global", "tienda", "propio"))

    def test_requiere_scope_falso_deja_de_ser_acotable(self):
        self.assertEqual(scopes_validos("cotizaciones", requiere_scope=False), ("global",))

    def test_el_scope_desconocido_se_rechaza(self):
        normalizado, motivo = validar_concesion("cotizaciones", "todos")
        self.assertIsNone(normalizado)
        self.assertIn("no existe en la matriz", motivo)

    def test_no_se_reescribe_a_global(self):
        """El motivo va acompañado de `None`: reescribir sería dar más acceso."""
        normalizado, motivo = validar_concesion("productos", "tienda")
        self.assertIsNone(normalizado)
        self.assertIn("no tiene dimensión de 'tienda'", motivo)

    def test_la_concesion_valida_devuelve_el_scope_normalizado(self):
        self.assertEqual(validar_concesion("cotizaciones", " Propio "), ("propio", None))

    def test_autorizar_y_ofrecer_usan_el_mismo_criterio(self):
        """Lo que la matriz ofrece en el panel tiene que ser lo que autoriza al
        filtrar filas; si no, la casilla engaña."""
        for codigo in CODIGOS_RECURSO_SEMBRADOS:
            for alcance in scopes_validos(codigo):
                self.assertEqual(validar_concesion(codigo, alcance), (alcance, None))
                self.assertIn(alcance, scopes_aplicables(
                    usuario(tienda=TIENDA), codigo, TIENDA))


class ReemplazoDeConcesionesTests(SimpleTestCase):
    """`normalizar_concesiones` es lo que la vista y el admin llaman antes de borrar."""

    def setUp(self):
        self.combinaciones = {
            "aaaa": ("cotizaciones", True),
            "bbbb": ("productos", True),
            "cccc": ("inventario", True),
            "dddd": ("modelos3d", False),
        }

    def reemplazar(self, *pares):
        return normalizar_concesiones(list(pares), self.combinaciones)

    def test_normaliza_y_conserva_la_concesion(self):
        entradas, errores = self.reemplazar(("AAAA ", " Tienda "), ("bbbb", "global"))
        self.assertEqual(errores, [])
        self.assertEqual(entradas, [
            {"id_recurso_accion": "aaaa", "scope": "tienda"},
            {"id_recurso_accion": "bbbb", "scope": "global"},
        ])

    def test_rechaza_la_combinacion_inexistente(self):
        entradas, errores = self.reemplazar(("ee" * 5, "global"))
        self.assertEqual(entradas, [])
        self.assertIn("no existe", errores[0])

    def test_rechaza_la_incompatibilidad_del_recurso(self):
        """La siembra antigua daba `tienda` al catálogo; ya no se puede guardar."""
        entradas, errores = self.reemplazar(("bbbb", "tienda"))
        self.assertEqual(entradas, [])
        self.assertIn("no tiene dimensión de 'tienda'", errores[0])

    def test_rechaza_un_segundo_scope_sobre_la_mesma_combinacion(self):
        """Dos filas para el mismo par serían dos decisiones y el panel solo
        muestra una (`concedidos` es un dict). Con errores en la lista, quien
        llama aborta el reemplazo: no se escribe nada."""
        entradas, errores = self.reemplazar(("aaaa", "global"), ("aaaa", "propio"))
        self.assertIn("un solo scope", errores[0])
        self.assertNotIn({"id_recurso_accion": "aaaa", "scope": "propio"}, entradas)

    def test_repite_el_mismo_scope_y_no_duplica_la_fila(self):
        entradas, errores = self.reemplazar(("aaaa", "tienda"), ("aaaa", " Tienda "))
        self.assertEqual(errores, [])
        self.assertEqual(len(entradas), 1)

    def test_rechaza_requiere_scope_falso_acotado(self):
        entradas, errores = self.reemplazar(("dddd", "tienda"))
        self.assertEqual(entradas, [])
        self.assertIn("requiere_scope=False", errores[0])

    def test_rechaza_la_entrada_sin_identificador(self):
        for valor in (None, ""):
            entradas, errores = self.reemplazar((valor, "global"))
            self.assertEqual(entradas, [])
            self.assertIn("mal formado", errores[0])

    def test_la_lista_vacia_es_valida(self):
        """Revocar todo sigue siendo una operación legítima."""
        self.assertEqual(self.reemplazar(), ([], []))

    def test_acumula_todos_los_motivos(self):
        _, errores = self.reemplazar(("bbbb", "tienda"), ("cccc", "propio"),
                                     ("ee", "global"))
        self.assertEqual(len(errores), 3)


class ElReemplazoValidaAntesDeBorrarTests(SimpleTestCase):
    """La vista y el serializador no pueden dejar el rol a medias (fase 6, caso 9)."""

    def test_la_vista_valida_antes_de_borrar(self):
        import inspect

        from .views import RolePermisosBulkUpdateView

        fuente = inspect.getsource(RolePermisosBulkUpdateView.put)
        self.assertIn("normalizar_concesiones", fuente)
        self.assertLess(fuente.index("normalizar_concesiones"), fuente.index(".delete()"))
        self.assertIn("if errores:", fuente)

    def test_el_reemplazo_es_transaccional(self):
        import inspect

        from .views import RolePermisosBulkUpdateView

        fuente = inspect.getsource(RolePermisosBulkUpdateView.put)
        self.assertIn("transaction.atomic()", fuente)

    def test_el_serializador_rechaza_lo_que_el_recurso_no_expresa(self):
        serializer = RolRecursoSerializer()
        with self.assertRaises(serializers.ValidationError) as error:
            serializer.validate({
                "recurso_accion": combinacion("productos"),
                "scope": "tienda",
            })
        self.assertIn("scope", error.exception.detail)

    def test_el_serializador_devuelve_el_scope_normalizado(self):
        attrs = RolRecursoSerializer().validate({
            "recurso_accion": combinacion("cotizaciones"),
            "scope": " PROPIO ",
        })
        self.assertEqual(attrs["scope"], "propio")

    def test_el_serializador_exige_la_combinacion(self):
        serializer = RolRecursoSerializer()
        serializer.instance = None
        with self.assertRaises(serializers.ValidationError):
            serializer.validate({"scope": "global"})

    def test_la_matriz_expone_los_alcances_de_cada_combinacion(self):
        """El panel no puede ofrecer una casilla que el backend va a rechazar."""
        from .serializers import RecursoConPermisosSerializer

        recurso = SimpleNamespace(id_recurso="r1", codigo="productos")
        fila = SimpleNamespace(
            id_recurso_accion="f1",
            accion=SimpleNamespace(codigo="leer", nombre="Leer"),
            requiere_scope=True,
        )
        doble = RecursoConPermisosSerializer(context={
            "rol_id": "rol-1",
            "combos_por_recurso": {"r1": [fila]},
            "concedidos": {},
        })
        acciones = doble.get_acciones(recurso)
        self.assertEqual(acciones[0]["scopes_validos"], ["global"])
        self.assertEqual(acciones[0]["requiere_scope"], True)
