# 04 — API REST

**Base URL (producción):** `https://motopreview-backend.onrender.com/api`
**Base URL (desarrollo):** `http://127.0.0.1:8000/api`

- Formato: **JSON** (`Content-Type: application/json`).
- **Barra final opcional:** cada ruta se acepta con y sin `/` final (`/api/marcas` y `/api/marcas/` dan lo mismo); el frontend utiliza la forma sin barra.
- Autenticación: `Authorization: Bearer <JWT>` (HS256, vigencia por defecto **8 h**).
- Idioma de respuesta: `?lang=en` o cabecera `X-Language: en` (por defecto `es`); la cabecera `Content-Language` indica el idioma usado.
- Los errores se devuelven siempre como `{"error": "<mensaje>"}` (ver `api/errors.py`).
- **503** si no hay `MOTOPREVIEW_DATABASE_URL` configurado; **503** en login si falta `JWT_SECRET`.

## Matriz de permisos

| Símbolo | Permiso |
|---|---|
| 🌐 | `AllowAny` (público) |
| 🔑 | `IsAuthenticated` (cualquier rol con JWT válido) |
| 🏪 | `IsStoreStaff` (Administrador o Vendedor) |
| 🛡️ | `IsStoreAdmin` (solo Administrador) |

---

## 1. Salud y raíz

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/` · `/api` · `/api/` | 🌐 | Mensaje de bienvenida |
| GET | `/api/health` · `/api/healthz` | 🌐 | `{"ok": true, "database_configured": bool}` — usado por el frontend cada 10 s |

---

## 2. Autenticación

| Método | Ruta | Permiso | Códigos |
|---|---|---|---|
| POST | `/api/auth/register` | 🌐 | 201, 400, 403, 409, 503 |
| POST | `/api/auth/login` | 🌐 | 200, 400, 401, 403, 503 |
| GET | `/api/auth/perfil` | 🔑 | 200 |
| GET | `/api/auth/verificar/<token>` | 🌐 | 200, 400 |
| POST | `/api/auth/forgot-password` | 🌐 | 200, 400, 503 |
| POST | `/api/auth/reset-password` | 🌐 | 200, 400 |

### `POST /api/auth/register`
```json
// Cliente (rol cliente)
{ "usu_nombre": "Ana", "usu_email": "ana@x.com", "password": "secreta123",
  "id_rol": "11111111-0000-0000-0000-000000000003",
  "id_tienda": "33333333-0000-0000-0000-000000000001" }
```
- Contraseña mínimo **8** caracteres.
- El **cliente** nace con `email_verificado=false` + `verificacion_token` (se envía correo).
- Registrar **staff** (admin/vendedor) solo puede hacerlo un admin autenticado (**403** si no).
- Valida `limite_usuarios` del plan de la tienda → **403** si se alcanzó.
- Email duplicado → **409**.

### `POST /api/auth/login`
```json
{ "usu_email": "ana@x.com", "password": "secreta123" }
```
```json
// 200
{ "mensaje": "...", "token": "<JWT>", "usuario": { "id_usuario": "...", "usu_nombre": "...",
  "usu_email": "...", "id_tienda": "...", "id_rol": "...", "estado_usuario": "activo" } }
