# 03 — Modelo de Datos (Tablas)

La base de datos es **PostgreSQL (Neon)** y su esquema **no está gestionado por Django**: los 27 modelos heredan de `DatabaseModel` (abstracta con `managed = False`), por lo que Django **no genera ni ejecuta migraciones**. Las tablas se crean/modifican con SQL directo.

**Convenciones:**
- Claves primarias: `UUID` (`uuid.uuid4`) salvo la intermedia `usuario_rol` (PK compuesta).
- Nombres de columnas en **español**.
- Enums: tipos `enum` nativos de PostgreSQL (`*_enum`), mapeados con `PostgreSQLEnumField`.
- Relaciones: `on_delete=DO_NOTHING` (las FK no borran en cascada; la integridad la mantiene la BD).

---

## 1. Diagrama Entidad–Relación

```mermaid
erDiagram
    ROLE ||--o{ USER_ROLE : "tiene"
    USER ||--o{ USER_ROLE : "asigna"
    STORE ||--o{ USER : "emplea"
    SUBSCRIPTION_PLAN ||--o{ STORE : "define"
    PRODUCT_CATEGORY ||--o{ PRODUCT : "agrupa"
    ACCESSORY_CATEGORY ||--o{ PRODUCT : "clasifica"
    ACCESSORY_TYPE ||--o{ PRODUCT : "tipifica"
    PRODUCT ||--o{ INVENTORY : "se stockea"
    STORE ||--o{ INVENTORY : "posee"
    MOTORCYCLE_BRAND ||--o{ MOTORCYCLE_MODEL : "tiene"
    MOTORCYCLE_MODEL ||--o{ MOTORCYCLE : "genera"
    MOTORCYCLE_MODEL ||--o{ ACCESSORY_COMPATIBILITY : "acepta"
    ACCESSORY_CATEGORY ||--o{ ACCESSORY_COMPATIBILITY : "encaja en"
    ACCESSORY_CATEGORY ||--o{ MODEL_3D : "modela"
    MOVEMENT_TYPE ||--o{ INVENTORY_MOVEMENT : "clasifica"
    INVENTORY ||--o{ INVENTORY_MOVEMENT : "registra"
    USER ||--o{ INVENTORY_MOVEMENT : "ejecuta"
    STORE ||--o{ QUOTE : "recibe"
    USER ||--o{ QUOTE : "solicita"
    MOTORCYCLE ||--o{ QUOTE : "refiere"
    QUOTE ||--o{ QUOTE_DETAIL : "detalla"
    ACCESSORY_CATEGORY ||--o{ QUOTE_DETAIL : "incluye"
    QUOTE ||--o{ QUOTE_STATUS_HISTORY : "historial"
    USER ||--o{ QUOTE_STATUS_HISTORY : "audita"
    USER ||--o{ CONFIGURATION : "guarda"
    MOTORCYCLE ||--o{ CONFIGURATION : "configura"
    CONFIGURATION ||--o{ CONFIGURATION_DETAIL : "detalla"
    ACCESSORY_CATEGORY ||--o{ CONFIGURATION_DETAIL : "añade"
    USER ||--o{ TOKEN : "recibe"
```

> Archivo completo (con atributos): [`diagramas/erd.mmd`](diagramas/erd.mmd)

---

## 2. Tablas de referencia (catálogos)

### `rol`
| Columna | Tipo | Restricción |
|---|---|---|
| `id_rol` | UUID | PK |
| `nombre_rol` | Text | — |

Semilla: `Administrador` (`...0001`), `Vendedor` (`...0002`), `Cliente` (`...0003`).

### `plan_subscripcion`
| Columna | Tipo | Restricción / nota |
|---|---|---|
| `id_plan` | UUID | PK |
| `plan_nombre` | Text | — |
| `plan_descripcion` | Text | null |
| `precio_mensual` | Decimal(10,2) | — |
| `limite_productos` | Int | null → límite aplicado en `POST /api/inventario` |
| `limite_usuarios` | Int | null → límite aplicado en `POST /api/auth/register` |
| `plan_estado` | `plan_estado_enum` | `activo` \| `inactivo` \| `suspendido` (default `activo`) |

### `categoria_accesorio`
| Columna | Tipo |
|---|---|
| `id_categoria` | UUID (PK) |
| `cat_nombre` | Text |
| `cat_descripcion` | Text (null) |

