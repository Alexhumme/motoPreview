-- El esquema original usa estos enums, pero el archivo exportado no incluye
-- sus definiciones. Ejecutar este archivo una vez antes de original_schema.sql.
DO $$
BEGIN
    CREATE TYPE cotizacion_estado_enum AS ENUM ('pendiente', 'aprobada', 'rechazada', 'completada');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE inventario_estado_enum AS ENUM ('normal', 'bajo', 'agotado');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE plan_estado_enum AS ENUM ('activo', 'inactivo', 'suspendido');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE tienda_estado_enum AS ENUM ('activa', 'inactiva', 'suspendida');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE usuario_estado_enum AS ENUM ('activo', 'inactivo', 'bloqueado');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
