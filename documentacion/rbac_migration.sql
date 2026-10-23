-- ============================================================================
-- MOTO PREVIEW - RBAC IMPLEMENTATION
-- Script SQL para PostgreSQL (Neon) - Migración de permisos granulares
-- ============================================================================
-- Ejecutar en orden: 1) DDL, 2) Seeds, 3) Migración de datos existentes
-- ============================================================================

-- ============================================================================
-- 1. DDL - NUEVAS TABLAS RBAC
-- ============================================================================

-- Tabla de recursos (catálogo de recursos protegidos)
CREATE TABLE IF NOT EXISTS recurso (
    id_recurso UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE,           -- ej: 'productos', 'usuarios', 'ventas'
    nombre VARCHAR(100) NOT NULL,                 -- ej: 'Productos', 'Usuarios', 'Ventas'
    descripcion TEXT,
    endpoint_base VARCHAR(100),                   -- ej: '/api/productos'
    icono VARCHAR(50),                            -- para UI (lucide icons, etc.)
    orden INTEGER DEFAULT 0,                      -- orden en menús/admin
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT now(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de acciones (catálogo de acciones posibles)
CREATE TABLE IF NOT EXISTS accion (
    id_accion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(30) NOT NULL UNIQUE,           -- ej: 'crear', 'leer', 'actualizar', 'eliminar', 'listar', 'exportar'
    nombre VARCHAR(50) NOT NULL,                  -- ej: 'Crear', 'Leer', 'Actualizar'
    descripcion TEXT,
    metodo_http VARCHAR(10),                      -- GET, POST, PUT, PATCH, DELETE
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla de combinaciones recurso-acción (matriz de permisos posibles)
CREATE TABLE IF NOT EXISTS recurso_accion (
    id_recurso_accion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_recurso UUID NOT NULL REFERENCES recurso(id_recurso) ON DELETE CASCADE,
    id_accion UUID NOT NULL REFERENCES accion(id_accion) ON DELETE CASCADE,
    descripcion TEXT,                             -- ej: 'Permite crear nuevos productos'
    requiere_scope BOOLEAN DEFAULT TRUE,          -- si FALSE, solo scope 'global'
    activo BOOLEAN DEFAULT TRUE,
    UNIQUE (id_recurso, id_accion)
);

-- Tabla de asignación rol-recurso-acción (permisos efectivos)
CREATE TABLE IF NOT EXISTS rol_recurso (
    id_rol_recurso UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_rol UUID NOT NULL REFERENCES rol(id_rol) ON DELETE CASCADE,
    id_recurso_accion UUID NOT NULL REFERENCES recurso_accion(id_recurso_accion) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'tienda', 'propio')),
    id_concedido_por UUID REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    concedido_en TIMESTAMP WITH TIME ZONE DEFAULT now(),
    activo BOOLEAN DEFAULT TRUE,
    UNIQUE (id_rol, id_recurso_accion, scope)
);

-- Agregar columna activo a tabla rol existente (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rol' AND column_name = 'activo'
    ) THEN
        ALTER TABLE rol ADD COLUMN activo BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_recurso_codigo ON recurso(codigo);
CREATE INDEX IF NOT EXISTS idx_accion_codigo ON accion(codigo);
CREATE INDEX IF NOT EXISTS idx_recurso_accion_recurso ON recurso_accion(id_recurso);
CREATE INDEX IF NOT EXISTS idx_recurso_accion_accion ON recurso_accion(id_accion);
CREATE INDEX IF NOT EXISTS idx_rol_recurso_rol ON rol_recurso(id_rol);
CREATE INDEX IF NOT EXISTS idx_rol_recurso_recurso_accion ON rol_recurso(id_recurso_accion);
CREATE INDEX IF NOT EXISTS idx_rol_recurso_scope ON rol_recurso(scope);

-- Trigger para updated_at en recurso
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_recurso_updated_at ON recurso;
CREATE TRIGGER update_recurso_updated_at
    BEFORE UPDATE ON recurso
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. SEEDS - CATÁLOGOS BASE
-- ============================================================================

-- Acciones base
INSERT INTO accion (codigo, nombre, descripcion, metodo_http, orden) VALUES
('crear',      'Crear',      'Crear nuevo registro',        'POST',   1),
('leer',       'Leer',       'Ver detalle de un registro',  'GET',    2),
('actualizar', 'Actualizar', 'Modificar registro existente', 'PUT,PATCH', 3),
('eliminar',   'Eliminar',   'Borrar registro',             'DELETE', 4),
('listar',     'Listar',     'Ver listado paginado',        'GET',    5),
('exportar',   'Exportar',   'Descargar datos (CSV/Excel)', 'GET',    6)
ON CONFLICT (codigo) DO NOTHING;

-- Recursos base (ordenados por dominio)
INSERT INTO recurso (codigo, nombre, descripcion, endpoint_base, icono, orden) VALUES
('productos',        'Productos',         'Catálogo de productos y accesorios',      '/api/productos',        'package',      10),
('categorias',       'Categorías',        'Categorías de productos',                 '/api/categorias',       'folder',     20),
('tipos',            'Tipos',             'Tipos de accesorios',                     '/api/tipos',            'tag',        30),
('inventario',       'Inventario',        'Stock y movimientos de inventario',       '/api/inventario',       'warehouse',  40),
('cotizaciones',     'Cotizaciones',      'Gestión de cotizaciones',                 '/api/cotizaciones',     'file-text',  50),
('ventas',           'Ventas',            'Reportes y análisis de ventas',           '/api/ventas',           'bar-chart',  60),
('usuarios',         'Usuarios',          'Gestión de usuarios y roles',             '/api/usuarios',         'users',      70),
('roles',            'Roles',             'Definición de roles y permisos',          '/api/roles',            'shield',     80),
('tiendas',          'Tiendas',           'Gestión de tiendas y planes',             '/api/tiendas',          'store',      90),
('configuraciones',  'Configuraciones',   'Configuraciones de moto personalizadas',  '/api/configuraciones',  'settings',   100),
('marcas',           'Marcas',            'Marcas de motocicletas',                  '/api/marcas',           'trademark',  110),
('modelos',          'Modelos',           'Modelos de motocicletas',                 '/api/modelos-moto',     'bike',       120),
('motos',            'Motos',             'Motocicletas (año/versión)',              '/api/motos',            'motorcycle', 130),
('compatibilidad',   'Compatibilidad',    'Compatibilidad accesorios-motos',         '/api/compatibilidad',   'link',       140),
('modelos3d',        'Modelos 3D',        'Modelos 3D de accesorios',                '/api/modelos-3d',       'cube',       150)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 3. RECURSO-ACCIÓN - MATRIZ DE PERMISOS POSIBLES
-- ============================================================================

-- Helper: poblar todas las combinaciones recurso-acción para recursos base
-- Solo acciones que tengan sentido por recurso
DO $$
DECLARE
    v_recurso RECORD;
    v_accion RECORD;
BEGIN
    -- Para cada recurso activo, crear combinaciones con acciones relevantes
    FOR v_recurso IN SELECT id_recurso, codigo, nombre FROM recurso WHERE activo LOOP
        FOR v_accion IN SELECT id_accion, codigo, nombre FROM accion WHERE activo LOOP
            -- Lógica de qué acciones aplican a cada recurso
            IF v_recurso.codigo IN ('categorias', 'tipos', 'marcas', 'modelos', 'motos', 'tipos') THEN
                -- Catálogos simples: CRUD completo + listar
                IF v_accion.codigo IN ('crear', 'leer', 'actualizar', 'eliminar', 'listar') THEN
                    INSERT INTO recurso_accion (id_recurso, id_accion, descripcion)
                    VALUES (v_recurso.id_recurso, v_accion.id_accion,
                        'Permite ' || v_accion.nombre || ' en ' || v_recurso.nombre)
                    ON CONFLICT (id_recurso, id_accion) DO NOTHING;
                END IF;
            ELSIF v_recurso.codigo IN ('productos', 'inventario', 'cotizaciones', 'configuraciones') THEN
                -- Recursos complejos: todas las acciones
                INSERT INTO recurso_accion (id_recurso, id_accion, descripcion)
                VALUES (v_recurso.id_recurso, v_accion.id_accion,
                    'Permite ' || v_accion.nombre || ' en ' || v_recurso.nombre)
                ON CONFLICT (id_recurso, id_accion) DO NOTHING;
            ELSIF v_recurso.codigo IN ('usuarios', 'roles', 'tiendas') THEN
                -- Administración: CRUD + exportar
                IF v_accion.codigo IN ('crear', 'leer', 'actualizar', 'eliminar', 'listar', 'exportar') THEN
                    INSERT INTO recurso_accion (id_recurso, id_accion, descripcion)
                    VALUES (v_recurso.id_recurso, v_accion.id_accion,
                        'Permite ' || v_accion.nombre || ' en ' || v_recurso.nombre)
                    ON CONFLICT (id_recurso, id_accion) DO NOTHING;
                END IF;
            ELSIF v_recurso.codigo IN ('ventas') THEN
                -- Ventas: solo lectura/exportación
                IF v_accion.codigo IN ('leer', 'listar', 'exportar') THEN
                    INSERT INTO recurso_accion (id_recurso, id_accion, descripcion)
                    VALUES (v_recurso.id_recurso, v_accion.id_accion,
                        'Permite ' || v_accion.nombre || ' en ' || v_recurso.nombre)
                    ON CONFLICT (id_recurso, id_accion) DO NOTHING;
                END IF;
            ELSIF v_recurso.codigo IN ('categorias', 'tipos', 'marcas', 'modelos', 'motos', 'compatibilidad', 'modelos3d') THEN
                -- Otros catálogos: CRUD + listar
                IF v_accion.codigo IN ('crear', 'leer', 'actualizar', 'eliminar', 'listar') THEN
                    INSERT INTO recurso_accion (id_recurso, id_accion, descripcion)
                    VALUES (v_recurso.id_recurso, v_accion.id_accion,
                        'Permite ' || v_accion.nombre || ' en ' || v_recurso.nombre)
                    ON CONFLICT (id_recurso, id_accion) DO NOTHING;
                END IF;
            ELSE
                -- Default: CRUD + listar
                IF v_accion.codigo IN ('crear', 'leer', 'actualizar', 'eliminar', 'listar') THEN
                    INSERT INTO recurso_accion (id_recurso, id_accion, descripcion)
                    VALUES (v_recurso.id_recurso, v_accion.id_accion,
                        'Permite ' || v_accion.nombre || ' en ' || v_recurso.nombre)
                    ON CONFLICT (id_recurso, id_accion) DO NOTHING;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- 4. PERMISOS POR DEFECTO (SEEDS ROL_RECURSO)
-- ============================================================================

-- Admin: todos los recursos con todas las acciones (scope global)
INSERT INTO rol_recurso (id_rol, id_recurso_accion, scope)
SELECT 
    '11111111-0000-0000-0000-000000000001'::UUID,
    ra.id_recurso_accion,
    'global'
FROM recurso_accion ra
JOIN recurso r ON ra.id_recurso = r.id_recurso
WHERE r.activo
ON CONFLICT (id_rol, id_recurso_accion, scope) DO NOTHING;

-- Vendedor: permisos por tienda
DO $$
DECLARE
    v_rol_vendedor UUID := '11111111-0000-0000-0000-000000000002'::UUID;
BEGIN
    -- Productos: crear, leer, actualizar, listar (scope tienda)
    INSERT INTO rol_recurso (id_rol, id_recurso_accion, scope)
    SELECT v_rol_vendedor, ra.id_recurso_accion, 'tienda'
    FROM recurso_accion ra
    JOIN recurso r ON ra.id_recurso = r.id_recurso
    JOIN accion a ON ra.id_accion = a.id_accion
    WHERE r.codigo IN ('productos', 'categorias', 'tipos')
      AND a.codigo IN ('crear', 'leer', 'actualizar', 'listar')
    ON CONFLICT (id_rol, id_recurso_accion, scope) DO NOTHING;

    -- Inventario y movimientos: CRUD + listar (scope tienda)
    INSERT INTO rol_recurso (id_rol, id_recurso_accion, scope)
    SELECT v_rol_vendedor, ra.id_recurso_accion, 'tienda'
    FROM recurso_accion ra
    JOIN recurso r ON ra.id_recurso = r.id_recurso
    JOIN accion a ON ra.id_accion = a.id_accion
    WHERE r.codigo IN ('inventario', 'movimientos')
      AND a.codigo IN ('crear', 'leer', 'actualizar', 'listar')
    ON CONFLICT (id_rol, id_recurso_accion, scope) DO NOTHING;

    -- Cotizaciones: CRUD + listar (scope tienda)
    INSERT INTO rol_recurso (id_rol, id_recurso_accion, scope)
    SELECT v_rol_vendedor, ra.id_recurso_accion, 'tienda'
    FROM recurso_accion ra
    JOIN recurso r ON ra.id_recurso = r.id_recurso
    JOIN accion a ON ra.id_accion = a.id_accion
    WHERE r.codigo = 'cotizaciones'
      AND a.codigo IN ('crear', 'leer', 'actualizar', 'listar')
    ON CONFLICT (id_rol, id_recurso_accion, scope) DO NOTHING;

    -- Usuarios: leer, listar (scope tienda)
    INSERT INTO rol_recurso (id_rol, id_recurso_accion, scope)
    SELECT v_rol_vendedor, ra.id_recurso_accion, 'tienda'
    FROM recurso_accion ra
    JOIN recurso r ON ra.id_recurso = r.id_recurso
    JOIN accion a ON ra.id_accion = a.id_accion
    WHERE r.codigo = 'usuarios'
      AND a.codigo IN ('leer', 'listar')
    ON CONFLICT (id_rol, id_recurso_accion, scope) DO NOTHING;

    -- Ventas: leer, listar, exportar (scope tienda)
    INSERT INTO rol_recurso (id_rol, id_recurso_accion, scope)
    SELECT v_rol_vendedor, ra.id_recurso_accion, 'tienda'
    FROM recurso_accion ra
    JOIN recurso r ON ra.id_recurso = r.id_recurso
    JOIN accion a ON ra.id_accion = a.id_accion
    WHERE r.codigo = 'ventas'
      AND a.codigo IN ('leer', 'listar', 'exportar')
    ON CONFLICT (id_rol, id_recurso_accion, scope) DO NOTHING;

    -- Configuraciones: leer, listar (scope tienda)
    INSERT INTO rol_recurso (id_rol, id_recurso_accion, scope)
    SELECT v_rol_vendedor, ra.id_recurso_accion, 'tienda'
    FROM recurso_accion ra
    JOIN recurso r ON ra.id_recurso = r.id_recurso
    JOIN accion a ON ra.id_accion = a.id_accion
    WHERE r.codigo = 'configuraciones'
      AND a.codigo IN ('leer', 'listar')
    ON CONFLICT (id_rol, id_recurso_accion, scope) DO NOTHING;

    -- Modelos 3D, compatibilidad, motos, marcas, modelos: leer, listar (global)
    INSERT INTO rol_recurso (id_rol, id_recurso_accion, scope)
    SELECT v_rol_vendedor, ra.id_recurso_accion, 'global'
    FROM recurso_accion ra
    JOIN recurso r ON ra.id_recurso = r.id_recurso
    JOIN accion a ON ra.id_accion = a.id_accion
    WHERE r.codigo IN ('marcas', 'modelos', 'motos', 'compatibilidad', 'modelos3d')
      AND a.codigo IN ('leer', 'listar')
    ON CONFLICT (id_rol, id_recurso_accion, scope) DO NOTHING;
END $$;

-- Cliente: permisos propios/global
DO $$
DECLARE
    v_rol_cliente UUID := '11111111-0000-0000-0000-000000000003'::UUID;
BEGIN
    -- Productos: leer, listar (global)
    INSERT INTO rol_recurso (id_rol, id_recurso_accion, scope)
    SELECT v_rol_cliente, ra.id_recurso_accion, 'global'
    FROM recurso_accion ra
    JOIN recurso r ON ra.id_recurso = r.id_recurso
    JOIN accion a ON ra.id_accion = a.id_accion
    WHERE r.codigo IN ('productos', 'categorias', 'tipos', 'marcas', 'modelos', 'motos', 'compatibilidad', 'modelos3d')
      AND a.codigo IN ('leer', 'listar')
    ON CONFLICT (id_rol, id_recurso_accion, scope) DO NOTHING;

    -- Cotizaciones: crear, leer, listar (scope propio)
    INSERT INTO rol_recurso (id_rol, id_recurso_accion, scope)
    SELECT v_rol_cliente, ra.id_recurso_accion, 'propio'
    FROM recurso_accion ra
    JOIN recurso r ON ra.id_recurso = r.id_recurso
    JOIN accion a ON ra.id_accion = a.id_accion
    WHERE r.codigo = 'cotizaciones'
      AND a.codigo IN ('crear', 'leer', 'listar')
    ON CONFLICT (id_rol, id_recurso_accion, scope) DO NOTHING;

    -- Configuraciones: CRUD (scope propio)
    INSERT INTO rol_recurso (id_rol, id_recurso_accion, scope)
    SELECT v_rol_cliente, ra.id_recurso_accion, 'propio'
    FROM recurso_accion ra
    JOIN recurso r ON ra.id_recurso = r.id_recurso
    JOIN accion a ON ra.id_accion = a.id_accion
    WHERE r.codigo = 'configuraciones'
      AND a.codigo IN ('crear', 'leer', 'actualizar', 'listar')
    ON CONFLICT (id_rol, id_recurso_accion, scope) DO NOTHING;

    -- Configuraciones, motos, compatibilidad, modelos3d: leer, listar (global)
    INSERT INTO rol_recurso (id_rol, id_recurso_accion, scope)
    SELECT v_rol_cliente, ra.id_recurso_accion, 'global'
    FROM recurso_accion ra
    JOIN recurso r ON ra.id_recurso = r.id_recurso
    JOIN accion a ON ra.id_accion = a.id_accion
    WHERE r.codigo IN ('motos', 'compatibilidad', 'modelos3d')
      AND a.codigo IN ('leer', 'listar')
    ON CONFLICT (id_rol, id_recurso_accion, scope) DO NOTHING;
END $$;

-- ============================================================================
-- 5. MIGRACIÓN DE DATOS EXISTENTES (ROL -> PERMISOS LEGACY)
-- ============================================================================

-- Mantener compatibilidad: los roles existentes mantienen sus permisos legacy
-- a través de la tabla usuario_rol. Los nuevos permisos son aditivos.
-- No se elimina usuario_rol ni rol.

-- ============================================================================
-- 6. VISTA DE CONSULTA DE PERMISOS EFECTIVOS
-- ============================================================================

CREATE OR REPLACE VIEW v_permisos_efectivos AS
SELECT 
    u.id_usuario,
    u.usu_email,
    r.id_rol,
    r.nombre_rol,
    rec.codigo AS recurso,
    rec.nombre AS recurso_nombre,
    a.codigo AS accion,
    a.nombre AS accion_nombre,
    ra.descripcion AS permiso_descripcion,
    rr.scope,
    rr.activo AS permiso_activo,
    r.activo AS rol_activo,
    u.estado_usuario
FROM usuario u
JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
JOIN rol r ON ur.id_rol = r.id_rol
JOIN rol_recurso rr ON r.id_rol = rr.id_rol
JOIN recurso_accion ra ON rr.id_recurso_accion = ra.id_recurso_accion
JOIN recurso rec ON ra.id_recurso = rec.id_recurso
JOIN accion a ON ra.id_accion = a.id_accion
WHERE u.estado_usuario = 'activo'
  AND u.email_verificado
  AND r.activo
  AND rr.activo
  AND rec.activo;

-- ============================================================================
-- 7. FUNCIÓN DE AUTORIZACIÓN (para uso en RLS o funciones)
-- ============================================================================

CREATE OR REPLACE FUNCTION tiene_permiso(
    p_id_usuario UUID,
    p_recurso_codigo VARCHAR,
    p_accion_codigo VARCHAR,
    p_tienda_id UUID DEFAULT NULL,
    p_usuario_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM v_permisos_efectivos v
    WHERE v.id_usuario = p_id_usuario
      AND v.recurso = p_recurso_codigo
      AND v.accion = p_accion_codigo
      AND (
          v.scope = 'global'
          OR (v.scope = 'tienda' AND v.tienda_id = p_tienda_id)
          OR (v.scope = 'propio' AND v.id_usuario = p_usuario_id)
      );
    RETURN v_count > 0;
END;
$$;

-- ============================================================================
-- 8. COMENTARIOS DE TABLAS
-- ============================================================================

COMMENT ON TABLE recurso IS 'Catálogo de recursos protegidos por RBAC';
COMMENT ON TABLE accion IS 'Catálogo de acciones posibles sobre recursos';
COMMENT ON TABLE recurso_accion IS 'Matriz de combinaciones válidas recurso-acción';
COMMENT ON TABLE rol_recurso IS 'Asignación de permisos (recurso-acción-scope) a roles';

COMMENT ON COLUMN rol_recurso.scope IS 'Alcance del permiso: global (todo), tienda (su tienda), propio (sus registros)';
COMMENT ON COLUMN recurso_accion.requiere_scope IS 'Si FALSE, el permiso solo aplica con scope global';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================