```
- Credenciales inválidas → **401**; usuario `inactivo`/`bloqueado` → **403**.

### `POST /api/auth/forgot-password`
```json
{ "usu_email": "ana@x.com" }
```
- Siempre responde **200** con mensaje genérico (anti-enumeración).
- Genera un token aleatorio, guarda su **SHA-256** en `reset_token` con expiración de **1 hora** y envía el enlace a `PASSWORD_RESET_URL?token=...`.
- Sin SMTP configurado → **503**.

### `POST /api/auth/reset-password`
```json
{ "token": "<token del correo>", "password": "nueva1234" }
```
- 200 / 400 (token inválido o expirado).

---

## 3. CRUD genérico de catálogos 🌐/🔑

**Lectura pública (🌐); escritura solo con rol administrador (`IsStoreAdmin` → 🛡️)** — ver §9.

| Colección | Rutas | Filtros GET |
|---|---|---|
| Categorías de accesorio | `GET/POST /api/categorias` · `GET/PUT/PATCH/DELETE /api/categorias/<uuid>` | — |
| Marcas | `GET/POST /api/marcas` · `.../marcas/<uuid>` | — |
| Modelos de moto | `GET/POST /api/modelos-moto` · `.../modelos-moto/<uuid>` | — |
| Motos | `GET/POST /api/motos` · `.../motos/<uuid>` | — |
| Roles | `GET/POST /api/roles` · `.../roles/<uuid>` | — |
| Tiendas | `GET/POST /api/tiendas` · `.../tiendas/<uuid>` | — |
| Modelos 3D | `GET/POST /api/modelos-3d` · `.../modelos-3d/<uuid>` | — |
| Accesorios | `GET/POST /api/accesorios` · `.../accesorios/<uuid>` | — |
| Productos | `GET/POST /api/productos` · `.../productos/<uuid>` | — |
| Categorías de producto | `GET/POST /api/categorias-producto` · `.../categorias-producto/<uuid>` | — |
| Tipos de accesorio | `GET/POST /api/tipos-accesorio` · `.../tipos-accesorio/<uuid>` | — |
| Tipos de movimiento | `GET/POST /api/tipos-movimiento` · `.../tipos-movimiento/<uuid>` | — |
| Planes de suscripción | `GET/POST /api/planes-suscripcion` · `.../planes-suscripcion/<uuid>` | — |

**Códigos comunes:** `200` (lectura/actualización) · `201` (creación) · `400` (serializador inválido) · `404` (no existe) · `409` (`IntegrityError`: duplicado o con registros relacionados) · `200 {"mensaje": "Registro eliminado."}` en DELETE.

---

## 4. Accesorios y compatibilidad

| Método | Ruta | Permiso | Descripción | Códigos |
|---|---|---|---|---|
| GET | `/api/accesorios` | 🌐 | Lista accesorios (datos combinados de `producto`) | 200 |
| POST | `/api/accesorios` | 🛡️ | Crea `producto` + `accesorio`; exige `acc_nombre` y `acc_precio` | 201, 400, 409 |
| GET/PUT/PATCH/DELETE | `/api/accesorios/<uuid>` | GET 🌐 / esc. 🛡️ | Detalle y actualización (sincroniza `producto`) | 200, 400, 404, 409 |
| GET | `/api/modelos-3d/accesorio/<uuid>` | 🌐 | Primer `modelo_3d` del accesorio | 200, 404 |
| GET | `/api/compatibilidad/modelo/<uuid>` | 🌐 | **Accesorios compatibles con un modelo de moto** (usado por el configurador) | 200 |
| GET | `/api/compatibilidad/accesorio/<uuid>` | 🌐 | Modelos compatibles con un accesorio | 200 |
| POST | `/api/compatibilidad` | 🛡️ | Crea compatibilidad | 201, 400, **409** (par duplicado) |
| DELETE | `/api/compatibilidad/<uuid>` | 🛡️ | Elimina compatibilidad | 200, 404 |

```json
// POST /api/compatibilidad
{ "id_accesorio": "<uuid>", "id_modelo_moto": "<uuid>", "anio_desde": 2020, "anio_hasta": 2025 }
```

---

## 5. Usuarios (gestión de la tienda) 🛡️

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/api/usuarios` | Lista usuarios **de la tienda del admin** (orden por nombre) | 200, 400 (admin sin tienda) |
| GET | `/api/usuarios/<uuid>` | Detalle (limitado a su tienda) | 200, 404 |
| PUT/PATCH | `/api/usuarios/<uuid>` | Actualiza `usu_nombre`, `estado_usuario`, `id_rol`, `password` (≥8) | 200, 400, 404, 409 |
| DELETE | `/api/usuarios/<uuid>` | **Soft delete**: `estado_usuario = "bloqueado"` | 200, 404 |

