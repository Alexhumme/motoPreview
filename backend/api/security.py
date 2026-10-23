from rest_framework.permissions import BasePermission
from django.utils.module_loading import import_string


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
    Determina el recurso basándose en la vista/URL.
    Mapea endpoints a códigos de recurso.
    """
    # Mapeo de basenames/viewsets a códigos de recurso
    basename_map = {
        "producto": "productos",
        "categoria": "categorias",
        "tipo": "tipos",
        "marca": "marcas",
        "modelo-moto": "modelos",
        "moto": "motos",
        "inventario": "inventario",
        "movimiento": "movimientos",
        "cotizacion": "cotizaciones",
        "usuario": "usuarios",
        "rol": "roles",
        "tienda": "tiendas",
        "plan": "planes",
        "configuracion": "configuraciones",
        "modelo3d": "modelos3d",
        "compatibilidad": "compatibilidad",
        "categoria-producto": "categorias",
        "tipo-accesorio": "tipos",
        "accesorio": "productos",  # legacy
    }
    
    basename = getattr(view, "basename", None)
    if basename:
        return basename_map.get(basename, basename)
    
    # Fallback: inferir de la URL
    path = getattr(view, "request", None)
    if path and hasattr(path, "path"):
        path = path.path
    else:
        path = getattr(view, "kwargs", {}).get("url_path", "")
    
    # Intentar inferir del path
    for key, value in basename_map.items():
        if key in str(path):
            return value
    
    return None


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
    
    from api.models import RolRecurso, RecursoAccion
    
    # Query optimizada: buscar si algún rol del usuario tiene el permiso
    queryset = RolRecurso.objects.filter(
        rol_id__in=user.role_ids,
        activo=True,
        recurso_accion__activo=True,
        recurso_accion__recurso__activo=True,
        recurso_accion__accion__activo=True,
        recurso_accion__recurso__codigo=recurso_codigo,
        recurso_accion__accion__codigo=accion_codigo,
    ).select_related(
        "recurso_accion__recurso",
        "recurso_accion__accion",
        "rol"
    )
    
    for rr in queryset:
        if rr.scope == "global":
            return True
        elif rr.scope == "tienda" and tienda_id and str(rr.rol.tienda_id) == str(tienda_id):
            return True
        elif rr.scope == "propio" and usuario_id and str(rr.rol.usuario_id) == str(usuario_id):
            return True
    
    return False


class HasPermiso(BasePermission):
    """
    Permission class que verifica permisos usando el nuevo sistema RBAC.
    
    Uso en views:
        permission_classes = [HasPermiso]
        # O con recurso/acción específicos:
        permiso_recurso = "productos"
        permiso_accion = "crear"
    """
    message = "No tiene permisos para realizar esta acción."
    
    # Permitir override en la vista
    permiso_recurso = None
    permiso_accion = None
    
    def has_permission(self, request, view):
        # Permitir override en la vista
        recurso = self.permiso_recurso or get_recurso_from_view(view)
        accion = self.permiso_accion or get_accion_from_method(request.method)
        
        if not recurso or not accion:
            # Si no se puede determinar, denegar por seguridad
            return False
        
        tienda_id = getattr(request.user, "id_tienda", None)
        usuario_id = getattr(request.user, "id_usuario", None)
        
        return usuario_tiene_permiso(request.user, recurso, accion, tienda_id, usuario_id)


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
        return has_any_role(request.user, (ROLE_ADMIN,))
