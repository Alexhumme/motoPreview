"""Pruebas de endpoints, autenticación, permisos y paginación.

No necesitan base de datos: los casos que consultarían la BD se detienen en la
capa de autenticación/permisos, o devuelven 503 con la BD no configurada
(mediante ``override_settings(DATABASE_URL="")``), de modo que las pruebas
funcionan igual en local y en CI.

Ejecutar:  python manage.py test api
"""
from datetime import timedelta
from types import SimpleNamespace
from unittest import mock

import jwt
from django.conf import settings
from django.test import SimpleTestCase, override_settings
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.test import APIClient

from .security import (
    ROLE_ADMIN,
    ROLE_CUSTOMER,
    ROLE_SELLER,
    IsStoreAdmin,
    IsStoreStaff,
    has_any_role,
)
from .views import BrandCollection, paginate_response

UUID_MUESTRA = "22222222-0000-0000-0000-000000000001"
SECRETO_PRUEBA = "clave-de-prueba-de-32-bytes-para-automatizacion"


def usuario_falso(role_ids, *, tienda=None):
    """Usuario de prueba sin BD, compatible con los permisos de DRF."""
    return SimpleNamespace(
        is_authenticated=True,
        is_anonymous=False,
        pk=UUID_MUESTRA,
        id_usuario=UUID_MUESTRA,
        id_rol=role_ids[0] if role_ids else None,
        id_tienda=tienda,
        role_ids=list(role_ids),
        estado_usuario="activo",
        usu_nombre="Usuario de prueba",
    )


ANONIMO = SimpleNamespace(is_authenticated=False, is_anonymous=True, role_ids=[], pk=None)
ADMIN = usuario_falso([ROLE_ADMIN], tienda=UUID_MUESTRA)
VENDEDOR = usuario_falso([ROLE_SELLER], tienda=UUID_MUESTRA)
CLIENTE = usuario_falso([ROLE_CUSTOMER])


class ConsultaFalsa(list):
    """Sustituto de un QuerySet para probar la paginación sin BD."""

    def count(self):
        return len(self)


class SolicitudFalsa:
    def __init__(self, query_params=None):
        self.query_params = query_params or {}


class LineaSerializer(serializers.Serializer):
    nombre = serializers.CharField()


FILAS = ConsultaFalsa(
    [{"nombre": "item-%02d" % indice} for indice in range(25)]
)
MARCAS = ConsultaFalsa(
    [{"nombre": "Marca %02d" % indice} for indice in range(25)]
)