```json
// PUT /api/usuarios/<uuid>
{ "usu_nombre": "Luis", "estado_usuario": "activo",
  "id_rol": "11111111-0000-0000-0000-000000000002", "password": "nuevaClave1" }
```
`estado_usuario` acepta únicamente: `activo` | `inactivo` | `bloqueado`.

---

## 6. Inventario 🏪 (Administrador o Vendedor)

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/api/inventario` | Inventario **de la tienda del usuario** | 200, 400 (sin tienda) |
| POST | `/api/inventario` | Alta de producto en inventario | 201, 400, **403** (límite del plan), **409** (duplicado) |
| GET | `/api/inventario/<uuid>` | Detalle de un registro de la tienda | 200, 404 |
| POST | `/api/inventario/movimiento` | **Registrar entrada/salida** (transaccional) | 201, 400, 404 |

### `POST /api/inventario`
```json
{ "id_producto": "<uuid>",          // o "id_accesorio": "<uuid>" (XOR)
  "stock_actual": 25, "stock_minimo": 5, "precio": 150000 }
```
- Calcula `estado_inventario` automáticamente.
- Si la tienda alcanzó `limite_productos` de su plan → **403**.

### `POST /api/inventario/movimiento`
```json
{ "id_inventario": "<uuid>", "id_tipomov": "cccccccc-0000-0000-0000-000000000001",
  "mov_cantidad": 10, "observaciones": "Reposición proveedor" }
```
- **`entrada`** → fuerza cantidad positiva (suma); **`salida`** → fuerza negativa (resta).
- Bloqueo pesado `SELECT ... FOR UPDATE`; si el stock quedaría negativo → **400**.
- Actualiza `stock_actual`, `estado_inventario` y `fecha_actualizacion`, y crea el movimiento con `usuario = request.user`.
- Respuesta **201**: `{"movimiento": {...}, "inventarioActualizado": {...}}`.

---

## 7. Cotizaciones 🔑

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/cotizaciones` | 🔑 | Staff → cotizaciones de **su tienda**; cliente → **las suyas** (orden `-fecha_solicitud`) |
| POST | `/api/cotizaciones` | 🔑 | Crea cotización con detalle |
| GET | `/api/cotizaciones/<uuid>` | 🔑 | Detalle (mismo filtro tienda/propietario) |
| PUT/PATCH | `/api/cotizaciones/<uuid>/estado` | 🏪 | Cambia estado + historial + correo |
| GET | `/api/cotizaciones/<uuid>/historial` | 🔑 | Historial de estados (`cotizacion_estado_hist`), mismo filtro tienda/propietario |

### `POST /api/cotizaciones`
```json
{ "id_moto": "<uuid>",
  "coti_observaciones": "Lléguele el martes",
  "nombre_configuracion": "Mi Shadow",
  "items": [ { "id_accesorio": "<uuid>", "cantidad": 2 },
             { "id_accesorio": "<uuid>", "cantidad": 1 } ] }
```
- Valida existencia de la moto y de los accesorios; **400** si algún accesorio no tiene `producto.precio`.
- Calcula `subtotal` por línea y `total`; crea la cotización en estado **`pendiente`** dentro de una transacción.
- Códigos: **201**, 400, 409.

### `PUT /api/cotizaciones/<uuid>/estado`
```json
{ "coti_estado": "aprobada" }
```
- Valores permitidos: `pendiente`, `aprobada`, `rechazada`, `completada` (400 si no).
- `select_for_update()` sobre la cotización **de su tienda** (404 si no le pertenece).
- Registra en `cotizacion_estado_hist` y envía **correo de notificación** al cliente (si hay SMTP).
- Códigos: 200, 400, 404, 409.

---

