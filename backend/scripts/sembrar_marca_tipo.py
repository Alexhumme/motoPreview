"""Seed de marcas, tipos de producto y vinculacion producto<->tipo/marca.

Idempotente: usa ON CONFLICT / existence checks.

Ejecutar: python manage.py shell -c "exec(open('scripts/sembrar_marca_tipo.py', encoding='utf-8').read())"
"""
import uuid
from django.db import connection

MARCAS = ["Yamaha", "Honda", "AKT", "Ducati", "KTM", "Suzuki", "BMW", "Kawasaki", "Bajaj", "Royal Enfield", "Genérico"]

TIPOS = [
    ("Escape", "Sistemas de escape y silenciadores", True),
    ("Iluminación", "Faros, luces y señalización", True),
    ("Protección", "Crash bars, sliders y protectores", True),
    ("Estética", "Piezas visuales y decorativas", True),
    ("Electrónica", "Gadgets y accesorios eléctricos", True),
    ("Rendimiento", "Mejoras de motor y transmisión", True),
    ("Comodidad", "Asientos y ergonomía", True),
    ("Equipaje", "Maletas y soportes de carga", True),
    ("Seguridad", "Antirrobos y bloqueos", True),
    ("Producto general", "Producto no accesorio", False),
]

with connection.cursor() as c:
    # 1. Marcas
    marca_ids = []
    for nombre in MARCAS:
        c.execute("SELECT id_marca FROM marca WHERE nombre = %s", [nombre])
        row = c.fetchone()
        if row:
            marca_ids.append(row[0])
        else:
            mid = str(uuid.uuid4())
            c.execute("INSERT INTO marca (id_marca, nombre, activo) VALUES (%s, %s, TRUE)", [mid, nombre])
            marca_ids.append(mid)
    print("Marcas:", len(marca_ids))

    # 2. Tipos
    tipo_ids = []
    tipo_accesorio_ids = []
    for nombre, desc, es_acc in TIPOS:
        c.execute("SELECT id_tipo_producto FROM tipo_producto WHERE nombre = %s", [nombre])
        row = c.fetchone()
        if row:
            tid = row[0]
        else:
            tid = str(uuid.uuid4())
            c.execute(
                "INSERT INTO tipo_producto (id_tipo_producto, nombre, descripcion, accesorio, activo) VALUES (%s, %s, %s, %s, TRUE)",
                [tid, nombre, desc, es_acc],
            )
        tipo_ids.append(tid)
        if es_acc:
            tipo_accesorio_ids.append(tid)
    print("Tipos:", len(tipo_ids), "accesorios:", len(tipo_accesorio_ids))

    # 3. Vincular productos a marca y tipos
    c.execute("SELECT id_producto FROM producto ORDER BY id_producto")
    productos = [r[0] for r in c.fetchall()]
    n = 0
    for i, pid in enumerate(productos):
        mid = marca_ids[i % len(marca_ids)]
        c.execute("UPDATE producto SET id_marca = %s WHERE id_producto = %s", [mid, pid])
        # asignar 1-2 tipos (deterministico por indice)
        t1 = tipo_ids[i % len(tipo_ids)]
        t2 = tipo_ids[(i * 3 + 7) % len(tipo_ids)]
        for tid in {t1, t2}:
            c.execute(
                "INSERT INTO producto_tipo_producto (id_producto, id_tipo_producto) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                [pid, tid],
            )
            n += c.rowcount
    print("Productos actualizados:", len(productos), "vinculos tipo insertados:", n)
    print("Seed completado.")
