"""Siembra (idempotente) del rol y usuario Superadmin.

- Rol 'Superadmin' con id fijo 00000000-0000-0000-0000-000000000000 y
  es_superadmin=TRUE (el backend exige ese rol para la matriz de permisos).
- Usuario 'superadmin@motopreview.com' con email verificado, sin tienda
  (alcance global) y su fila en usuario_rol.

Ejecutar:  python manage.py shell -c "exec(open('scripts/sembrar_superadmin.py',
encoding='utf-8').read())"

La contraseña no se escribe en el repo: se toma de
MOTOPREVIEW_SUPERADMIN_PASSWORD o la pide la consola. Si el usuario ya existe se
respeta su contraseña, porque reescribirla desde un script es una puerta abierta.
"""
import os
from getpass import getpass

import bcrypt
from django.db import connection
from django.utils import timezone

from api.services import validar_password

ROL_SUPERADMIN = "00000000-0000-0000-0000-000000000000"
USUARIO_EMAIL = os.environ.get("MOTOPREVIEW_SUPERADMIN_EMAIL", "superadmin@motopreview.com")


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def obtener_password():
    password = os.environ.get("MOTOPREVIEW_SUPERADMIN_PASSWORD")
    if not password:
        password = getpass("Contraseña para %s: " % USUARIO_EMAIL)
    error = validar_password(password)
    if error:
        raise SystemExit("Contraseña rechazada: %s" % error)
    return password


with connection.cursor() as cursor:
    # 1. Rol Superadmin
    cursor.execute(
        "INSERT INTO rol (id_rol, nombre_rol, activo, es_superadmin) "
        "VALUES (%s, 'Superadmin', TRUE, TRUE) ON CONFLICT (id_rol) DO NOTHING",
        [ROL_SUPERADMIN],
    )
    print("Rol Superadmin:", "insertado" if cursor.rowcount else "ya existía")

    # 2. Usuario superadmin (hash en Python, la BD no conoce bcrypt)
    cursor.execute("SELECT 1 FROM usuario WHERE usu_email = %s", [USUARIO_EMAIL])
    if cursor.fetchone():
        # Solo asegurar la verificación: la contraseña existente manda.
        cursor.execute(
            "UPDATE usuario SET email_verificado = TRUE WHERE usu_email = %s",
            [USUARIO_EMAIL],
        )
        print("Usuario superadmin: ya existía (contraseña intacta)")
    else:
        cursor.execute(
            """
            INSERT INTO usuario (usu_nombre, usu_email, password_hash, email_verificado)
            VALUES ('Superadmin', %s, %s, TRUE)
            ON CONFLICT (usu_email) DO NOTHING
            """,
            [USUARIO_EMAIL, hash_password(obtener_password())],
        )
        print("Usuario superadmin: insertado")

    cursor.execute("SELECT id_usuario FROM usuario WHERE usu_email = %s", [USUARIO_EMAIL])
    id_usuario = cursor.fetchone()[0]

    # 3. Relación usuario_rol
    cursor.execute(
        "INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (%s, %s) ON CONFLICT DO NOTHING",
        [id_usuario, ROL_SUPERADMIN],
    )
    print("usuario_rol:", "insertado" if cursor.rowcount else "ya existía")

    # Resumen
    cursor.execute("SELECT nombre_rol, es_superadmin FROM rol WHERE id_rol = %s", [ROL_SUPERADMIN])
    print("Verificación rol:", cursor.fetchone())
    print("Ejecutado:", timezone.now().isoformat())