### `categoria_producto`
| Columna | Tipo |
|---|---|
| `id_categoria_producto` | UUID (PK) |
| `nombre` | Text |
| `descripcion` | Text (null) |

### `tipo_accesorio`
| Columna | Tipo |
|---|---|
| `id_tipo` | UUID (PK) |
| `nombre` | Text |
| `descripcion` | Text (null) |

### `marca_moto`
| Columna | Tipo |
|---|---|
| `id_marca` | UUID (PK) |
| `marca_nombre` | Text |
| `marca_pais` | Text (null) |

### `tipo_movimiento`
| Columna | Tipo |
|---|---|
| `id_tipomov` | UUID (PK) |
| `tipomov_nombre` | Text → la vista compara en minúsculas: **`entrada`** (suma) / **`salida`** (resta) |
| `descripcion_tipomov` | Text (null) |

Semilla del frontend: `Entrada` (`cccc...0001`), `Salida` (`cccc...0002`), `Ajuste` (`cccc...0003`).

---

## 3. Tabla de productos (accesorios y no accesorios)

### `producto`
| Columna | Tipo | Restricción / nota |
|---|---|---|
| `id_producto` | UUID | PK |
| `nombre` | Text | **Nombre visible del producto** (lo lee la vidriera como `acc_nombre`) |
| `descripcion` | Text | null |
| `estado` | Char(50) | default `disponible` |
| `id_categoria_producto` | UUID | FK → `categoria_producto`; **capa de categoría del catálogo** |
| `imagen` | Text | null |
| `codigo_sku` | Text | **UNIQUE**, null |
| `precio` | Decimal(10,2) | null; **debe existir** para poder cotizar el producto |
| `accesorio` | Bool | default `False`; expuesto como `es_accesorio` — dice si el producto es un accesorio de moto |
| `id_categoria_accesorio` | UUID | FK → `categoria_accesorio`; **capa que gobierna la compatibilidad** (solo accesorios) |
| `id_tipo_accesorio` | UUID | FK → `tipo_accesorio`; **capa de tipo** dentro de la categoría (solo accesorios) |
| `peso` | Decimal(6,2) | null (kg) |

> **Una sola tabla para todo el catálogo.** La antigua tabla `accesorio` fue eliminada: sus
> campos (`peso`, tipo y categoría) viven ahora en `producto`, y `es_accesorio` decide si
> aplican las capas de accesorio. Por eso el catálogo puede listar **todos** los productos
> y filtrar por categorías de producto, mientras el configurador combina categoría
> de accesorio + tipo (ver [07 — Vistas del frontend](07-vistas-frontend.md)).
>
> **Compatibilidad por categoría**, no por pieza: `accesorio_modelo_moto` enlaza
> `categoria_accesorio` ↔ `modelo_moto`, así que un accesorio es compatible con una moto
> cuando su `id_categoria_accesorio` está marcado como compatible con ese modelo.
> `Model3DByAccessory` y `CompatibilityCollection` traducen el `id_accesorio` (id de
> producto) que envía el frontend al id de su categoría.

### `modelo_3d`
| Columna | Tipo | Nota |
|---|---|---|
| `id_modelo3d` | UUID | PK |
| `id_accesorio` | UUID | FK → `categoria_accesorio` (el nombre de la columna es histórico; apunta a la categoría) |
| `url_modelo3d` | Text | URL del archivo **GLTF/GLB** |
| `formato_archivo` | Text | null |
| `estado_visualizacion` | Text | null |
| `modelo3d_fecha` | Date | default hoy |
| `modelo3d_observaciones` | Text | null |

---

## 4. Tablas de motos

### `modelo_moto`
| Columna | Tipo | Nota |
|---|---|---|
| `id_modelo_moto` | UUID | PK |
| `id_marca` | UUID | FK → `marca_moto` |
| `modelo_nombre` | Text | — |
| `modelo_descripcion` | Text | null |
| `cilindraje` | Text | null |

### `moto`
| Columna | Tipo | Nota |
|---|---|---|
| `id_moto` | UUID | PK |
| `id_modelo_moto` | UUID | FK → `modelo_moto` |
| `moto_anio` | Int | null |
| `moto_version` | Text | null |
| `moto_imagen` | Text | null (usada en el configurador) |

