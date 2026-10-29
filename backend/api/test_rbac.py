"""Pruebas del RBAC: scopes de `usuario_tiene_permiso`, recurso por vista y
serializador de permisos de rol.

No necesitan base de datos: se sustituye el manager de `RolRecurso` por un
doble que registra los filtros recibidos, igual que el resto de la suite de
extremos.

Ejecutar:  python manage.py test api
"""
from types import SimpleNamespace
from unittest import mock

from django.test import SimpleTestCase
from rest_framework import serializers

from .security import (
    EscribirConPermiso,
    IsStoreAdmin,
    IsSuperAdmin,
    ROLE_ADMIN,
    ROLE_CUSTOMER,
    ROLE_SELLER,
    ROLE_SUPERADMIN,
    get_accion_from_method,
    get_recurso_from_view,
    usuario_tiene_permiso,
)
from .serializers import RolRecursoSerializer
from .views import ResourceCollection, ResourceDetail

CODIGOS_RECURSO_SEMBRADOS = {
    "productos", "categorias", "tipos", "inventario", "cotizaciones", "ventas",
    "usuarios", "roles", "tiendas", "configuraciones", "marcas", "modelos",
    "motos", "compatibilidad", "modelos3d",
}

TIENDA = "aaaaaaaa-0000-0000-0000-000000000001"
OTRA_TIENDA = "bbbbbbbb-0000-0000-0000-000000000002"
USUARIO = "cccccccc-0000-0000-0000-000000000003"


def usuario(tienda=None, roles=(ROLE_ADMIN,), id_usuario=USUARIO):
    return SimpleNamespace(
        is_authenticated=True,
        is_anonymous=False,
        id_usuario=id_usuario,
        id_tienda=tienda,
        role_ids=list(roles),
    )


class DobleConsulta:
    """QuerySet falso: guarda el `scope__in` recibido y responde `concedido`.

    No es iterable a propósito: el código que recorriera el queryset (como
    hacía la versión anterior de `usuario_tiene_permiso`) revienta aquí, y eso
    es justo lo que queremos detectar.
    """

    def __init__(self, concedido):
        self.concedido = concedido
        self.filtros = None

    def filter(self, **filtros):
        self.filtros = filtros
        return self

    def exists(self):
        return self.concedido


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

    def test_tienda_ajena_excluye_el_scope_tienda(self):
        doble = DobleConsulta(concedido=False)
        with mock.patch("api.models.RolRecurso.objects", doble):
            usuario_tiene_permiso(usuario(tienda=TIENDA), "inventario", "leer",
                                  tienda_id=OTRA_TIENDA)
        self.assertNotIn("tienda", doble.filtros["scope__in"])

    def test_tienda_propia_incluye_el_scope_tienda(self):
        doble = DobleConsulta(concedido=False)
        with mock.patch("api.models.RolRecurso.objects", doble):
            usuario_tiene_permiso(usuario(tienda=TIENDA), "inventario", "leer",
                                  tienda_id=TIENDA)
        self.assertIn("tienda", doble.filtros["scope__in"])

    def test_sin_tienda_no_hay_scope_tienda(self):
        doble = DobleConsulta(concedido=False)
        with mock.patch("api.models.RolRecurso.objects", doble):
            usuario_tiene_permiso(usuario(tienda=None), "inventario", "leer",
                                  tienda_id=TIENDA)
        self.assertNotIn("tienda", doble.filtros["scope__in"])

    def test_destino_distinto_excluye_el_scope_propio(self):
        doble = DobleConsulta(concedido=False)
        with mock.patch("api.models.RolRecurso.objects", doble):
            usuario_tiene_permiso(usuario(), "cotizaciones", "actualizar",
                                  usuario_id="otro-usuario")
        self.assertNotIn("propio", doble.filtros["scope__in"])

    def test_sin_destino_incluye_el_scope_propio(self):
        doble = DobleConsulta(concedido=False)
        with mock.patch("api.models.RolRecurso.objects", doble):
            usuario_tiene_permiso(usuario(), "cotizaciones", "actualizar")
        self.assertIn("propio", doble.filtros["scope__in"])

    def test_destino_es_el_propio_incluye_el_scope_propio(self):
        doble = DobleConsulta(concedido=False)
        with mock.patch("api.models.RolRecurso.objects", doble):
            usuario_tiene_permiso(usuario(tienda=TIENDA), "cotizaciones", "actualizar",
                                  usuario_id=USUARIO)
        self.assertIn("propio", doble.filtros["scope__in"])

    def test_recurso_sin_columna_de_tienda_no_acepta_scope_tienda(self):
        """`producto`, `categoria_producto` y `tipo_accesorio` no tienen tienda.

        La semilla concede `productos:crear` con scope `tienda` a Vendedor.
        Aceptarla daría a esa tienda escritura sobre el catálogo global de las
        otras, así que el scope se descarta y la concesión queda inerte hasta
        que se corrija el dato.
        """
        doble = DobleConsulta(concedido=False)
        with mock.patch("api.models.RolRecurso.objects", doble):
            usuario_tiene_permiso(usuario(tienda=TIENDA), "productos", "crear",
                                  tienda_id=TIENDA)
        self.assertEqual(doble.filtros["scope__in"], ["global"])

    def test_recurso_sin_dueño_no_acepta_scope_propio(self):
        doble = DobleConsulta(concedido=False)
        with mock.patch("api.models.RolRecurso.objects", doble):
            usuario_tiene_permiso(usuario(), "inventario", "crear")
        self.assertNotIn("propio", doble.filtros["scope__in"])


