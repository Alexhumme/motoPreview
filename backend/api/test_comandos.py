"""Pruebas de la lógica pura del comando asignar_rol (sin base de datos)."""
from django.core.management.base import CommandError
from django.test import SimpleTestCase

from api.management.commands.asignar_rol import Command, resolver_rol
from api.security import ROLE_ADMIN, ROLE_CUSTOMER, ROLE_SELLER

ADMIN_UUID = "11111111-0000-0000-0000-000000000001"
VENDEDOR_UUID = "11111111-0000-0000-0000-000000000002"
CLIENTE_UUID = "11111111-0000-0000-0000-000000000003"


class ResolverRolTests(SimpleTestCase):
    def test_nombres_cortos(self):
        self.assertEqual(resolver_rol("admin"), ROLE_ADMIN)
        self.assertEqual(resolver_rol("vendedor"), ROLE_SELLER)
        self.assertEqual(resolver_rol("cliente"), ROLE_CUSTOMER)

    def test_sinonimos_y_mayusculas(self):
        self.assertEqual(resolver_rol("ADMIN"), ROLE_ADMIN)
        self.assertEqual(resolver_rol("  Administrador "), ROLE_ADMIN)
        self.assertEqual(resolver_rol("Admin Tienda"), ROLE_ADMIN)
        self.assertEqual(resolver_rol("Administrador de Tienda"), ROLE_ADMIN)

    def test_uuid_directo(self):
        self.assertEqual(resolver_rol(VENDEDOR_UUID), VENDEDOR_UUID)
        self.assertEqual(resolver_rol(VENDEDOR_UUID.upper()), VENDEDOR_UUID)

    def test_nombre_desconocido_devuelve_none(self):
        self.assertIsNone(resolver_rol("jefe de taller"))
        self.assertIsNone(resolver_rol("no-existe"))

    def test_uuid_invalido_devuelve_none(self):
        self.assertIsNone(resolver_rol("12345"))


class ArgumentosRequeridosTests(SimpleTestCase):
    def test_sin_email_o_rol_se_rechaza(self):
        comando = Command()
        with self.assertRaises(CommandError):
            comando.handle(email=None, rol="admin", listar=False)
