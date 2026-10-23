"""Pruebas de las reglas de negocio extraídas a servicios (sin base de datos).

Estas reglas antes vivían duplicadas dentro de las vistas y no tenían pruebas
directas: contraseñas, estados de inventario, transiciones de cotización,
totales, tokens de verificación y privacidad de datos de tienda.

Ejecutar:  python manage.py test api.test_services
"""
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

import jwt
from django.conf import settings
from django.test import SimpleTestCase, override_settings
from django.utils import timezone

from . import services, tokens
from .security import ROLE_ADMIN, ROLE_CUSTOMER, ROLE_SELLER

SECRETO_PRUEBA = "clave-de-prueba-de-32-bytes-para-servicios"


class PasswordValidationTests(SimpleTestCase):
    def test_password_valida_no_devuelve_error(self):
        self.assertIsNone(services.validar_password("12345678"))

    def test_password_corta(self):
        self.assertIsNotNone(services.validar_password("corta"))

    def test_password_de_72_bytes_es_valida(self):
        self.assertIsNone(services.validar_password("a" * 72))

    def test_password_de_mas_de_72_bytes_se_rechaza(self):
        self.assertIn("72", services.validar_password("a" * 73))


class InventoryRuleTests(SimpleTestCase):
    def test_estado_agotado(self):
        self.assertEqual(services.inventory_status(0, 5), "agotado")
        self.assertEqual(services.inventory_status(-3, 5), "agotado")

    def test_estado_bajo(self):
        self.assertEqual(services.inventory_status(3, 5), "bajo")
        self.assertEqual(services.inventory_status(5, 5), "bajo")

    def test_estado_normal(self):
        self.assertEqual(services.inventory_status(6, 5), "normal")

    def test_entrada_siempre_positiva(self):
        self.assertEqual(services.apply_movement(2, "entrada"), 2)
        self.assertEqual(services.apply_movement(-2, "entrada"), 2)

    def test_salida_siempre_negativa(self):
        self.assertEqual(services.apply_movement(2, "salida"), -2)
        self.assertEqual(services.apply_movement(-2, "salida"), -2)

    def test_otro_tipo_se_mantiene(self):
        self.assertEqual(services.apply_movement(3, "ajuste"), 3)


class QuoteStateTests(SimpleTestCase):
    def test_transiciones_validas(self):
        self.assertTrue(services.allow_state_transition("pendiente", "aprobada"))
        self.assertTrue(services.allow_state_transition("pendiente", "rechazada"))
        self.assertTrue(services.allow_state_transition("aprobada", "completada"))
        self.assertTrue(services.allow_state_transition("aprobada", "rechazada"))
        self.assertTrue(services.allow_state_transition("rechazada", "pendiente"))

    def test_transiciones_invalidas(self):
        self.assertFalse(services.allow_state_transition("pendiente", "completada"))
        self.assertFalse(services.allow_state_transition("completada", "rechazada"))
        self.assertFalse(services.allow_state_transition("aprobada", "pendiente"))
        self.assertFalse(services.allow_state_transition("inexistente", "pendiente"))


class AccesorioFalso:
    def __init__(self, id_accesorio, producto_id, precio):
        self.id_accesorio = id_accesorio
        self.producto_id = producto_id
        self.producto = SimpleNamespace(precio=precio)


