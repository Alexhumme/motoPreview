import jwt
from django.conf import settings
from django.utils import timezone
from rest_framework import authentication, exceptions

from .models import User


class AnonymousPrincipal:
    is_authenticated = False
    is_anonymous = True
    pk = None


class JWTAuthentication(authentication.BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).decode("utf-8")
        if not header:
            return None

        parts = header.split()
        if len(parts) != 2 or parts[0].lower() != self.keyword.lower():
            raise exceptions.AuthenticationFailed("Formato de token inválido.")
        if not settings.JWT_SECRET:
            raise exceptions.AuthenticationFailed(
                "JWT_SECRET o SESSION_SECRET debe estar configurado."
            )

        try:
            payload = jwt.decode(
                parts[1],
                settings.JWT_SECRET,
                algorithms=["HS256"],
                options={"require": ["exp", "iss"]},
                issuer=settings.JWT_ISSUER,
            )
        except jwt.ExpiredSignatureError as exc:
            raise exceptions.AuthenticationFailed("El token expiró.") from exc
        except jwt.InvalidTokenError as exc:
            raise exceptions.AuthenticationFailed("Token inválido.") from exc

        user_id = payload.get("id_usuario")
        if not user_id:
            raise exceptions.AuthenticationFailed("El token no identifica un usuario.")

        try:
            user = User.objects.select_related("tienda").get(pk=user_id)
        except User.DoesNotExist as exc:
            raise exceptions.AuthenticationFailed("Usuario no encontrado.") from exc

        if user.estado_usuario != "activo":
            raise exceptions.AuthenticationFailed("Usuario inactivo o bloqueado.")

        # The user's current roles come from usuario_rol, not from a removed
        # usuario.id_rol column. Keep the token claim in the returned payload
        # for compatibility with existing tokens and API responses.
        payload["id_rol"] = str(user.id_rol) if user.id_rol else None
        payload["id_tienda"] = str(user.id_tienda) if user.id_tienda else None
        payload["authenticated_at"] = timezone.now()
        return user, payload

    def authenticate_header(self, request):
        return self.keyword
