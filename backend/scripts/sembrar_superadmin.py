"""Siembra (idempotente) del rol y usuario Superadmin.

- Rol 'Superadmin' con id fijo 00000000-0000-0000-0000-000000000000 y
  es_superadmin=TRUE (el backend exige ese rol para la matriz de permisos).
- Usuario demo 'superadmin@motopreview.com' con email verificado, sin tienda
  (alcance global) y su fila en usuario_rol.

Ejecutar:  python manage.py shell -c "exec(open('scripts/sembrar_superadmin.py',
encoding='utf-8').read())"

Contraseña inicial: SuperAdmin#2026  (cambiarla tras el primer login).
"""
import bcrypt
from django.db import connection
from django.utils import timezone

ROL_SUPERADMIN = "00000000-0000-0000-0000-000000000000"
USUARIO_EMAIL = "superadmin@motopreview.com"
USUARIO_PASSWORD = "SuperAdmin#2026"


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


with connection.cursor() as cursor:
    # 1. Rol Superadmin
    cursor.execute(
        "INSERT INTO rol (id_rol, nombre_rol, activo, es_superadmin) "
        "VALUES (%s, 'Superadmin', TRUE, TRUE) ON CONFLICT (id_rol) DO NOTHING",
        [ROL_SUPERADMIN],
    )
    print("Rol Superadmin:", "insertado" if cursor.rowcount else "ya existía")

    # 2. Usuario superadmin (hash en Python, la BD no conoce bcrypt)
    hash_nuevo = hash_password(USUARIO_PASSWORD)
    cursor.execute(
        """
        INSERT INTO usuario (usu_nombre, usu_email, password_hash, email_verificado)
        VALUES ('Superadmin', %s, %s, TRUE)
        ON CONFLICT (usu_email) DO NOTHING
        """,
        [USUARIO_EMAIL, hash_nuevo],
    )
    if cursor.rowcount:
        print("Usuario superadmin: insertado")
    else:
        # Ya existe: solo asegurar verificación y refrescar la contraseña demo
        cursor.execute(
            "UPDATE usuario SET email_verificado = TRUE, password_hash = %s "
            "WHERE usu_email = %s",
            [hash_nuevo, USUARIO_EMAIL],
        )
        print("Usuario superadmin: ya existía (contraseña restablecida a la demo)")

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
