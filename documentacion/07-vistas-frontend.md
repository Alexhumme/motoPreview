# 07 — Vistas del Frontend (Rutas, Páginas y Componentes)

SPA React 19 + React Router v7. Todas las rutas se declaran en `src/App.jsx`.

---

## 1. Diagrama de vistas (sitemap + guardas)

```mermaid
flowchart TB
    classDef pub fill:#ecfdf5,stroke:#059669,color:#111
    classDef auth fill:#eff6ff,stroke:#2563eb,color:#111
    classDef admin fill:#fef2f2,stroke:#dc2626,color:#111
    classDef guard fill:#fffbeb,stroke:#d97706,color:#111

    ROOT(["/  ·  Portada (Catálogo.jsx)<br/>hero + estadísticas + CTA + #como-funciona"]):::pub

    ROOT --> H1["SiteHeader / Footer"]:::pub
    ROOT --> CAT["/catalogo<br/>CatalogoCompleto.jsx<br/>filtros por capas + grid + paginación"]:::pub
    ROOT --> VIS["/visualizador/:id<br/>Visualizador.jsx + Visor3D"]:::pub
    ROOT --> CONF["/configurador<br/>Configurador.jsx"]:::pub
    ROOT --> CART["/carrito<br/>Carrito.jsx"]:::pub
    ROOT --> CON["/contacto<br/>Contacto.jsx"]:::pub
    ROOT --> NOT["* → NoEncontrado.jsx (404)"]:::pub

    LOGIN["/login<br/>Login.jsx"]:::auth
    REG["/registro<br/>Registro.jsx"]:::auth
    REC["/recuperar<br/>RecuperarPassword.jsx"]:::auth
    REST["/restablecer/:token<br/>RestablecerPassword.jsx"]:::auth
    VER["/verificar/:token<br/>VerificarCorreo.jsx"]:::auth

    MIS(["/mis-cotizaciones<br/>MisCotizaciones.jsx"]):::guard
    GUARD1{"RutaProtegida<br/>sesión requerida"}:::guard
    MIS --- GUARD1

    ADMIN(["/admin · AdminLayout<br/>riel de categorías + segunda barra"]):::admin
    GUARD2{"RutaProtegida<br/>roles: ADMIN | VENDEDOR"}:::admin
    ADMIN --- GUARD2

    ADMIN --> DASH["/admin<br/>Dashboard.jsx"]:::admin
    ADMIN --> PERFIL["/admin/perfil<br/>Perfil.jsx"]:::admin
    ADMIN --> INV["/admin/inventario<br/>Inventario.jsx"]:::admin
    ADMIN --> COT["/admin/cotizaciones<br/>Cotizaciones.jsx"]:::admin
    ADMIN --> REP["/admin/reportes<br/>Reportes.jsx"]:::admin

    ADMIN --> GUARD3{"RutaProtegida<br/>rol: solo ADMIN"}:::guard
    GUARD3 --> ACC["/admin/accesorios<br/>Accesorios.jsx"]:::admin
    GUARD3 --> USU["/admin/usuarios<br/>Usuarios.jsx"]:::admin
    GUARD3 --> TIE["/admin/tienda<br/>Tienda.jsx"]:::admin

    LOGIN --> DASH
    LOGIN --> ROOT
    REG --> ROOT
```

> Archivo: [`diagramas/vistas.mmd`](diagramas/vistas.mmd)

---

## 2. Tabla de rutas

