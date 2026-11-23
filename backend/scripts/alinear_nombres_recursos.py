"""Alinea el nombre de los recursos RBAC con el titulo de la vista y el item
del nav del panel de administracion.

Los recursos son la fuente de la matriz de permisos: su `nombre` es lo que se
muestra en la consola de Seguridad. Para que la matriz sea legible, ese nombre
debe coincidir con lo que el usuario ve en el menu y en el titulo de la vista.

Solo se actualizan los recursos cuyo nombre actual difiere del nombre de vista.
Es idempotente.

Ejecutar: python manage.py shell -c "exec(open('scripts/alinear_nombres_recursos.py', encoding='utf-8').read())"
"""
from django.db import connection

# codigo del recurso -> nombre que se ve en el nav / titulo de la vista
ALINEACION = {
    "productos": "Accesorios",
    "roles": "Seguridad",
}

with connection.cursor() as cursor:
    for codigo, nombre_nuevo in ALINEACION.items():
        cursor.execute(
            "SELECT id_recurso, nombre FROM recurso WHERE codigo = %s", [codigo]
        )
        fila = cursor.fetchone()
        if not fila:
            print("No existe recurso con codigo", codigo)
            continue
        id_recurso, nombre_actual = fila
        if nombre_actual == nombre_nuevo:
            print("%s: ya alineado (%s)" % (codigo, nombre_actual))
            continue
        cursor.execute(
            "UPDATE recurso SET nombre = %s WHERE codigo = %s",
            [nombre_nuevo, codigo],
        )
        print("%s: '%s' -> '%s'" % (codigo, nombre_actual, nombre_nuevo))
