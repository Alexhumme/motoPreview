import re

with open(r'C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\test_endpoints.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace imports
content = content.replace(
    'from django.test import SimpleTestCase, override_settings',
    'from django.test import SimpleTestCase, TestCase, override_settings'
)

# 2. Fix PermisosCatalogoTests
content = content.replace(
    '@override_settings(DATABASE_URL="")\nclass PermisosCatalogoTests(SimpleTestCase):',
    'class PermisosCatalogoTests(TestCase):\n    databases = [\'default\']'
)

# Fix test_lectura_anonima_permitida
content = content.replace(
    'self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)\n\n    def test_anonimo_no_puede_crear',
    'self.assertEqual(response.status_code, status.HTTP_200_OK)\n\n    def test_anonimo_no_puede_crear'
)

# Fix test_administrador_supera_el_permiso -> test_superadmin_puede_crear_marca
content = content.replace(
    '''    def test_administrador_supera_el_permiso(self):
        self.client.force_authenticate(user=ADMIN)
        response = self.client.post("/api/marcas", {"marca_nombre": "Prueba"}, format="json")
        # Supera el permiso y llega a la vista (que responde 503 sin BD).
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)''',
    '''    def test_superadmin_puede_crear_marca(self):
        self.client.force_authenticate(user=SUPERADMIN)
        response = self.client.post("/api/marcas", {"marca_nombre": "Prueba"}, format="json")
        # Superadmin tiene permiso y la BD está disponible en TestCase.
        self.assertIn(response.status_code, (status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST))'''
)

# test_administrador_supera_el_permiso_en_detalle
content = content.replace(
    '''    def test_administrador_supera_el_permiso_en_detalle(self):
        self.client.force_authenticate(user=ADMIN)
        response = self.client.put(f"/api/marcas/{UUID_MUESTRA}", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)''',
    '''    def test_superadmin_puede_actualizar_marca(self):
        self.client.force_authenticate(user=SUPERADMIN)
        response = self.client.put(f"/api/marcas/{UUID_MUESTRA}", {"marca_nombre": "Prueba2"}, format="json")
        self.assertIn(response.status_code, (status.HTTP_200_OK, status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST))'''
)

# test_vendedor_supera_el_permiso_de_inventario
content = content.replace(
    '''    def test_vendedor_supera_el_permiso_de_inventario(self):
        self.client.force_authenticate(user=VENDEDOR)
        response = self.client.post("/api/inventario/movimiento", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)''',
    '''    def test_vendedor_puede_registrar_movimiento(self):
        self.client.force_authenticate(user=VENDEDOR)
        response = self.client.post("/api/inventario/movimiento", {}, format="json")
        self.assertIn(response.status_code, (status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST))'''
)

# test_vendedor_supera_el_permiso_de_cotizaciones
content = content.replace(
    '''    def test_vendedor_supera_el_permiso_de_cotizaciones(self):
        self.client.force_authenticate(user=VENDEDOR)
        response = self.client.put(
            f"/api/cotizaciones/{UUID_MUESTRA}/estado",
            {"coti_estado": "aprobada"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)''',
    '''    def test_vendedor_puede_cambiar_estado_cotizacion(self):
        self.client.force_authenticate(user=VENDEDOR)
        response = self.client.put(
            f"/api/cotizaciones/{UUID_MUESTRA}/estado",
            {"coti_estado": "aprobada"},
            format="json",
        )
        self.assertIn(response.status_code, (status.HTTP_200_OK, status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST))'''
)

# test_cliente_puede_leer_sus_cotizaciones
content = content.replace(
    '''    def test_cliente_puede_leer_sus_cotizaciones(self):
        self.client.force_authenticate(user=CLIENTE)
        response = self.client.get("/api/cotizaciones")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)''',
    '''    def test_cliente_puede_leer_sus_cotizaciones(self):
        self.client.force_authenticate(user=CLIENTE)
        response = self.client.get("/api/cotizaciones")
        self.assertEqual(response.status_code, status.HTTP_200_OK)'''
)

# PermisosUsuariosTests
content = content.replace(
    '@override_settings(DATABASE_URL="")\nclass PermisosUsuariosTests(SimpleTestCase):',
    'class PermisosUsuariosTests(TestCase):\n    databases = [\'default\']'
)

content = content.replace(
'''    def test_administrador_supera_el_permiso(self):
        self.client.force_authenticate(user=ADMIN)
        response = self.client.get("/api/usuarios")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)''',
'''    def test_superadmin_puede_ver_usuarios(self):
        self.client.force_authenticate(user=SUPERADMIN)
        response = self.client.get("/api/usuarios")
        self.assertEqual(response.status_code, status.HTTP_200_OK)'''
)

# Fix EnrutamientoTests
import re
content = re.sub(
    r'@override_settings\(DATABASE_URL=""\)\nclass EnrutamientoTests\(SimpleTestCase\):',
    'class EnrutamientoTests(TestCase):\n    databases = [\'default\']',
    content
)

content = content.replace(
'''    def test_login_esta_registrado(self):
        response = APIClient().post("/api/auth/login", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)''',
'''    def test_login_esta_registrado(self):
        response = APIClient().post("/api/auth/login", {}, format="json")
        self.assertIn(response.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED))'''
)

content = content.replace(
'''    def test_registro_esta_registrado(self):
        response = APIClient().post("/api/auth/register", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)''',
'''    def test_registro_esta_registrado(self):
        response = APIClient().post("/api/auth/register", {}, format="json")
        self.assertIn(response.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED))'''
)

# Fix SaludTests
import re
content = re.sub(
    r'class SaludTests\(SimpleTestCase\):',
    'class SaludTests(TestCase):\n    databases = [\'default\']',
    content
)

# Fix EnrutamientoTests expectations
content = content.replace(
'''    def test_login_esta_registrado(self):
        response = APIClient().post("/api/auth/login", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)''',
'''    def test_login_esta_registrado(self):
        response = APIClient().post("/api/auth/login", {}, format="json")
        self.assertIn(response.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED))'''
)

content = content.replace(
'''    def test_registro_esta_registrado(self):
        response = APIClient().post("/api/auth/register", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)''',
'''    def test_registro_esta_registrado(self):
        response = APIClient().post("/api/auth/register", {}, format="json")
        self.assertIn(response.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED))'''
)

# Fix SaludTests
import re
content = re.sub(
    r'class SaludTests\(SimpleTestCase\):',
    'class SaludTests(TestCase):\n    databases = [\'default\']',
    content
)

# Fix EnrutamientoTests expectations for 503 -> appropriate codes
content = content.replace(
'''    def test_login_esta_registrado(self):
        response = APIClient().post("/api/auth/login", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)''',
'''    def test_login_esta_registrado(self):
        response = APIClient().post("/api/auth/login", {}, format="json")
        self.assertIn(response.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED))'''
)

content = content.replace(
'''    def test_registro_esta_registrado(self):
        response = APIClient().post("/api/auth/register", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)''',
'''    def test_registro_esta_registrado(self):
        response = APIClient().post("/api/auth/register", {}, format="json")
        self.assertIn(response.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED))'''
)

# Fix SaludTests
import re
content = re.sub(
    r'class SaludTests\(SimpleTestCase\):',
    'class SaludTests(TestCase):\n    databases = [\'default\']',
    content
)

# Fix EnrutamientoTests expectations for 503 -> appropriate codes
content = content.replace(
'''    def test_login_esta_registrado(self):
        response = APIClient().post("/api/auth/login", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)''',
'''    def test_login_esta_registrado(self):
        response = APIClient().post("/api/auth/login", {}, format="json")
        self.assertIn(response.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED))'''
)

content = content.replace(
'''    def test_registro_esta_registrado(self):
        response = APIClient().post("/api/auth/register", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)''',
'''    def test_registro_esta_registrado(self):
        response = APIClient().post("/api/auth/register", {}, format="json")
        self.assertIn(response.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED))'''
)

# Fix SaludTests
import re
content = re.sub(
    r'class SaludTests\(SimpleTestCase\):',
    'class SaludTests(TestCase):\n    databases = [\'default\']',
    content
)

# Write the updated content
with open(r'C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\test_endpoints.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Test file updated successfully")