| Ruta | Página | Archivo | Protección |
|---|---|---|---|
| `/` | Portada | `pages/public/Catalogo.jsx` | Pública |
| `/catalogo` | Catálogo completo | `pages/public/CatalogoCompleto.jsx` | Pública |
| `/carrito` | Carrito | `pages/public/Carrito.jsx` | Pública (el envío exige sesión) |
| `/configurador` | Configurador | `pages/public/Configurador.jsx` | Pública |
| `/contacto` | Contacto | `pages/public/Contacto.jsx` | Pública |
| `/visualizador/:id` | Visualizador 3D | `pages/public/Visualizador.jsx` | Pública |
| `/mis-cotizaciones` | Mis cotizaciones | `pages/public/MisCotizaciones.jsx` | Sesión |
| `/login` | Login | `pages/auth/Login.jsx` | Pública |
| `/registro` | Registro | `pages/auth/Registro.jsx` | Pública |
| `/recuperar` | Recuperar contraseña | `pages/auth/RecuperarPassword.jsx` | Pública |
| `/restablecer/:token` | Restablecer contraseña | `pages/auth/RestablecerPassword.jsx` | Pública |
| `/verificar/:token` | Verificar correo | `pages/auth/VerificarCorreo.jsx` | Pública |
| `/admin` | Dashboard | `pages/Dashboard.jsx` | ADMIN o VENDEDOR |
| `/admin/perfil` | Mi perfil | `pages/Perfil.jsx` | ADMIN o VENDEDOR |
| `/admin/inventario` | Inventario | `pages/Inventario.jsx` | ADMIN o VENDEDOR |
| `/admin/cotizaciones` | Cotizaciones | `pages/Cotizaciones.jsx` | ADMIN o VENDEDOR |
| `/admin/reportes` | Reportes | `pages/Reportes.jsx` | ADMIN o VENDEDOR |
| `/admin/accesorios` | Catálogo y compatibilidad | `pages/Accesorios.jsx` | ADMIN con permisos `productos:crear/actualizar` |
| `/admin/usuarios` | Usuarios de la tienda | `pages/Usuarios.jsx` | **solo ADMIN** |
| `/admin/tienda` | Tienda y plan | `pages/Tienda.jsx` | ADMIN o VENDEDOR (la vista solo tiene datos si la sesión pertenece a una tienda) |
| `/admin/permisos` | Seguridad (matriz RBAC) | `pages/Seguridad.jsx` | **solo ADMIN** |
| `/admin/catalogo` | Catálogo de permisos | `pages/CatalogoRBAC.jsx` | **solo SUPERADMIN** |
| `/admin/tiendas` · `/admin/tiendas/:id` | Tiendas y resumen de sede | `pages/Tiendas.jsx` · `pages/ResumenTienda.jsx` | **solo SUPERADMIN** |
| `*` | 404 | `pages/public/NoEncontrado.jsx` | — |

### Lógica de `RutaProtegida`

```
1. Si no hay usuario              → <Navigate to="/login" replace>
2. Si rolesPermitidos no contiene → <Navigate to="/" replace>
   usuario.id_rol
3. En otro caso                   → renderiza children
```

> La sesión se hidrata de `localStorage` con un **lazy initializer** en `useState`
> (sin efecto): el usuario ya está disponible en el primer render, por lo que no hay
> pantalla de "Cargando..." ni carrera de redirecciones.

---

## 3. Detalle de cada vista

### 3.1 Páginas públicas

| Página | Datos que carga | Interacciones principales |
|---|---|---|
| **Portada** `/` | — (página estática) | `SiteHeader`, hero con CTA a `/configurador` y ancla `#catalogo`, estadísticas, bloque de llamada a `/catalogo`, sección `#como-funciona`, `Footer` |
| **Catálogo completo** `/catalogo` | `GET /productos` (todos los productos, accesorios o no) | Filtros por capas (`Categoría` de producto + `Tipo` de accesorio), buscador (nombre/descripción/SKU), orden (relevancia/precio/nombre), rango de precio, grid de `AccesorioCard`, paginación 12/pp |
| **Carrito** `/carrito` | `GET /motos` | Cantidades −/+, eliminar línea, subtotal/total en COP (`Intl` es-CO), selector de moto, botón **Enviar** → `POST /cotizaciones` → `vaciarCarrito()` |
| **Configurador** `/configurador` | `GET /motos`, `GET /compatibilidad/modelo/:id` | Select de moto, panel de preview (imagen/datos/badge "✓ Compatible"), **dos capas de filtro** (categoría de accesorio → tipo) derivadas de la lista compatible, lista con botones `+`/`✓`, barra inferior con píldoras del carrito y total |
| **Visualizador** `/visualizador/:id` | `GET /accesorios/:id`, `GET /modelos-3d/accesorio/:id` | `Visor3D` (three.js) + ficha técnica; tolera ausencia de modelo 3D y abre productos que no son accesorio |
| **Contacto** `/contacto` | — (formulario local) | Nombre, correo y mensaje con estado de envío |
| **Mis cotizaciones** `/mis-cotizaciones` | `GET /cotizaciones` (filtro por `id_usuario` en cliente) | Tarjetas expandibles con estado, moto, fecha, total, detalle y observaciones |
| **404** `*` | — | Botón "Volver al catálogo" |

