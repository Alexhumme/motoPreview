"""Siembra (idempotente) de TODOS los permisos para el rol Superadmin.

El Superadmin tiene bypass total en el backend (IsSuperAdmin no consulta
la matriz), pero su rol no tenia filas en rol_recurso, por lo que la
matriz de /admin/permisos lo mostraba vacio. Se le otorgan todas las
combinaciones activas con scope 'global' para que la matriz lo refleje.

Ejecutar:  python manage.py shell -c "exec(open('scripts/sembrar_permisos_superadmin.py',
encoding='utf-8').read())"
"""
from django.db import connection

ROL_SUPERADMIN = "00000000-0000-0000-0000-000000000000"

with connection.cursor() as cursor:
    # Asegurar que el rol existe (por si se ejecuta en una base nueva)
    cursor.execute("SELECT COUNT(*) FROM rol WHERE id_rol = %s", [ROL_SUPERADMIN])
    if not cursor.fetchone()[0]:
        cursor.execute(
            "INSERT INTO rol (id_rol, nombre_rol, activo, es_superadmin) "
            "VALUES (%s, 'Superadmin', TRUE, TRUE)",
            [ROL_SUPERADMIN],
        )
        print("Rol Superadmin: creado")

    # Otorgar todas las combinaciones activas que le falten
    cursor.execute(
        """
        INSERT INTO rol_recurso (id_rol_recurso, scope, activo, id_recurso_accion, id_rol)
        SELECT gen_random_uuid(), 'global', TRUE, ra.id_recurso_accion, %s
        FROM recurso_accion ra
        WHERE ra.activo IS TRUE
          AND NOT EXISTS (
            SELECT 1 FROM rol_recurso rr
            WHERE rr.id_rol = %s AND rr.id_recurso_accion = ra.id_recurso_accion
          )
        """,
        [ROL_SUPERADMIN, ROL_SUPERADMIN],
    )
    print("Permisos otorgados ahora:", cursor.rowcount)

    cursor.execute(
        "SELECT COUNT(*) FROM rol_recurso WHERE id_rol = %s AND activo IS TRUE",
        [ROL_SUPERADMIN],
    )
    total = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM recurso_accion WHERE activo IS TRUE")
    esperado = cursor.fetchone()[0]
    estado = "COMPLETO" if total == esperado else "INCOMPLETO"
    print(f"Permisos del Superadmin: {total} de {esperado} -> {estado}")
