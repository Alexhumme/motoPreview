"""Restablece la contraseña del usuario Superadmin sin dejarla en el repo.

La contraseña se lee por `getpass` (o por MOTOPREVIEW_SUPERADMIN_NEW_PASSWORD si
se necesita modo no interactivo), se valida con la misma regla del alta y se
escribe con el mismo hash bcrypt que verifica el login
(api/views.py:333-341). `manage.py changepassword` no sirve aquí: produce un
hash PBKDF2 que `password_matches` rechaza y la cuenta queda cerrada.

Ejecutar desde backend/:
    python manage.py shell --no-imports -c "exec(open('scripts/restablecer_password_superadmin.py', encoding='utf-8').read())"

Con SOLO_VERIFICAR=1 no escribe: informa la base destino y el estado de la
cuenta. Contra una base remota la escritura exige
MOTOPREVIEW_CONFIRMAR_BASE_REMOTA=1, porque cambiar la puerta maestra de
producción no es una operación rutinaria.
"""
import os
from getpass import getpass

import bcrypt
from django.conf import settings
from django.db import connection, transaction

from api.services import validar_password

ROL_SUPERADMIN = "00000000-0000-0000-0000-000000000000"
USUARIO_EMAIL = os.environ.get("MOTOPREVIEW_SUPERADMIN_EMAIL", "superadmin@motopreview.com")
LOCALES = {"localhost", "127.0.0.1", "::1", "", None}


def destino():
    base = settings.DATABASES["default"]
    host, puerto, nombre = base.get("HOST"), base.get("PORT"), base.get("NAME")
    maquina = host or "socket local"
    if puerto:
        maquina = "%s:%s" % (maquina, puerto)
    return host, "%s/%s" % (maquina, nombre)


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def obtener_password():
    password = os.environ.get("MOTOPREVIEW_SUPERADMIN_NEW_PASSWORD")
    if password:
        return password
    password = getpass("Contraseña nueva para %s: " % USUARIO_EMAIL)
    if password != getpass("Repite la contraseña: "):
        raise SystemExit("Las dos contraseñas no coinciden; no se tocó nada.")
    return password


host, etiqueta = destino()
remota = host not in LOCALES
print("Base destino:", etiqueta, "(remota)" if remota else "(local)")

solo_verificar = os.environ.get("SOLO_VERIFICAR") == "1"
if remota and not solo_verificar and os.environ.get("MOTOPREVIEW_CONFIRMAR_BASE_REMOTA") != "1":
    raise SystemExit(
        "La base destino es remota. Repite con MOTOPREVIEW_CONFIRMAR_BASE_REMOTA=1 "
        "si de verdad quieres restablecer ahí la contraseña del Superadmin."
    )

with connection.cursor() as cursor:
    cursor.execute(
        """
        SELECT u.id_usuario, u.estado_usuario, u.email_verificado, u.password_hash,
               bool_or(r.es_superadmin) AS es_superadmin
        FROM usuario u
        LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
        LEFT JOIN rol r ON r.id_rol = ur.id_rol
        WHERE u.usu_email = %s
        GROUP BY u.id_usuario
        """,
        [USUARIO_EMAIL],
    )
    fila = cursor.fetchone()
    if not fila:
        raise SystemExit(
            "No existe %s. créalo con scripts/sembrar_superadmin.py; no inserto "
            "una cuenta maestra desde un restablecimiento." % USUARIO_EMAIL
        )
    id_usuario, estado, verificado, hash_actual, es_superadmin = fila

    if not es_superadmin:
        print("AVISO: el usuario no tiene vigente el rol Superadmin; "
              "restablecer la contraseña no le devuelve el privilegio.")
    print("Cuenta: estado=%s, email_verificado=%s, superadmin=%s"
          % (estado, verificado, bool(es_superadmin)))

    if solo_verificar:
        raise SystemExit("SOLO_VERIFICAR=1: no se escribió nada.")

    nueva = obtener_password()
    error = validar_password(nueva)
    if error:
        raise SystemExit("Contraseña rechazada: %s" % error)
    if hash_actual and bcrypt.checkpw(nueva.encode("utf-8"), hash_actual.encode("utf-8")):
        print("La contraseña ya es esa; la base queda intacta.")
        raise SystemExit(0)

    with transaction.atomic():
        cursor.execute(
            "UPDATE usuario SET password_hash = %s WHERE id_usuario = %s",
            [hash_password(nueva), id_usuario],
        )
        print("Contraseña restablecida en %s fila(s)." % cursor.rowcount)

    # Comprobación con la misma función que usa el login, sin volver a leer la
    # contraseña: se verifica el hash recién escrito contra la nueva.
    cursor.execute("SELECT password_hash FROM usuario WHERE id_usuario = %s", [id_usuario])
    guardada = cursor.fetchone()[0]
    if not bcrypt.checkpw(nueva.encode("utf-8"), guardada.encode("utf-8")):
        raise SystemExit("El hash escrito no verifica con bcrypt: revisa el registro.")
    print("Verificado con bcrypt.checkpw (la ruta del login).")
    if estado == "bloqueado":
        print("AVISO: la cuenta está bloqueada; el login seguirá denegado hasta "
              "que se reactive desde la consola de Seguridad.")