#### Filtros por capas del catálogo y del configurador

Ambas vistas usan el mismo mecanismo, derivado **de los datos ya cargados** (ninguna
petición extra a `/categorias` o `/tipos-accesorio`):

| Pieza | Rol |
|---|---|
| `components/filters/FiltroCapa.jsx` (+ su `.css`) | Una capa de filtrado: etiqueta + píldoras compactas con contador, chip **Todas** y `aria-pressed`; se oculta sola cuando no tiene opciones |
| `utils/filtros.js` | `TODAS` (centinela) y `agruparOpciones(lista, claveDe, etiquetaDe)` → `[{valor, etiqueta, conteo}]` ordenado por etiqueta, descartando grupos vacíos |
| `CatalogoCompleto.jsx` | `Categoría` = `categoria_producto` · `Tipo` = `tipo_accesorio` (esta segunda capa solo aparece si la categoría elegida trae accesorios con tipo) |
| `Configurador.jsx` | `Categoría` = `categoria_accesorio` · `Tipo` = `tipo_accesorio`, sobre los accesorios compatibles de la moto |

- **Encadenado:** la capa específica se calcula sobre el resultado de la general, así que
  ningún chip lleva a una lista vacía; si la combinación deja de existir, el filtro
  específico se suelta solo (`useEffect` → `TODAS`).
- **Conteos en vivo:** cada píldora muestra cuántos productos hay con ese valor después
  de aplicar búsqueda, precio y capas previas.
- **Estética:** píldoras de 28 px con divisor capilar por capa, activo en naranja de marca
  y contador en cifras tabulares; en ≤720 px la etiqueta sube y las píldoras se deslizan
  en horizontal con máscara de desvanecido.

### 3.2 Páginas de autenticación

| Página | Flujo |
|---|---|
| **Login** | `POST /auth/login` → guarda token → redirige por rol (`/admin` o `/`) |
| **Registro** | `POST /auth/register` con `ROL_CLIENTE` + `TIENDA_PRINCIPAL` → `login()` automático → `/` |
| **Recuperar** | `POST /auth/forgot-password` → mensaje genérico |
| **Restablecer** | valida coincidencia y longitud ≥ 6 → `POST /auth/reset-password` → `/login` tras 2.5 s |
| **Verificar** | máquina de estados `verificando \| exito \| error` → `GET /auth/verificar/:token` |

### 3.3 Panel admin (dentro de `AdminLayout`)

| Página | Datos | Funcionalidad |
|---|---|---|
| **Dashboard** `/admin` | `GET /inventario`, `GET /cotizaciones` | KPIs (productos, stock bajo/agotado, cotizaciones pendientes), barras CSS, últimas 4 cotizaciones, alerta de reabastecimiento (top 5) |
| **Inventario** `/admin/inventario` | `GET /inventario`, `POST /inventario/movimiento` | Tabla con badge de estado; modal de movimiento por fila (tipo, cantidad, observaciones) |
| **Cotizaciones** `/admin/cotizaciones` | `GET /cotizaciones`, `PUT /cotizaciones/:id/estado` | Tarjetas con cliente/moto/total; acciones: **Rechazar**, **Aprobar**, **Completar** |
| **Reportes** `/admin/reportes` | `GET /cotizaciones` | Rango "Este mes"/"Todo el tiempo"; ventas confirmadas, total, tasa de aprobación %, conteo por estado, Top-5 accesorios |
| **Accesorios** (admin) | `GET/POST/PUT /accesorios`, `GET /categorias`, compatibilidad | CRUD completo + gestión de compatibilidades (diff con `Set`: `marcarCompatible`/`quitarCompatible`) |
| **Usuarios** (admin) | `GET /usuarios?id_tienda=`, `POST /auth/register`, `PUT/DELETE /usuarios/:id` | Alta/edición (nombre, email, rol, contraseña, estado), desactivación con `ModalConfirmacion` |
| **Tienda** (admin) | `GET/PUT /tiendas/:id` | Vista/edición de datos generales + tarjeta del plan (precio, límites) |
| **Perfil** `/admin/perfil` | sesión (`usuario`) + `GET /tiendas/:id` solo si la sesión tiene tienda | Identidad (avatar icono, nombre, rol), datos de la cuenta (correo, rol, tienda, estado, fecha de registro) y acciones de sesión (tema, cerrar sesión). No hace falta un endpoint nuevo: `UserSerializer` ya manda `rol.nombre_rol` |