class QuoteTotalTests(SimpleTestCase):
    def setUp(self):
        ids = [str(uuid4()) for _ in range(3)]
        self.sin_precio = ids[2]
        self.accesorios = {
            ids[0]: AccesorioFalso(ids[0], "p1", 100),
            ids[1]: AccesorioFalso(ids[1], "p2", 50),
            self.sin_precio: AccesorioFalso(self.sin_precio, None, None),
        }

    def test_total_y_subtotales(self):
        items = [
            {"id_accesorio": str(list(self.accesorios)[0]), "cantidad": 2},
            {"id_accesorio": str(list(self.accesorios)[1]), "cantidad": 1},
        ]
        prepared, total = services.calc_quote(items, self.accesorios)
        self.assertEqual(total, 250)
        self.assertEqual(len(prepared), 2)
        self.assertEqual(prepared[0][1], 2)
        self.assertEqual(prepared[0][3], 200)

    def test_accesorio_sin_precio_rechaza(self):
        items = [{"id_accesorio": self.sin_precio, "cantidad": 1}]
        with self.assertRaises(services.BusinessError):
            services.calc_quote(items, self.accesorios)

    def test_mas_items_del_permitido_rechaza(self):
        items = [{"id_accesorio": str(list(self.accesorios)[0]), "cantidad": 1}] * 3
        with self.assertRaises(services.BusinessError):
            services.calc_quote(items, self.accesorios, max_items=2)


@override_settings(JWT_SECRET=SECRETO_PRUEBA, JWT_ISSUER="motopreview-test")
class VerificationTokenTests(SimpleTestCase):
    def test_round_trip(self):
        user = SimpleNamespace(id_usuario=str(uuid4()))
        token = tokens.verification_token_for(user)
        payload = tokens.parse_verification_token(token)
        self.assertEqual(payload["id_usuario"], str(user.id_usuario))
        self.assertEqual(payload["tipo"], tokens.EMAIL_VERIFY_TYPE)
        self.assertEqual(payload["iss"], "motopreview-test")

    def test_token_expirado(self):
        user = SimpleNamespace(id_usuario=str(uuid4()))
        now = timezone.now()
        token = jwt.encode(
            {
                "tipo": tokens.EMAIL_VERIFY_TYPE,
                "id_usuario": str(user.id_usuario),
                "iat": now,
                "exp": now - timedelta(hours=1),
                "iss": "motopreview-test",
            },
            SECRETO_PRUEBA,
            algorithm="HS256",
        )
        with self.assertRaises(jwt.PyJWTError):
            tokens.parse_verification_token(token)

    def test_token_de_otro_emisor_se_rechaza(self):
        user = SimpleNamespace(id_usuario=str(uuid4()))
        now = timezone.now()
        token = jwt.encode(
            {
                "tipo": tokens.EMAIL_VERIFY_TYPE,
                "id_usuario": str(user.id_usuario),
                "iat": now,
                "exp": now + timedelta(hours=1),
                "iss": "otro-emisor",
            },
            SECRETO_PRUEBA,
            algorithm="HS256",
        )
        with self.assertRaises(jwt.PyJWTError):
            tokens.parse_verification_token(token)

    def test_token_manipulado_se_rechaza(self):
        user = SimpleNamespace(id_usuario=str(uuid4()))
        good = tokens.verification_token_for(user)
        tampered = good[:-4] + ("AAAA" if not good.endswith("AAAA") else "BBBB")
        with self.assertRaises(jwt.PyJWTError):
            tokens.parse_verification_token(tampered)


class StorePrivacyTests(SimpleTestCase):
    def _request(self, user):
        return SimpleNamespace(user=user)

    def test_anonimo_no_ve_datos_contacto(self):
        anonimo = SimpleNamespace(is_authenticated=False, role_ids=[])
        self.assertFalse(services.permite_datos_contacto(self._request(anonimo)))

    def test_client_no_ve_datos_contacto(self):
        cliente = SimpleNamespace(is_authenticated=True, role_ids=[ROLE_CUSTOMER])
        self.assertFalse(services.permite_datos_contacto(self._request(cliente)))

    def test_staff_si_ve_datos_contacto(self):
        admin = SimpleNamespace(is_authenticated=True, role_ids=[ROLE_ADMIN])
        self.assertTrue(services.permite_datos_contacto(self._request(admin)))
        vendedor = SimpleNamespace(is_authenticated=True, role_ids=[ROLE_SELLER])
        self.assertTrue(services.permite_datos_contacto(self._request(vendedor)))

    def test_sin_request_no_se_permite(self):
        self.assertFalse(services.permite_datos_contacto(None))