# ---------------------------------------------------------------------------
# Permisos de los catálogos: lectura pública, escritura solo administrador
# ---------------------------------------------------------------------------
@override_settings(DATABASE_URL="")
class PermisosCatalogoTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def test_lectura_anonima_permitida(self):
        # El permiso deja pasar a los anónimos y la vista llega a la BD (503 aquí).
        response = self.client.get("/api/marcas")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_anonimo_no_puede_crear(self):
        response = self.client.post("/api/marcas", {"marca_nombre": "Prueba"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("error", response.json())

    def test_anonimo_no_puede_actualizar(self):
        response = self.client.put(f"/api/marcas/{UUID_MUESTRA}", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonimo_no_puede_eliminar(self):
        response = self.client.delete(f"/api/marcas/{UUID_MUESTRA}")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cliente_no_puede_crear(self):
        self.client.force_authenticate(user=CLIENTE)
        response = self.client.post("/api/marcas", {"marca_nombre": "Prueba"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cliente_no_puede_eliminar(self):
        self.client.force_authenticate(user=CLIENTE)
        response = self.client.delete(f"/api/marcas/{UUID_MUESTRA}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendedor_no_puede_crear(self):
        self.client.force_authenticate(user=VENDEDOR)
        response = self.client.post("/api/marcas", {"marca_nombre": "Prueba"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_administrador_supera_el_permiso(self):
        self.client.force_authenticate(user=ADMIN)
        response = self.client.post("/api/marcas", {"marca_nombre": "Prueba"}, format="json")
        # Supera el permiso y llega a la vista (que responde 503 sin BD).
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_administrador_supera_el_permiso_en_detalle(self):
        self.client.force_authenticate(user=ADMIN)
        response = self.client.put(f"/api/marcas/{UUID_MUESTRA}", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_compatibilidad_restringida_al_administrador(self):
        anonimo = self.client.post(
            "/api/compatibilidad",
            {"id_accesorio": UUID_MUESTRA, "id_modelo_moto": UUID_MUESTRA},
            format="json",
        )
        self.assertEqual(anonimo.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=CLIENTE)
        cliente = self.client.post(
            "/api/compatibilidad",
            {"id_accesorio": UUID_MUESTRA, "id_modelo_moto": UUID_MUESTRA},
            format="json",
        )
        self.assertEqual(cliente.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# Permisos de inventario y cotizaciones (staff de tienda)
# ---------------------------------------------------------------------------
@override_settings(DATABASE_URL="")
class PermisosInventarioTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def test_anonimo_no_puede_ver_inventario(self):
        response = self.client.get("/api/inventario")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonimo_no_puede_registrar_movimiento(self):
        response = self.client.post("/api/inventario/movimiento", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cliente_no_puede_ver_inventario(self):
        self.client.force_authenticate(user=CLIENTE)
        response = self.client.get("/api/inventario")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cliente_no_puede_registrar_movimiento(self):
        self.client.force_authenticate(user=CLIENTE)
        response = self.client.post("/api/inventario/movimiento", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendedor_supera_el_permiso_de_inventario(self):
        self.client.force_authenticate(user=VENDEDOR)
        response = self.client.post("/api/inventario/movimiento", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_cliente_no_puede_cambiar_estado_de_cotizacion(self):
        self.client.force_authenticate(user=CLIENTE)
        response = self.client.put(
            f"/api/cotizaciones/{UUID_MUESTRA}/estado",
            {"coti_estado": "aprobada"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendedor_supera_el_permiso_de_cotizaciones(self):
        self.client.force_authenticate(user=VENDEDOR)
        response = self.client.put(
            f"/api/cotizaciones/{UUID_MUESTRA}/estado",
            {"coti_estado": "aprobada"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_cliente_puede_leer_sus_cotizaciones(self):
        self.client.force_authenticate(user=CLIENTE)
        response = self.client.get("/api/cotizaciones")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


# ---------------------------------------------------------------------------
# Gestión de usuarios (solo administrador de tienda)
# ---------------------------------------------------------------------------
@override_settings(DATABASE_URL="")
class PermisosUsuariosTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def test_anonimo_no_puede_ver_usuarios(self):
        response = self.client.get("/api/usuarios")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_vendedor_no_puede_gestionar_usuarios(self):
        self.client.force_authenticate(user=VENDEDOR)
        response = self.client.get("/api/usuarios")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cliente_no_puede_gestionar_usuarios(self):
        self.client.force_authenticate(user=CLIENTE)
        response = self.client.delete(f"/api/usuarios/{UUID_MUESTRA}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_administrador_supera_el_permiso(self):
        self.client.force_authenticate(user=ADMIN)
        response = self.client.get("/api/usuarios")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


# ---------------------------------------------------------------------------
# Autenticación JWT
# ---------------------------------------------------------------------------
@override_settings(JWT_SECRET=SECRETO_PRUEBA)
class AutenticacionJWTTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def _token(self, payload, clave=SECRETO_PRUEBA):
        return jwt.encode(payload, clave, algorithm="HS256")

    def test_ruta_protegida_sin_token(self):
        response = self.client.get("/api/auth/perfil")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_formato_de_autorizacion_invalido(self):
        response = self.client.get("/api/auth/perfil", HTTP_AUTHORIZATION="solo-token")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("error", response.json())

    def test_esquema_distinto_de_bearer(self):
        token = self._token(
            {"id_usuario": UUID_MUESTRA, "exp": timezone.now() + timedelta(hours=1)}
        )
        response = self.client.get("/api/auth/perfil", HTTP_AUTHORIZATION=f"Basic {token}")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_firma_invalida(self):
        token = self._token(
            {"id_usuario": UUID_MUESTRA, "exp": timezone.now() + timedelta(hours=1)},
            clave="clave-incorrecta-de-32-bytes-para-pruebas",
        )
        response = self.client.get("/api/auth/perfil", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_expirado(self):
        token = self._token(
            {
                "id_usuario": UUID_MUESTRA,
                "iss": settings.JWT_ISSUER,
                "exp": timezone.now() - timedelta(hours=1),
            }
        )
        response = self.client.get("/api/auth/perfil", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("expir", response.json()["error"].lower())

    def test_token_sin_usuario(self):
        token = self._token({"exp": timezone.now() + timedelta(hours=1)})
        response = self.client.get("/api/auth/perfil", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Unidades: clases de permiso
# ---------------------------------------------------------------------------
class PermisosUnitTests(SimpleTestCase):
    def _request(self, user):
        return SimpleNamespace(user=user)

    def test_has_any_role_rechaza_anonimo(self):
        self.assertFalse(has_any_role(ANONIMO, (ROLE_ADMIN,)))

    def test_has_any_role_no_distingue_mayusculas(self):
        self.assertTrue(has_any_role(usuario_falso([ROLE_ADMIN.upper()]), (ROLE_ADMIN,)))

    def test_staff_admite_administrador_y_vendedor(self):
        permiso = IsStoreStaff()
        self.assertTrue(permiso.has_permission(self._request(ADMIN), None))
        self.assertTrue(permiso.has_permission(self._request(VENDEDOR), None))

    def test_staff_rechaza_cliente_y_anonimo(self):
        permiso = IsStoreStaff()
        self.assertFalse(permiso.has_permission(self._request(CLIENTE), None))
        self.assertFalse(permiso.has_permission(self._request(ANONIMO), None))

    def test_admin_solo_admite_administrador(self):
        permiso = IsStoreAdmin()
        self.assertTrue(permiso.has_permission(self._request(ADMIN), None))
        self.assertFalse(permiso.has_permission(self._request(VENDEDOR), None))
        self.assertFalse(permiso.has_permission(self._request(CLIENTE), None))
        self.assertFalse(permiso.has_permission(self._request(ANONIMO), None))


# ---------------------------------------------------------------------------
# Unidades: paginación de servidor
# ---------------------------------------------------------------------------
class PaginacionUnitTests(SimpleTestCase):
    def test_sin_pagina_devuelve_lista_plana(self):
        response = paginate_response(SolicitudFalsa(), FILAS, LineaSerializer)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 25)

    def test_pagina_valida_devuelve_metadatos(self):
        response = paginate_response(
            SolicitudFalsa({"pagina": "2", "por_pagina": "10"}), FILAS, LineaSerializer
        )
        data = response.data
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(data["count"], 25)
        self.assertEqual(data["pagina"], 2)
        self.assertEqual(data["por_pagina"], 10)
        self.assertEqual(data["total_paginas"], 3)
        self.assertEqual(len(data["resultados"]), 10)
        self.assertEqual(data["resultados"][0]["nombre"], "item-10")

    def test_ultima_pagina_parcial(self):
        data = paginate_response(
            SolicitudFalsa({"pagina": "3", "por_pagina": "10"}), FILAS, LineaSerializer
        ).data
        self.assertEqual(len(data["resultados"]), 5)

    def test_pagina_mas_alla_del_final(self):
        data = paginate_response(
            SolicitudFalsa({"pagina": "99", "por_pagina": "10"}), FILAS, LineaSerializer
        ).data
        self.assertEqual(data["count"], 25)
        self.assertEqual(data["resultados"], [])

    def test_por_pagina_por_defecto(self):
        data = paginate_response(SolicitudFalsa({"pagina": "1"}), FILAS, LineaSerializer).data
        self.assertEqual(data["por_pagina"], 20)
        self.assertEqual(len(data["resultados"]), 20)

    def test_paginas_invalidas(self):
        for valor in ("0", "-1", "abc", ""):
            response = paginate_response(
                SolicitudFalsa({"pagina": valor}), FILAS, LineaSerializer
            )
            self.assertEqual(
                response.status_code, status.HTTP_400_BAD_REQUEST, f"pagina={valor!r}"
            )

    def test_por_pagina_invalido(self):
        for valor in ("0", "101", "abc", ""):
            response = paginate_response(
                SolicitudFalsa({"pagina": "1", "por_pagina": valor}), FILAS, LineaSerializer
            )
            self.assertEqual(
                response.status_code, status.HTTP_400_BAD_REQUEST, f"por_pagina={valor!r}"
            )


# ---------------------------------------------------------------------------
# Integración: paginación en un endpoint real (sin BD, con consultas simuladas)
# ---------------------------------------------------------------------------
@override_settings(DATABASE_URL="postgresql://falso/motopreview")
class PaginacionEndpointTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def _get(self, url):
        with mock.patch(
            "api.views.database_unavailable", return_value=None
        ), mock.patch.object(
            BrandCollection, "get_queryset", return_value=ConsultaFalsa(MARCAS)
        ), mock.patch.object(
            BrandCollection, "serializer_class", LineaSerializer
        ):
            return self.client.get(url)

    def test_listado_sin_pagina_sigue_siendo_un_array(self):
        response = self._get("/api/marcas")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.json(), list)
        self.assertEqual(len(response.json()), 25)

    def test_listado_paginado(self):
        response = self._get("/api/marcas?pagina=2&por_pagina=10")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["count"], 25)
        self.assertEqual(data["pagina"], 2)
        self.assertEqual(data["total_paginas"], 3)
        self.assertEqual(len(data["resultados"]), 10)
        self.assertEqual(data["resultados"][0]["nombre"], "Marca 10")

    def test_pagina_invalida_responde_400(self):
        response = self._get("/api/marcas?pagina=no-numero")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.json())

    def test_por_pagina_fuera_de_rango_responde_400(self):
        response = self._get("/api/marcas?pagina=1&por_pagina=5000")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Salud y rutas raíz
# ---------------------------------------------------------------------------
class SaludTests(SimpleTestCase):
    def test_health(self):
        response = APIClient().get("/api/health")
        data = response.json()
        self.assertIn("database_configured", data)
        self.assertIn("database_connected", data)
        self.assertEqual(data["ok"], data["database_connected"])
        # La conexión viva depende del entorno (p. ej. pooler sin CREATE DATABASE
        # en tests). Solo exigimos que el código y el estado sean coherentes.
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK if data["ok"] else status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    def test_raiz(self):
        response = APIClient().get("/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("mensaje", response.json())


@override_settings(DATABASE_URL="")
class EnrutamientoTests(SimpleTestCase):
    def test_login_esta_registrado(self):
        response = APIClient().post("/api/auth/login", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_registro_esta_registrado(self):
        response = APIClient().post("/api/auth/register", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_inventario_esta_registrado(self):
        response = APIClient().get("/api/inventario")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cotizaciones_requiere_sesion(self):
        response = APIClient().get("/api/cotizaciones")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(DATABASE_URL="")
class RateLimitTests(SimpleTestCase):
    """El throttling por alcance protege los endpoints de autenticación (P0)."""

    def test_register_agota_su_cuota_y_responde_429(self):
        cliente = APIClient()
        estados = [
            cliente.post(
                "/api/auth/register",
                {
                    "usu_nombre": "Tester",
                    "usu_email": f"rate-{indice}@test.dev",
                    "password": "12345678",
                    "id_rol": "x",  # sin BD nunca se llega a validar el rol
                },
                format="json",
            ).status_code
            for indice in range(11)
        ]
        # El 429 solo puede venir del throttle, no del endpoint: sin BD, las
        # peticiones permitidas mueren en la capa de base de datos (503).
        self.assertIn(status.HTTP_429_TOO_MANY_REQUESTS, estados)
        permitidas = [codigo for codigo in estados if codigo != status.HTTP_429_TOO_MANY_REQUESTS]
        self.assertTrue(all(codigo == status.HTTP_503_SERVICE_UNAVAILABLE for codigo in permitidas))
