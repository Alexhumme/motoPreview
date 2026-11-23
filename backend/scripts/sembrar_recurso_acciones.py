"""Siembra (idempotente) de las combinaciones recurso-acción faltantes.

El catálogo debe tener TODAS las combinaciones recurso × acción para que
la matriz de permisos de /admin/permisos quede completa (15 × 6 = 90).
Las filas que faltaban hacían que esas celdas salieran vacías (con guion)
en la matriz.

Faltaban: exportar para categorias/compatibilidad/marcas/modelos/
modelos3d/motos/tipos, y crear/actualizar/eliminar para ventas.

Ejecutar:  python manage.py shell -c "exec(open('scripts/sembrar_recurso_acciones.py',
encoding='utf-8').read())"
"""
import uuid
from django.db import connection


def sembrar():
    with connection.cursor() as cursor:
        # Convención de las filas existentes (por si cambia en el futuro)
        cursor.execute(
            "SELECT requiere_scope, COUNT(*) FROM recurso_accion GROUP BY requiere_scope"
        )
        distribucion = dict(cursor.fetchall())
        requiere_scope = distribucion.get(True, 0) >= distribucion.get(False, 0)
        print("requiere_scope de las filas nuevas:", requiere_scope)

        cursor.execute(
            """
            SELECT rec.id_recurso, rec.codigo, a.id_accion, a.codigo
            FROM recurso rec
            CROSS JOIN accion a
            WHERE rec.activo IS TRUE AND a.activo IS TRUE
              AND NOT EXISTS (
                SELECT 1 FROM recurso_accion ra
                WHERE ra.id_recurso = rec.id_recurso AND ra.id_accion = a.id_accion
              )
            ORDER BY rec.codigo, a.codigo
            """
        )
        faltantes = cursor.fetchall()
        print(f"Combinaciones faltantes: {len(faltantes)}")

        for id_recurso, codigo_recurso, id_accion, codigo_accion in faltantes:
            cursor.execute(
                """
                INSERT INTO recurso_accion
                    (id_recurso_accion, descripcion, requiere_scope, activo,
                     id_accion, id_recurso)
                VALUES (%s, %s, %s, TRUE, %s, %s)
                """,
                [
                    str(uuid.uuid4()),
                    f"Permite {codigo_accion} sobre {codigo_recurso}",
                    requiere_scope,
                    id_accion,
                    id_recurso,
                ],
            )
            print(f"  + {codigo_recurso}:{codigo_accion}")

        cursor.execute("SELECT COUNT(*) FROM recurso_accion")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM recurso rec WHERE activo IS TRUE")
        recursos = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM accion WHERE activo IS TRUE")
        acciones = cursor.fetchone()[0]
        esperado = recursos * acciones
        estado = "COMPLETO" if total == esperado else "INCOMPLETO"
        print(f"Total recurso_accion: {total} (esperado {esperado}) -> {estado}")


sembrar()