### `accesorio_modelo_moto` (compatibilidad)
| Columna | Tipo | Restricción |
|---|---|---|
| `id_compatibilidad` | UUID | PK |
| `id_categoria_accesorio` | UUID | FK → `categoria_accesorio`, null (la categoría que hace compatible al accesorio) |
| `id_modelo_moto` | UUID | FK → `modelo_moto`, NOT NULL |
| `anio_desde` | Int | null (rango de años) |
| `anio_hasta` | Int | null |

**`UNIQUE (id_categoria_accesorio, id_modelo_moto)`** → un `POST /api/compatibilidad` duplicado devuelve **409**. El panel sigue enviando `id_accesorio` (id de producto); la vista lo traduce a la categoría del producto antes de crear el registro.

---

## 5. Tablas de tiendas y usuarios

### `tienda`
| Columna | Tipo | Restricción / nota |
|---|---|---|
| `id_tienda` | UUID | PK |
| `id_plan` | UUID | FK → `plan_subscripcion` |
| `nombre_tienda` | Text | — |
| `nit` | Text | **UNIQUE**, null |
| `direccion_tienda` | Text | — |
| `telefono_tienda` | Text | — |
| `email_tienda` | Text | null |
| `fecha_afiliacion` | Date | default hoy |
| `estado_tienda` | `tienda_estado_enum` | `activa` \| `inactiva` \| `suspendida` |

### `usuario`
| Columna | Tipo | Restricción / nota |
|---|---|---|
| `id_usuario` | UUID | PK |
| `id_tienda` | UUID | FK → `tienda`, null (los clientes pueden no tener tienda) |
| `usu_nombre` | Text | — |
| `usu_email` | Text | **UNIQUE** |
| `password_hash` | Text | **bcrypt** `gensalt(rounds=12)` |
| `fecha_registro` | Date | default hoy |
| `estado_usuario` | `usuario_estado_enum` | `activo` \| `inactivo` \| `bloqueado` |
| `reset_token` | Text | SHA-256 del token de recuperación |
| `reset_token_expira` | DateTime | caduca en **1 hora** |
| `email_verificado` | Bool | default `False` |
| `verificacion_token` | Text | token de verificación de correo |

> **No hereda de `AbstractUser`**: no existe `username`, no hay Django auth. Propiedades útiles: `is_authenticated=True`, `id_rol` (primer rol), `role_ids`.

### `usuario_rol` (intermedia N:M)
| Columna | Tipo |
|---|---|
| `id_usuario` | UUID — parte de la **PK compuesta** (`CompositePrimaryKey`) |
| `id_rol` | UUID — parte de la **PK compuesta** |

En la práctica **un rol por usuario**: `update_user_role()` ejecuta `DELETE` + `INSERT` crudos.

---

## 6. Tablas de inventario

### `inventario`
| Columna | Tipo | Restricción / nota |
|---|---|---|
| `id_inventario` | UUID | PK |
| `id_tienda` | UUID | FK → `tienda` |
| `id_producto` | UUID | FK → `producto` (accesorio o no; `es_accesorio` se lee del producto) |
| `stock_actual` | Int | default 0 |
| `stock_minimo` | Int | default 0 |
| `estado_inventario` | `inventario_estado_enum` | `normal` \| `bajo` \| `agotado` (recalculado) |
| `fecha_actualizacion` | Date | default hoy |
| `precio` | Decimal(10,2) | null (precio propio de la tienda) |

**`UNIQUE (id_tienda, id_producto)`** → un registro duplicado devuelve **409**.
Regla de estado: `agotado` si `stock_actual ≤ 0`; `bajo` si `≤ stock_minimo`; si no, `normal`.

### `movimiento_inventario`
| Columna | Tipo | Nota |
|---|---|---|
| `id_movimiento` | UUID | PK |
| `id_inventario` | UUID | FK → `inventario` |
| `id_tipomov` | UUID | FK → `tipo_movimiento` |
| `id_usuario` | UUID | FK → `usuario` (autor del movimiento) |
| `mov_cantidad` | Int | **positivo** en entrada, **negativo** en salida |
| `fecha_movimiento` | DateTime | default `timezone.now` |
| `observaciones` | Text | null |

---

## 7. Tablas de cotizaciones

