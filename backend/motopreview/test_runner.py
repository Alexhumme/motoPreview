"""Runner de tests que evita crear una base de prueba salvo que se pida.

Los tests unitarios del API no necesitan base de datos (los modelos de negocio
son ``managed=False`` y las pruebas usan ``override_settings(DATABASE_URL=\"\")``).
Pero con ``MOTOPREVIEW_DATABASE_URL`` configurada, el DiscoverRunner por defecto
intenta crear y borrar ``test_<nombre>`` en cada corrida, lo que falla cuando la
base vive detrás de un pooler (p. ej. Neon): ``CREATE/DROP DATABASE`` no está
disponible y el pooler mantiene sesiones que impiden el DROP.

Sin ``RUN_DB_TESTS=1`` este runner, además de omitir la base de prueba, omite
los tests que la piden (ver :meth:`NoDbTestRunner.build_suite`).

Solo cuando ``RUN_DB_TESTS=1`` se crea la base de prueba real y corren los tests
de integración:

    $env:RUN_DB_TESTS = "1"
    python manage.py test api.test_integracion --keepdb -v 2
"""
import os

from django.test.runner import DiscoverRunner


def _base_de_prueba_activa():
    return os.environ.get("RUN_DB_TESTS") == "1"


class NoDbTestRunner(DiscoverRunner):
    """DiscoverRunner que omite la base de prueba salvo con RUN_DB_TESTS=1."""

    def build_suite(self, *args, **kwargs):
        suite = super().build_suite(*args, **kwargs)
        if _base_de_prueba_activa():
            return suite
        self._saltar_tests_que_piden_base(suite)
        return suite

    @staticmethod
    def _saltar_tests_que_piden_base(suite, motivo=None):
        """Marca como saltados los tests cuya clase declara ``databases``.

        ``setup_databases`` devuelve ``None`` sin ``RUN_DB_TESTS=1``, pero Django
        deja la conexión ``default`` donde apunta ``MOTOPREVIEW_DATABASE_URL``: un
        ``TestCase`` ejecuta sus consultas --escrituras incluidas, dentro de la
        transacción que revierte al final-- contra la base real del servicio. Y
        donde esa variable no existe (CI), ``DATABASES`` viene vacío y los mismos
        tests fallan con ``ConnectionDoesNotExist``.
        """
        motivo = motivo or (
            "Requiere RUN_DB_TESTS=1: no se ejecutan contra la base configurada."
        )
        for test in NoDbTestRunner._aplanar(suite):
            if not getattr(test, "databases", None):
                continue
            funcion = getattr(type(test), getattr(test, "_testMethodName", ""), None)
            if callable(funcion):
                # Protocolo interno de unittest que usan los decoradores skip*:
                # TestCase.run() lo consulta antes de ejecutar el test.
                funcion.__unittest_skip__ = True
                funcion.__unittest_skip_why__ = motivo

    @staticmethod
    def _aplanar(suite):
        for item in suite:
            if hasattr(item, "_tests"):
                yield from NoDbTestRunner._aplanar(item)
            else:
                yield item

    def setup_databases(self, **kwargs):
        if not _base_de_prueba_activa():
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