## 7-bis. Configuraciones 🔑

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/configuraciones` | 🔑 | Staff → configuraciones de los usuarios de **su tienda**; cliente → **las suyas** |
| GET | `/api/configuraciones/<uuid>` | 🔑 | Detalle con sus `detalles` (mismo filtro tienda/propietario) |

- Una configuración es la combinación **usuario + moto + nombre** con sus `ConfigurationDetail` (`id_accesorio` + `cantidad`).
- Los detalles se devuelven anidados en `detalles`.
- Códigos: 200, 404.

---

## 8. Endpoints usados por el frontend

| Módulo (`src/services/`) | Llamada | HTTP | Ruta |
|---|---|---|---|
| `auth.js` | `registrarCliente` | POST | `/auth/register` |
| | `solicitarRecuperacion` | POST | `/auth/forgot-password` |
| | `restablecerPassword` | POST | `/auth/reset-password` |
| | `verificarCorreo` | GET | `/auth/verificar/{token}` |
| `AuthContext` | `login` | POST | `/auth/login` |
| `motos.js` | `obtenerMotos` | GET | `/motos` |
| `modelos3d.js` | `obtenerModelo3dPorAccesorio` | GET | `/modelos-3d/accesorio/{id}` |
| `accesorios.js` | `obtenerAccesorios` / `obtenerCategorias` | GET | `/accesorios` · `/categorias` |
| | `crearAccesorio` / `actualizarAccesorio` | POST/PUT | `/accesorios` · `/accesorios/{id}` |
| `compatibilidad.js` | `obtenerAccesoriosCompatibles` | GET | `/compatibilidad/modelo/{id}` |
| | `obtenerModelosCompatibles` | GET | `/compatibilidad/accesorio/{id}` |
| | `marcarCompatible` / `quitarCompatible` | POST/DELETE | `/compatibilidad` · `/compatibilidad/{id}` |
| `inventario.js` | `obtenerInventario` | GET | `/inventario` |
| | `registrarMovimiento` | POST | `/inventario/movimiento` |
| `cotizaciones.js` | `obtenerCotizaciones` / `crearCotizacion` | GET/POST | `/cotizaciones` |
| | `cambiarEstadoCotizacion` | PUT | `/cotizaciones/{id}/estado` |
| `usuarios.js` | `obtenerUsuarios` | GET | `/usuarios?id_tienda=...` |
| | `registrarUsuario` | POST | `/auth/register` |
| | `actualizarUsuario` / `desactivarUsuario` | PUT/DELETE | `/usuarios/{id}` |
| `tiendas.js` | `obtenerTienda` / `actualizarTienda` | GET/PUT | `/tiendas/{id}` |
| (directo en `Visualizador.jsx`) | detalle del accesorio | GET | `/accesorios/{id}` |
| (`ConnectionContext`) | sondeo de salud | GET | `/health` |

---

## 9. Consideraciones y recomendaciones

1. **Escritura de catálogos restringida (resuelto):** `POST/PUT/DELETE` de catálogos exigen ahora `IsStoreAdmin` (401 sin sesión, 403 para clientes y vendedores). Probado en `backend/api/test_endpoints.py`.
2. **Filtrado en cliente:** varias páginas admin reciben listados y filtran por `id_tienda` en el navegador; conviene filtrar en el servidor (rendimiento y seguridad).
3. **Paginación de servidor (añadida, opcional):** sin parámetros la respuesta sigue siendo el array plano histórico; con `?pagina=<n>&por_pagina=<1-100>` (20 por defecto) devuelve `{"count", "pagina", "por_pagina", "total_paginas", "resultados"}`. Aplica a los catálogos, `/api/usuarios`, `/api/inventario` y `/api/cotizaciones`. El catálogo público sigue paginando en el cliente (8 por página).
4. **`DELETE /api/tiendas/<uuid>`** y otros DELETE genéricos pueden borrar registros con datos hijos (responden 409, pero conviene revisar la política).
5. **Versionado:** la API no tiene prefijo de versión (`/api/v1`).

---

**Anterior:** [03 — Modelo de datos](03-modelo-datos.md) · **Siguiente:** [05 — Casos de uso](05-casos-de-uso.md)