### `cotizacion`
| Columna | Tipo | Restricción / nota |
|---|---|---|
| `id_cotizacion` | UUID | PK |
| `id_tienda` | UUID | FK → `tienda` |
| `id_usuario` | UUID | FK → `usuario` (solicitante) |
| `id_moto` | UUID | FK → `moto` (opcional: la cotización puede no estar atada a una moto) |
| `fecha_solicitud` | DateTime | default `timezone.now` |
| `coti_estado` | `cotizacion_estado_enum` | `pendiente` (default) \| `aprobada` \| `rechazada` \| `completada` |
| `total` | Decimal(10,2) | default 0; suma de subtotales |
| `coti_observaciones` | Text | null |
| `nombre_configuracion` | Text | null |

### `detalle_cotizacion`
| Columna | Tipo | Nota |
|---|---|---|
| `id_detalle_cotizacion` | UUID | PK |
| `id_cotizacion` | UUID | FK → `cotizacion` |
| `id_categoria_accesorio` | UUID | FK → `categoria_accesorio` (categoría del producto cotizado) |
| `cantidad` | Int | ≥ 1 |
| `precio_unitario` | Decimal(10,2) | tomado de `producto.precio` al crear |
| `subtotal` | Decimal(10,2) | `cantidad × precio_unitario` |

### `cotizacion_estado_hist`
| Columna | Tipo | Nota |
|---|---|---|
| `id_hist` | UUID | PK |
| `id_cotizacion` | UUID | FK → `cotizacion`, NOT NULL |
| `estado` | Char(50) | estado registrado |
| `fecha` | DateTime | default ahora |
| `id_usuario` | UUID | FK → `usuario`, NOT NULL (quien cambió el estado) |

---

## 8. Tablas sin endpoint expuesto (modelos reserva)

Estas tablas existen en los modelos pero **no tienen serializer ni ruta** en la API actual:

### `configuracion`
| Columna | Tipo |
|---|---|
| `id_configuracion` | UUID (PK) |
| `id_usuario` | FK → `usuario` |
| `id_moto` | FK → `moto` |
| `nombre` | Char(100) |

### `configuracion_detalle`
| Columna | Tipo |
|---|---|
| `id_detalle` | UUID (PK) |
| `id_configuracion` | FK → `configuracion` |
| `id_categoria_accesorio` | FK → `categoria_accesorio` |
| `cantidad` | Int (default 1) |

### `token`
| Columna | Tipo |
|---|---|
| `id_token` | UUID (PK) |
| `id_usuario` | FK → `usuario` |
| `tipo` | Char(50) |
| `hash` | Text |
| `expira_en` | DateTime |
| `usado` | Bool (default False) |

---

## 9. Tablas por dominio (mapa rápido)

| Dominio | Tablas |
|---|---|
| Seguridad / acceso | `usuario`, `rol`, `usuario_rol` |
| Suscripciones | `tienda`, `plan_subscripcion` |
| Catálogo de productos | `producto`, `categoria_producto`, `categoria_accesorio`, `tipo_accesorio` |
| Visualización 3D | `modelo_3d` |
| Motos y compatibilidad | `marca_moto`, `modelo_moto`, `moto`, `accesorio_modelo_moto` |
| Inventario | `inventario`, `movimiento_inventario`, `tipo_movimiento` |
| Cotizaciones | `cotizacion`, `detalle_cotizacion`, `cotizacion_estado_hist` |
| Reservas (sin API) | `configuracion`, `configuracion_detalle`, `token` |

**Total: 23 tablas de dominio + 4 de la matriz RBAC (`recurso`, `accion`, `recurso_accion`, `rol_recurso`, ver [08 — Seguridad](08-seguridad.md)) = 27 modelos.**

---

## 10. Enumeraciones (enums de PostgreSQL)

| Enum | Valores | Tabla |
|---|---|---|
| `plan_estado_enum` | `activo`, `inactivo`, `suspendido` | `plan_subscripcion` |
| `tienda_estado_enum` | `activa`, `inactiva`, `suspendida` | `tienda` |
| `usuario_estado_enum` | `activo`, `inactivo`, `bloqueado` | `usuario` |
| `inventario_estado_enum` | `normal`, `bajo`, `agotado` | `inventario` |
| `cotizacion_estado_enum` | `pendiente`, `aprobada`, `rechazada`, `completada` | `cotizacion` |

> Los estados de *tipo* de movimiento y de *rol* **no** son enums: son filas de `tipo_movimiento` y `rol`.

---

**Anterior:** [02 — Arquitectura](02-arquitectura.md) · **Siguiente:** [04 — API REST](04-api-rest.md)