#### Navegación del panel: riel + segunda barra

`AdminLayout` divide la navegación en dos columnas dentro de `.admin-body`:

| Zona | Contenido |
|---|---|
| **Riel** (`.admin-sidebar`) | Arriba: las categorías (`General`, `Catálogo`, `Ventas`, `Administración`), cada una con su icono. Abajo, separada por `space-between`: el enlace a `/admin/perfil` (icono `CircleUser`, con nombre + rol como título) y el botón de despliegue (`PanelLeftOpen`/`PanelLeftClose`) |
| **Segunda barra** (`.admin-subsidebar`) | Cabecera con el icono y el título de la categoría activa + botón de cierre; debajo, los enlaces de esa categoría |

- El botón de despliegue alterna el riel entre **solo iconos** (68 px) e **iconos + títulos** (240 px). Pulsar una categoría **no** cambia el modo.
- Pulsar una categoría abre su segunda barra al costado derecho (y volverla a pulsar, o la X, la cierra); los enlaces ya no se despliegan debajo.
- El estado se guarda en `localStorage['motopreview-admin-riel']` como `{"desplegada": bool, "categoria": id|null}` y se reaplica al montar.
- Cada categoría filtra sus enlaces con las mismas reglas RBAC de antes (`soloAdmin`, `soloSuperAdmin`, `soloConTienda`, `permisos`); una categoría sin enlaces visibles no se pinta.
- Al cambiar de ruta, la categoría dueña de la ruta pasa a ser la activa; en pantallas ≤ 1024 px la segunda barra es un panel superpuesto (con respaldo que lo cierra) y elegir un enlace lo cierra.
- Hasta 1024 px el riel se queda siempre visible en modo iconos: no hay menú hamburguesa ni botón de despliegue.
- Riel y segunda barra son `position: sticky` con `top: var(--admin-header-h)` y `height: calc(100vh - var(--admin-header-h))` (71 px de header en escritorio, 63 px en estrecho). Al estar dentro de `.admin-body`, el propio sticky los encierra: no trepan sobre el header ni bajan sobre el footer.

---

## 4. Componentes reutilizables

| Componente | Propósito | Props / notas |
|---|---|---|
| `SiteHeader` | Cabecera pública: nav, sesión, contador del carrito | Acceso a "Panel" solo para ADMIN/VENDEDOR |
| `Footer` | Pie con columnas Explora / Cuenta / Ayuda | Ancla |
| `AdminLayout` | Shell del panel: riel de categorías + segunda barra de enlaces, header con tema/salir, `<Outlet />` y footer | Las categorías y sus enlaces se filtran por rol y permisos RBAC; el modo del riel y la categoría activa se persisten en `localStorage['motopreview-admin-riel']`. Ver §3.3 |
| `RutaProtegida` | Guard de rutas | `children`, `rolesPermitidos?: UUID[]` |
| `Visor3D` | Visor 3D three.js | `url`, `nombreAccesorio`; incluye `ErrorBoundary3D` y fallback |
| `BannerConexion` | Banner fijo "sin conexión al servidor" | Se muestra si `conectado === false` |
| `ModalConfirmacion` | Modal genérico de confirmación | `abierto`, `titulo`, `mensaje`, `peligroso`, `onConfirmar`, `onCancelar` |
| `AccesorioCard` | Tarjeta de producto (accesorio o no) | Enlaza a `/visualizador/:id`; `+` deshabilitado si `acc_estado !== 'disponible'`; muestra `categoria_producto` y, si `es_accesorio`, la etiqueta de `categoria_accesorio` (el SKU no se pinta en la tarjeta: solo alimenta la búsqueda) |
| `FiltroCapa` | Una capa del filtro por capas (catálogo y configurador) | `etiqueta`, `icono`, `opciones` (`[{valor, etiqueta, conteo}]`), `valor`, `onChange`, `todasEtiqueta`, `ariaLabel`; devuelve `null` si no hay opciones. Las opciones se construyen con `agruparOpciones` de `utils/filtros.js` |

---

## 5. Estado global (Context API)

