"""Runner de tests que evita crear una base de prueba salvo que se pida.

Los tests unitarios del API no necesitan base de datos (los modelos de negocio
son ``managed=False`` y las pruebas usan ``override_settings(DATABASE_URL=\"\")``).
Pero con ``MOTOPREVIEW_DATABASE_URL`` configurada, el DiscoverRunner por defecto
intenta crear y borrar ``test_<nombre>`` en cada corrida, lo que falla cuando la
base vive detrás de un pooler (p. ej. Neon): ``CREATE/DROP DATABASE`` no está
disponible y el pooler mantiene sesiones que impiden el DROP.

Solo cuando ``RUN_DB_TESTS=1`` se crea la base de prueba real y corren los tests
de integración:

    $env:RUN_DB_TESTS = "1"
    python manage.py test api.test_integracion --keepdb -v 2
"""
import os

from django.test.runner import DiscoverRunner


class NoDbTestRunner(DiscoverRunner):
    """DiscoverRunner que omite la base de prueba salvo con RUN_DB_TESTS=1."""

    def setup_databases(self, **kwargs):
        if os.environ.get("RUN_DB_TESTS") != "1":
            return None
        old_config = super().setup_databases(**kwargs)
        # Los modelos de negocio son managed=False (sin migraciones): el esquema
        # y los datos base de los flujos se montan aquí, fuera de la transacción
        # atómica de cada TestCase (si no, el DDL se revertiría al cerrar la clase).
        from api.test_integracion import montar_esquema, seed_base

        montar_esquema()
        seed_base()
        return old_config

    def teardown_databases(self, old_config, **kwargs):
        if old_config:
            super().teardown_databases(old_config, **kwargs)