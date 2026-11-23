"""Migración del esquema legacy al esquema unificado (modelos actuales).

Transforma la base REAL (managed=False) para que coincida con models.py:

1. producto: agrega id_categoria_accesorio y marca los accesorios
   (accesorio=TRUE, peso, tipo, categoría) desde la tabla legacy accesorio.
2. Crea los 4 productos "seed" que no tenían fila en producto
   (los accesorios 99999999-* con id_producto NULL).
3. accesorio_modelo_moto / detalle_cotizacion / configuracion_detalle:
   id_accesorio -> id_categoria_accesorio (remapeando el valor al id de la
   categoría del accesorio) y la FK ahora apunta a categoria_accesorio.
4. modelo_3d: la columna se llama igual (id_accesorio) pero pasa a
   referenciar categoria_accesorio (así lo declara Model3D.accesorio).
5. inventario: completa id_producto desde la tabla legacy accesorio
   (los seed apuntan al producto recién creado con el mismo UUID).

Toda la migración corre en UNA transacción: si algo falla, no cambia nada.
"""
from django.db import connection

PASOS = [
    # 1. producto: columna nueva + backfill desde accesorio
    """
    ALTER TABLE producto ADD COLUMN IF NOT EXISTS id_categoria_accesorio uuid
    """,
    """
    UPDATE producto p
    SET accesorio = TRUE,
        peso = a.peso,
        id_tipo_accesorio = a.id_tipo,
        id_categoria_accesorio = a.id_categoria
    FROM accesorio a
    WHERE p.id_producto = a.id_producto
    """,
    # 2. productos seed para accesorios sin fila en producto
    """
    INSERT INTO producto
        (id_producto, nombre, descripcion, estado, precio, accesorio, peso,
         id_tipo_accesorio, id_categoria_accesorio, codigo_sku)
    SELECT a.id_accesorio,
           'Accesorio (seed) ' || initcap(c.cat_nombre),
           'Producto de semilla migrado desde el esquema legacy.',
           'disponible',
           COALESCE(d.total_precio, 0),
           TRUE,
           a.peso,
           a.id_tipo,
           a.id_categoria,
           'SEED-' || a.id_accesorio::text
    FROM accesorio a
    JOIN categoria_accesorio c ON c.id_categoria = a.id_categoria
    LEFT JOIN (
        SELECT id_accesorio, MAX(precio_unitario) AS total_precio
        FROM detalle_cotizacion
        GROUP BY id_accesorio
    ) d ON d.id_accesorio = a.id_accesorio
    WHERE a.id_producto IS NULL
      AND NOT EXISTS (SELECT 1 FROM producto p WHERE p.id_producto = a.id_accesorio)
    """,
    # 3. FK de producto hacia categoria_accesorio
    """
    ALTER TABLE producto
      DROP CONSTRAINT IF EXISTS producto_id_categoria_accesorio_fkey,
      ADD CONSTRAINT producto_id_categoria_accesorio_fkey
      FOREIGN KEY (id_categoria_accesorio) REFERENCES categoria_accesorio(id_categoria)
    """,
    # 4. accesorio_modelo_moto: remapear a categoría + renombrar + FK nueva
    """
    ALTER TABLE accesorio_modelo_moto
      DROP CONSTRAINT IF EXISTS accesorio_modelo_moto_id_accesorio_fkey
    """,
    """
    UPDATE accesorio_modelo_moto c
    SET id_accesorio = a.id_categoria
    FROM accesorio a
    WHERE c.id_accesorio = a.id_accesorio
    """,
    """
    ALTER TABLE accesorio_modelo_moto
      RENAME COLUMN id_accesorio TO id_categoria_accesorio
    """,
    """
    ALTER TABLE accesorio_modelo_moto
      ADD CONSTRAINT accesorio_modelo_moto_categoria_fkey
      FOREIGN KEY (id_categoria_accesorio) REFERENCES categoria_accesorio(id_categoria),
      ADD CONSTRAINT accesorio_modelo_moto_categoria_modelo_key
      UNIQUE (id_categoria_accesorio, id_modelo_moto)
    """,
    # 5. detalle_cotizacion: id_accesorio -> id_categoria_accesorio
    """
    ALTER TABLE detalle_cotizacion
      DROP CONSTRAINT IF EXISTS detalle_cotizacion_id_accesorio_fkey
    """,
    """
    UPDATE detalle_cotizacion d
    SET id_accesorio = a.id_categoria
    FROM accesorio a
    WHERE d.id_accesorio = a.id_accesorio
    """,
    """
    ALTER TABLE detalle_cotizacion
      RENAME COLUMN id_accesorio TO id_categoria_accesorio
    """,
    """
    ALTER TABLE detalle_cotizacion
      ADD CONSTRAINT detalle_cotizacion_categoria_fkey
      FOREIGN KEY (id_categoria_accesorio) REFERENCES categoria_accesorio(id_categoria)
    """,
    # 6. configuracion_detalle: igual (0 filas)
    """
    ALTER TABLE configuracion_detalle
      DROP CONSTRAINT IF EXISTS configuracion_detalle_id_accesorio_fkey
    """,
    """
    ALTER TABLE configuracion_detalle
      RENAME COLUMN id_accesorio TO id_categoria_accesorio
    """,
    """
    ALTER TABLE configuracion_detalle
      ADD CONSTRAINT configuracion_detalle_categoria_fkey
      FOREIGN KEY (id_categoria_accesorio) REFERENCES categoria_accesorio(id_categoria)
    """,
    # 7. modelo_3d: la columna se conserva, pero referencia categorías
    """
    ALTER TABLE modelo_3d
      DROP CONSTRAINT IF EXISTS modelo_3d_id_accesorio_fkey
    """,
    """
    UPDATE modelo_3d m
    SET id_accesorio = a.id_categoria
    FROM accesorio a
    WHERE m.id_accesorio = a.id_accesorio
    """,
    """
    ALTER TABLE modelo_3d
      ADD CONSTRAINT modelo_3d_categoria_fkey
      FOREIGN KEY (id_accesorio) REFERENCES categoria_accesorio(id_categoria)
    """,
    # 8. inventario: completar id_producto (seed -> producto con mismo UUID)
    """
    UPDATE inventario i
    SET id_producto = COALESCE(a.id_producto, a.id_accesorio)
    FROM accesorio a
    WHERE i.id_accesorio = a.id_accesorio
      AND i.id_producto IS NULL
    """,
]