Orden de providers en `main.jsx`:
`BrowserRouter` → `ConnectionProvider` → `AuthProvider` → `CartProvider` → `App`

| Contexto | Estado | API expuesta | Persistencia |
|---|---|---|---|
| `AuthContext` | `usuario` (hidratado de `localStorage` en el primer render) | `login(email, pass)`, `logout()` | `localStorage` (`token`, `usuario`) |
| `CartContext` | `items[]` (`{accesorio, cantidad}`) | `agregarItem`, `actualizarCantidad`, `eliminarItem`, `vaciarCarrito`, `totalItems`, `totalPrecio` | `localStorage['carrito']` |
| `ConnectionContext` | `conectado` | `useConnection()` | Polling `GET /health` cada 10 s + eventos `backend:online/offline` |

---

## 6. Consumo de la API desde el frontend

**`services/api.js` (axios):**
- **Request:** inyecta `Authorization: Bearer <token>` desde `localStorage`.
- **Response:**
  - OK → despacha `backend:online`.
  - **401** → limpia sesión y redirige a `/login`.
  - Sin respuesta (caída/timeout) → despacha `backend:offline`.

| Módulo | Funciones |
|---|---|
| `auth.js` | `registrarCliente`, `solicitarRecuperacion`, `restablecerPassword`, `verificarCorreo` |
| `motos.js` | `obtenerMotos` |
| `modelos3d.js` | `obtenerModelo3dPorAccesorio` |
| `accesorios.js` | `obtenerAccesorios`, `obtenerCategorias`, `crearAccesorio`, `actualizarAccesorio` |
| `productos.js` | `obtenerProductos` (vidriera: todos los productos, en forma plana) |
| `compatibilidad.js` | `obtenerAccesoriosCompatibles`, `obtenerModelosCompatibles`, `marcarCompatible`, `quitarCompatible` |
| `inventario.js` | `obtenerInventario`, `registrarMovimiento` |
| `cotizaciones.js` | `obtenerCotizaciones`, `crearCotizacion`, `cambiarEstadoCotizacion` |
| `usuarios.js` | `obtenerUsuarios`, `registrarUsuario`, `actualizarUsuario`, `desactivarUsuario` |
| `tiendas.js` | `obtenerTienda`, `actualizarTienda` |

---

## 7. Constantes de UI

**`constants/roles.js`**
```js
ROL_SUPERADMIN    = '00000000-0000-0000-0000-000000000000'
ROL_ADMIN         = '11111111-0000-0000-0000-000000000001'
ROL_VENDEDOR      = '11111111-0000-0000-0000-000000000002'
ROL_CLIENTE       = '11111111-0000-0000-0000-000000000003'
TIENDA_PRINCIPAL  = '33333333-0000-0000-0000-000000000001'
NOMBRE_ROL        = { [ROL_SUPERADMIN]: 'Superadmin', [ROL_ADMIN]: 'Admin Tienda',
                      [ROL_VENDEDOR]: 'Vendedor', [ROL_CLIENTE]: 'Cliente' }
                                                            // respaldo para sesiones
                                                            // antiguas sin `rol.nombre_rol`
```

**`constants/tiposMovimiento.js`**
```js
TIPO_ENTRADA = 'cccccccc-0000-0000-0000-000000000001'  // Entrada
TIPO_SALIDA  = 'cccccccc-0000-0000-0000-000000000002'  // Salida
TIPO_AJUSTE  = 'cccccccc-0000-0000-0000-000000000003'  // Ajuste
TIPOS_MOVIMIENTO = [{id, nombre}, ...]  // para poblar selects
```

---

## 8. Hoja de estilos

- CSS **puro por componente** (un `.css` por `.jsx`), convención **BEM** (p. ej. `product-grid`, `configuration-bar`, `auth__lateral`).
- Global: `src/index.css` (variables, reset, tipografías **Space Grotesk** e **Inter** desde Google Fonts).
- Paleta: verde/teal de acento (`--accent`), badges con clases por estado.
- Formato monetario: `Intl.NumberFormat('es-CO', {style:'currency', currency:'COP'})` (helper local repetido en varias páginas).

---

**Anterior:** [06 — Diagramas de flujo](06-flujos.md) · **Siguiente:** [08 — Seguridad y autenticación](08-seguridad.md)
