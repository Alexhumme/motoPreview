"""Siembra (idempotente) de compatibilidades accesorio <-> modelo de moto.

El Configurador mostraba "No hay accesorios compatibles" porque la tabla
accesorio_modelo_moto estaba vacia. Aqui se vincula cada modelo de moto
con todas las categorias de accesorio, de modo que el Configurador siempre
tenga piezas que mostrar (el frontend filtra por categoria).

Ejecutar: python manage.py shell -c "exec(open('scripts/sembrar_compatibilidades.py', encoding='utf-8').read())"
"""
from django.db import connection

with connection.cursor() as cursor:
    cursor.execute(
        """
        INSERT INTO accesorio_modelo_moto (id_compatibilidad, id_categoria_accesorio, id_modelo_moto, anio_desde, anio_hasta)
        SELECT gen_random_uuid(), c.id_categoria, m.id_modelo_moto, NULL, NULL
        FROM categoria_accesorio c
        CROSS JOIN modelo_moto m
        ON CONFLICT (id_categoria_accesorio, id_modelo_moto) DO NOTHING
        """
    )
    print("Compatibilidades insertadas:", cursor.rowcount)

    cursor.execute("SELECT COUNT(*) FROM accesorio_modelo_moto")
    print("Total en tabla:", cursor.fetchone()[0])