with connection.cursor() as cursor:
    try:
        cursor.execute("BEGIN")
        for indice, sql in enumerate(PASOS, 1):
            cursor.execute(sql)
            filas = cursor.rowcount if sql.strip().upper().startswith(("UPDATE", "INSERT")) else None
            print(f"Paso {indice:02d} OK" + (f" ({filas} filas)" if filas is not None else ""))
        cursor.execute("COMMIT")
        print("\nMIGRACIÓN COMPLETADA")

        # Resumen post-migración
        cursor.execute("SELECT COUNT(*) FROM producto WHERE accesorio IS TRUE")
        print("Productos marcados como accesorio:", cursor.fetchone()[0])
        cursor.execute("SELECT COUNT(*) FROM inventario WHERE id_producto IS NOT NULL")
        print("Inventarios con producto:", cursor.fetchone()[0])
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name='accesorio_modelo_moto' ORDER BY ordinal_position"
        )
        print("accesorio_modelo_moto columnas:", [f[0] for f in cursor.fetchall()])
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name='detalle_cotizacion' ORDER BY ordinal_position"
        )
        print("detalle_cotizacion columnas:", [f[0] for f in cursor.fetchall()])
    except Exception as error:
        cursor.execute("ROLLBACK")
        print("ERROR, ROLLBACK:", error)
        raise
