"""Da nombres reales a los 4 accesorios seed (idempotente).

Antes se llamaban 'Accesorio (seed) ...' y salian asi en el catalogo y en el
Configurador. Este script les pone nombre, descripcion y precio de un producto
real por categoria. Solo actualiza si el nombre sigue conteniendo 'seed', asi
que es seguro volver a correrlo.

Ejecutar: python manage.py shell -c "exec(open('scripts/nombrar_accesorios_seed.py', encoding='utf-8').read())"
"""
from django.db import connection

NOMBRES = {
    "99999999-0000-0000-0000-000000000001": ("Escape Akrapovic Racing Line (titanio)", "Escape de alto rendimiento en titanio, sonido deportivo y reduccion de peso.", 1850000.00),
    "99999999-0000-0000-0000-000000000002": ("Faro LED auxiliar 60W (par)", "Par de faros LED auxiliares de 60W con soporte universal y cableado.", 320000.00),
    "99999999-0000-0000-0000-000000000003": ("Protector de motor tubular (crash bar)", "Crash bar tubular de acero para proteccion del motor en caidas.", 480000.00),
    "99999999-0000-0000-0000-000000000004": ("Sliders de carenado (set)", "Set de sliders de carenado en nylon reforzado para proteccion lateral.", 195000.00),
}

with connection.cursor() as cursor:
    for pid, (nombre, desc, precio) in NOMBRES.items():
        cursor.execute(
            "SELECT nombre FROM producto WHERE id_producto = %s", [pid]
        )
        fila = cursor.fetchone()
        if not fila:
            print("No existe producto", pid)
            continue
        if "seed" not in (fila[0] or "").lower():
            print("Ya renombrado:", fila[0], "-> se omite")
            continue
        cursor.execute(
            """
            UPDATE producto
            SET nombre = %s, descripcion = %s, precio = %s
            WHERE id_producto = %s
            """,
            [nombre, desc, precio, pid],
        )
        print("Renombrado:", nombre)
