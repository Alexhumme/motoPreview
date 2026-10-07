from rest_framework.permissions import BasePermission


ROLE_ADMIN = "11111111-0000-0000-0000-000000000001"
ROLE_SELLER = "11111111-0000-0000-0000-000000000002"
ROLE_CUSTOMER = "11111111-0000-0000-0000-000000000003"


def has_any_role(user, role_ids):
    if not getattr(user, "is_authenticated", False):
        return False
    allowed = {str(value).lower() for value in role_ids}
    return any(str(value).lower() in allowed for value in user.role_ids)


class IsStoreStaff(BasePermission):
    message = "Se requiere un rol de administrador o vendedor."

    def has_permission(self, request, view):
        return has_any_role(request.user, (ROLE_ADMIN, ROLE_SELLER))


class IsStoreAdmin(BasePermission):
    message = "Se requiere el rol de administrador."

    def has_permission(self, request, view):
        return has_any_role(request.user, (ROLE_ADMIN,))
