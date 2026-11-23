"""Migracion de esquema: marca + tipo_producto + M2M, y retiro de
categoria_accesorio / tipo_accesorio / accesorio_modelo_moto.

Idempotente: se puede correr varias veces.

Ejecutar: python manage.py shell -c "exec(open('scripts/migrar_esquema_producto.py', encoding='utf-8').read())"
"""
from django.db import connection

with connection.cursor() as c:
    # 1. Tabla marca (nueva, para marcas de producto)
    c.execute("""
        CREATE TABLE IF NOT EXISTS marca (
            id_marca UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre VARCHAR(100) NOT NULL,
            logo TEXT,
            activo BOOLEAN DEFAULT TRUE,
            creado_en TIMESTAMP DEFAULT NOW()
        )
    """)
    print("marca: OK")

    # 2. Tabla tipo_producto (con flag accesorio)
    c.execute("""
        CREATE TABLE IF NOT EXISTS tipo_producto (
            id_tipo_producto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre VARCHAR(100) NOT NULL,
            descripcion TEXT,
            accesorio BOOLEAN DEFAULT FALSE,
            activo BOOLEAN DEFAULT TRUE,
            creado_en TIMESTAMP DEFAULT NOW()
        )
    """)
    print("tipo_producto: OK")

    # 3. Tabla intermedia producto <-> tipo_producto (M2M)
    c.execute("""
        CREATE TABLE IF NOT EXISTS producto_tipo_producto (
            id_producto UUID NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
            id_tipo_producto UUID NOT NULL REFERENCES tipo_producto(id_tipo_producto) ON DELETE CASCADE,
            PRIMARY KEY (id_producto, id_tipo_producto)
        )
    """)
    print("producto_tipo_producto: OK")

    # 4. Agregar columna marca a producto (si no existe)
    c.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='producto' AND column_name='id_marca'
            ) THEN
                ALTER TABLE producto ADD COLUMN id_marca UUID REFERENCES marca(id_marca);
            END IF;
        END $$;
    """)
    print("producto.id_marca: OK")

    # 5. Retirar columnas viejas de producto (si existen)
    for col in ["id_tipo_accesorio", "id_categoria_accesorio"]:
        c.execute("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='producto' AND column_name='%s'
                ) THEN
                    ALTER TABLE producto DROP COLUMN %s;
                END IF;
            END $$;
        """ % (col, col))
    print("producto: columnas viejas retiradas")

    # 6. Eliminar tablas viejas
    c.execute("DROP TABLE IF EXISTS accesorio_modelo_moto CASCADE")
    c.execute("DROP TABLE IF EXISTS tipo_accesorio CASCADE")
    c.execute("DROP TABLE IF EXISTS categoria_accesorio CASCADE")
    print("tablas viejas eliminadas: accesorio_modelo_moto, tipo_accesorio, categoria_accesorio")

    # 7. Asegurar default
    c.execute("ALTER TABLE producto ALTER COLUMN accesorio SET DEFAULT FALSE")
    print("producto.accesorio default: OK")

print("Migracion de esquema completada.")
