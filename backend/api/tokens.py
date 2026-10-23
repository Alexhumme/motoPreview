"""Tokens firmados y autocontenidos para la verificación de correo.

Se firman con el mismo secreto de los JWT de sesión y llevan `exp` e `iss`,
de modo que no hace falta guardar nada en la base y se puede saber si un
enlace caducó. Antes se almacenaba el token en claro en `verificacion_token`;
los enlaces viejos siguen funcionando por compatibilidad.
"""
from datetime import timedelta

import jwt
from django.conf import settings
from django.utils import timezone

VERIFICATION_LIFETIME = timedelta(hours=72)
EMAIL_VERIFY_TYPE = "email_verify"


def verification_token_for(user):
    """Genera el token firmado de verificación para un usuario."""
    now = timezone.now()
    return jwt.encode(
        {
            "tipo": EMAIL_VERIFY_TYPE,
            "id_usuario": str(user.id_usuario),
            "iat": now,
            "exp": now + VERIFICATION_LIFETIME,
            "iss": settings.JWT_ISSUER,
        },
        settings.JWT_SECRET,
        algorithm="HS256",
    )


def parse_verification_token(token):
    """Valida un token de verificación y devuelve su payload.

    Lanza jwt.PyJWTError si el token no es válido o ya expiró.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=["HS256"],
        options={"require": ["exp", "iss", "tipo", "id_usuario"]},
        issuer=settings.JWT_ISSUER,
    )