import logging

from rest_framework.permissions import BasePermission
from django.utils.module_loading import import_string


logger = logging.getLogger(__name__)


ROLE_SUPERADMIN = "00000000-0000-0000-0000-000000000000"
ROLE_ADMIN = "11111111-0000-0000-0000-000000000001"      # Admin de tienda
ROLE_SELLER = "11111111-0000-0000-0000-000000000002"
ROLE_CUSTOMER = "11111111-0000-0000-0000-000000000003"


def has_any_role(user, role_ids):
    if not getattr(user, "is_authenticated", False):
        return False
    allowed = {str(value).lower() for value in role_ids}
    return any(str(value).lower() in allowed for value in user.role_ids)


def get_recurso_from_view(view):
    """
    Recurso RBAC sobre el que actúa la vista.

    Lo único válido es el atributo `permiso_recurso` de la vista. Antes se
    infería del path con un mapa de prefijos, y eso autorizaba de forma
    silenciosa contra el recurso equivocado: `/api/modelos-moto` contenía
    "moto" y caía en `motos`, mientras `/api/modelos-3d` no matcheaba nada.
    Una vista sin el atributo se deniega y se registra, en vez de adivinar.
    """
    recurso = getattr(view, "permiso_recurso", None)
    if not recurso:
        logger.warning(
            "La vista %s no declara permiso_recurso; la operación se deniega.",
            type(view).__name__,
        )
    return recurso


def get_accion_from_method(method):
    """Mapea método HTTP a acción RBAC"""
    method_map = {
        "GET": "listar",      # por defecto GET es listar
        "POST": "crear",
        "PUT": "actualizar",
        "PATCH": "actualizar",
        "DELETE": "eliminar",
    }
    return method_map.get(method, "leer")


# Recursos cuya tabla sí tiene la dimensión del scope. Un alcance 'tienda'
# sobre `producto` no se puede satisfacer: la tabla no tiene columna de tienda,
# así que la semilla grantaría escritura global a una tienda concreta. Esas
# concesiones se deniegan en vez de convertirse en un acceso entre tiendas;
# la corrección correcta está en los datos, no aquí.
RECURSOS_CON_TIENDA = {"inventario", "cotizaciones", "configuraciones", "ventas", "usuarios"}
# Recursos con dueño individual (`id_usuario`), únicos donde 'propio' limita.
RECURSOS_CON_PROPIETARIO = {"cotizaciones", "configuraciones"}


def usuario_tiene_permiso(user, recurso_codigo, accion_codigo, tienda_id=None, usuario_id=None):
    """
    Verifica si un usuario tiene permiso para una acción sobre un recurso.
    Comprueba la tabla rol_recurso con el scope correspondiente.
    Superadmin tiene acceso total sin necesidad de permisos explícitos.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return False
    
    # Superadmin tiene acceso total sin verificar permisos específicos
    if str(ROLE_SUPERADMIN) in {str(r).lower() for r in user.role_ids}:
        return True
    
    if not user.role_ids:
        return False
    
    from api.models import RolRecurso
    
    scopes_validos = ["global"]
    # El scope 'tienda' se resuelve contra la tienda del usuario, no del rol:
    # `rol` no tiene columna de tienda. Sin tienda asignada el scope no aplica.
    propia_tienda = getattr(user, "id_tienda", None)
    if (recurso_codigo in RECURSOS_CON_TIENDA and propia_tienda
            and (not tienda_id or str(propia_tienda) == str(tienda_id))):
        scopes_validos.append("tienda")
    # 'propio' = sus registros: aplica cuando el destino es él mismo o no se
    # indicó destino (el filtrado por fila lo hace el queryset de la vista).
    if (recurso_codigo in RECURSOS_CON_PROPIETARIO
            and (not usuario_id or str(getattr(user, "id_usuario", None)) == str(usuario_id))):
        scopes_validos.append("propio")

    return RolRecurso.objects.filter(
        rol_id__in=user.role_ids,
        activo=True,
        scope__in=scopes_validos,
        recurso_accion__activo=True,
        recurso_accion__recurso__activo=True,
        recurso_accion__accion__activo=True,
        recurso_accion__recurso__codigo=recurso_codigo,
        recurso_accion__accion__codigo=accion_codigo,
    ).exists()


class HasPermiso(BasePermission):
    """
    Permission class que verifica permisos usando el nuevo sistema RBAC.

    Uso en views:
        permission_classes = [HasPermiso]
        permiso_recurso = "productos"
        permiso_accion = "crear"   # opcional; por defecto se deriva del método
    """
    message = "No tiene permisos para realizar esta acción."

    def has_permission(self, request, view):
        recurso = get_recurso_from_view(view)
        accion = getattr(view, "permiso_accion", None) or get_accion_from_method(request.method)

        if not recurso or not accion:
            # Si no se puede determinar, denegar por seguridad
            return False
        
        tienda_id = getattr(request.user, "id_tienda", None)
        usuario_id = getattr(request.user, "id_usuario", None)
        
        return usuario_tiene_permiso(request.user, recurso, accion, tienda_id, usuario_id)


class EscribirConPermiso(BasePermission):
    """Lectura de catálogo abierta; mutaciones regidas por la matriz RBAC.

    Las vistas genéricas de catálogo declaraban `permission_classes`
    (IsSuperAdmin, IsStoreAdmin) encima de un `get_permissions()` que las
    ignoraba, así que el catálogo RBAC se leía sin autenticar. Al ser una
    clase de permiso, la subclase puede reemplazarla de verdad.
    """
    message = HasPermiso.message

    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return HasPermiso().has_permission(request, view)


class IsStoreStaff(BasePermission):
    message = "Se requiere un rol de administrador o vendedor."

    def has_permission(self, request, view):
        return has_any_role(request.user, (ROLE_ADMIN, ROLE_SELLER))


class IsSuperAdmin(BasePermission):
    message = "Se requiere el rol de superadministrador."

    def has_permission(self, request, view):
        return has_any_role(request.user, (ROLE_SUPERADMIN,))


class IsStoreAdmin(BasePermission):
    message = "Se requiere el rol de administrador de tienda."

    def has_permission(self, request, view):
        # El superadmin manda sobre la matriz recurso-acción: `usuario_tiene_permiso`
        # ya lo trata como acceso total, y estas vistas usaban esa ruta antes de que
        # `permission_classes` dejara de estar silenciado.
        if has_any_role(request.user, (ROLE_SUPERADMIN,)):
            return True
        return has_any_role(request.user, (ROLE_ADMIN,))