class RecursoPorVistaTests(SimpleTestCase):
    def test_vista_sin_permiso_recurso_se_deniega(self):
        class VistaSinDeclarar(ResourceCollection):
            pass

        with self.assertLogs("api.security", level="WARNING"):
            self.assertIsNone(get_recurso_from_view(VistaSinDeclarar()))

    def test_cada_vista_generica_declara_su_recurso(self):
        """`EscribirConPermiso` solo funciona con `permiso_recurso` declarado.

        Una subclase que lo omita se autodeniega en mutaciones, y una que lo
        invente apunta a un recurso ausente de la tabla `recurso`, así que
        falla en silencio en producción. Se comprueban las dos cosas.
        """
        import api.views as module

        sin_declarar, invalidos = [], []
        for nombre in dir(module):
            objeto = getattr(module, nombre)
            if not isinstance(objeto, type):
                continue
            if not issubclass(objeto, (ResourceCollection, ResourceDetail)):
                continue
            if objeto in (ResourceCollection, ResourceDetail):
                continue
            if objeto.permission_classes != [EscribirConPermiso]:
                continue  # la subclase gobierna con roles, no con la matriz
            recurso = objeto.permiso_recurso
            if not recurso:
                sin_declarar.append(nombre)
            elif recurso not in CODIGOS_RECURSO_SEMBRADOS:
                invalidos.append("%s=%s" % (nombre, recurso))

        self.assertEqual(sin_declarar, [], "vistas genéricas sin permiso_recurso")
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

    def test_lectura_abierta_aunque_no_conceda_el_permiso(self):
        with mock.patch("api.security.usuario_tiene_permiso", return_value=False):
            self.assertTrue(EscribirConPermiso().has_permission(
                self.solicitud, SimpleNamespace()))

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


class RolDeAccesoTests(SimpleTestCase):
    """`IsStoreAdmin` gobierna la matriz recurso-acción desde que
    `permission_classes` dejó de estar silenciado por `get_permissions()`."""

    def solicitud(self, user):
        return SimpleNamespace(user=user)

    def test_superadmin_no_queda_fuera_de_la_matriz(self):
        self.assertTrue(IsStoreAdmin().has_permission(
            self.solicitud(usuario(roles=[ROLE_SUPERADMIN])), SimpleNamespace()))

    def test_admin_de_tienda_si_puede(self):
        self.assertTrue(IsStoreAdmin().has_permission(
            self.solicitud(usuario(tienda=TIENDA, roles=[ROLE_ADMIN])), SimpleNamespace()))

    def test_vendedor_no_puede(self):
        self.assertFalse(IsStoreAdmin().has_permission(
            self.solicitud(usuario(tienda=TIENDA, roles=[ROLE_SELLER])), SimpleNamespace()))


class AccionesPorMetodoTests(SimpleTestCase):
    def test_mapeo_de_metodo_a_accion(self):
        self.assertEqual(get_accion_from_method("GET"), "listar")
        self.assertEqual(get_accion_from_method("POST"), "crear")
        self.assertEqual(get_accion_from_method("PATCH"), "actualizar")
        self.assertEqual(get_accion_from_method("DELETE"), "eliminar")


class RolRecursoSerializerTests(SimpleTestCase):
    """`GET /api/rol-recursos` reventaba con AttributeError: `Meta.fields`
    listaba `rol_recurso`, que no es campo del modelo ni atributo declarado."""

    def test_resuelve_todos_los_campos(self):
        campos = RolRecursoSerializer().fields
        self.assertNotIn("rol_recurso", campos)
        self.assertIn("recurso_accion", campos)
        self.assertIn("scope", campos)
