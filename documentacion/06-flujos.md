# 06 — Diagramas de Flujo y de Comportamiento

Todos los diagramas de esta sección también están disponibles como archivos `.mmd` en [`diagramas/`](diagramas/).

---

## 1. Diagrama de flujo — Iniciar sesión

> 📄 [`diagramas/flujo-login.mmd`](diagramas/flujo-login.mmd) · Código: `pages/auth/Login.jsx`, `context/AuthContext.jsx`, `views.login`

```mermaid
flowchart TD
    A([Inicio: usuario en /login]) --> B[/Solicita email y password/]
    B --> C{Campos válidos?}
    C -- No --> B
    C -- Sí --> D["POST /api/auth/login<br/>Content-Type: application/json"]
    D --> E{HTTP?}
    E -- "200 OK" --> F["Guarda token + usuario<br/>en localStorage"]
    F --> G{"id_rol es<br/>ADMIN o VENDEDOR?"}
    G -- Sí --> H[[Redirige a /admin]]
    G -- No --> I[[Redirige a /]]
    E -- "401" --> J[/Muestra 'Credenciales inválidas'/]
    J --> B
    E -- "403" --> K[/Muestra 'Usuario inactivo<br/>o bloqueado'/]
    K --> B
    E -- "503" --> L[/Banner: backend no disponible/]
    L --> M{Reintentar?}
    M -- Sí --> D
    M -- No --> N([Fin])
    H --> O([Panel admin])
    I --> P([Catálogo])
```

**Notas clave:**
- El JWT dura **8 h** (`JWT_LIFETIME_SECONDS=28800`); el interceptor de `api.js` limpia la sesión en **401**.
- La redirección por rol se decide en `Login.jsx` comparando `id_rol` con `ROL_ADMIN`/`ROL_VENDEDOR`.

---

## 1b. Diagrama de flujo — Registro

> 📄 [`diagramas/flujo-registro.mmd`](diagramas/flujo-registro.mmd) · Código: `pages/auth/Registro.jsx`, `views.register`

```mermaid
flowchart TD
    A([Inicio: /registro]) --> B[/Nombre, email y password/]
    B --> C{"password >= 8<br/>y campos completos?"}
    C -- No --> B
    C -- Sí --> D["POST /api/auth/register<br/>{usu_nombre, usu_email, password,<br/>id_rol: ROL_CLIENTE, id_tienda: TIENDA_PRINCIPAL}"]
    D --> E{HTTP?}
    E -- "201" --> F["Servidor crea usuario<br/>email_verificado=false<br/>+ verificacion_token<br/>+ correo de verificación"]
    F --> G["login() automático:<br/>POST /api/auth/login"]
    G --> H[[Redirige a /]]
    E -- "409" --> I[/Email ya registrado/]
    I --> B
    E -- "400" --> J[/Datos inválidos/]
    J --> B
    E -- "403" --> K[/Solo un admin<br/>registra staff/]
    K --> B
    H --> L([Fin])
    F --> M(["Al abrir el enlace del correo:<br/>GET /auth/verificar/&lt;token&gt;<br/>→ email_verificado = true"])
```

---

## 1c. Diagrama de flujo — Recuperación de contraseña

> 📄 [`diagramas/flujo-recuperar-password.mmd`](diagramas/flujo-recuperar-password.mmd) · Código: `RecuperarPassword.jsx`, `RestablecerPassword.jsx`, `VerificarCorreo.jsx`

```mermaid
flowchart TD
    A([Inicio: /recuperar]) --> B[/Email/]
    B --> C["POST /api/auth/forgot-password"]
    C --> D{HTTP?}
    D -- "200" --> E["Servidor (si el email existe):<br/>token aleatorio → SHA-256 en reset_token<br/>reset_token_expira = ahora + 1 h<br/>envía PASSWORD_RESET_URL?token=..."]
    D -- "503" --> F[/Aviso: correo no configurado/]
    F --> B
    D -- "400" --> G[/Error/]
    G --> B
    E --> H[[Mensaje genérico:<br/>'Si ese correo está registrado...'<br/>(anti-enumeración)]]
    H --> I([Usuario abre<br/>/restablecer/:token])
    I --> J[/Nueva contraseña x2/]
    J --> K{"Iguales y >= 8?"}
    K -- No --> J
    K -- Sí --> L["POST /api/auth/reset-password<br/>{token, password}"]
    L --> M{HTTP?}
    M -- "200" --> N["Servidor valida hash SHA-256 no expirado<br/>actualiza password_hash<br/>limpia reset_token y reset_token_expira"]
    N --> O[[Mensaje de éxito → /login<br/>tras 2.5 s]]
    M -- "400" --> P[/Token inválido o expirado/]
    P --> I
    O --> Q([Fin])
```

**Seguridad:** se guarda el **SHA-256** del token (no el token) y la respuesta es idéntica exista o no el correo.

---

## 2. Diagrama de flujo — Crear cotización

> 📄 [`diagramas/flujo-cotizacion.mmd`](diagramas/flujo-cotizacion.mmd) · Código: `pages/public/Carrito.jsx`, `context/CartContext.jsx`, `QuoteCollection`

```mermaid
flowchart TD
    A([Inicio: usuario pulsa '+']) --> B["CartContext.agregarItem(accesorio)<br/>persiste en localStorage['carrito']"]
    B --> C[[SiteHeader actualiza badge totalItems]]
    C --> D[/usuario abre la página del carrito/]
    D --> E{"¿Hay sesión?<br/>(AuthContext.usuario)"}
    E -- No --> F[[navigate('/login')]]
    F --> D
    E -- Sí --> G["Carga motos:<br/>GET /api/motos"]
    G --> H[/Selecciona una moto<br/>+ observaciones opcionales/]
    H --> I{Moto seleccionada?}
    I -- No --> J[/Error: 'Selecciona una moto'/]
    J --> H
    I -- Sí --> K["POST /api/cotizaciones<br/>{id_moto, coti_observaciones,<br/>items:[{id_accesorio, cantidad}]}<br/>Authorization: Bearer"]
    K --> L{HTTP?}
    L -- "400" --> M[/Accesorio sin precio<br/>o datos inválidos/]
    M --> H
    L -- "409" --> M
    L -- "201" --> N["Backend en transacción:<br/>· INSERT cotizacion (estado 'pendiente')<br/>· INSERT detalle_cotizacion (subtotal/total)"]
    N --> O["vaciarCarrito()"]
    O --> P[[Pantalla '¡Cotización enviada!']]
    P --> Q([Fin])

    subgraph ClienteAdmin["Gestión de la cotización (panel admin)"]
        R[[Cliente: /admin/cotizaciones]] --> S[/Pulsa Aprobar, Rechazar<br/>o Completar/]
        S --> T["PUT /api/cotizaciones/id/estado<br/>{coti_estado}"]
        T --> U["Backend:<br/>· select_for_update<br/>· UPDATE cotizacion<br/>· INSERT cotizacion_estado_hist<br/>· correo al cliente"]
        U --> V[[Lista recargada]]
    end
```

---

## 2b. Diagrama de secuencia — Crear cotización

> 📄 [`diagramas/secuencia-cotizacion.mmd`](diagramas/secuencia-cotizacion.mmd)

```mermaid
sequenceDiagram
    autonumber
    actor U as Cliente
    participant SPA as SPA React (Carrito.jsx)
    participant AX as services/api.js (axios)
    participant API as Django API
    participant DB as PostgreSQL

    U->>SPA: Pulsa "Enviar cotización"
    alt Sin sesión
        SPA-->>U: navigate('/login')
    else Con sesión
        SPA->>API: GET /api/motos
        API-->>SPA: 200 lista de motos
        U->>SPA: Selecciona moto y observaciones
        SPA->>AX: crearCotizacion(payload)
        AX->>API: POST /api/cotizaciones<br/>Authorization: Bearer
        API->>API: JWTAuthentication: decodifica y valida estado=activo
        API->>API: IsAuthenticated ✓
        API->>API: QuoteCreateSerializer valida moto y items
        API->>API: Verifica producto.precio de cada accesorio
        alt Algún accesorio sin precio
            API-->>AX: 400 {"error": ...}
            AX-->>SPA: error
            SPA-->>U: Mensaje de error
        else OK
            API->>DB: BEGIN
            API->>DB: INSERT cotizacion (estado='pendiente', total)
            API->>DB: INSERT detalle_cotizacion (n líneas)
            API->>DB: COMMIT
            DB-->>API: OK
            API-->>AX: 201 Created (QuoteSerializer)
            AX-->>SPA: cotización creada
            SPA->>SPA: vaciarCarrito()
            SPA-->>U: "¡Cotización enviada!"
        end
    end
```

---

## 3. Estados de la cotización

> 📄 [`diagramas/estados-cotizacion.mmd`](diagramas/estados-cotizacion.mmd)

```mermaid
stateDiagram-v2
    [*] --> pendiente : POST /api/cotizaciones

    pendiente --> aprobada : PUT /:id/estado<br/>{coti_estado: aprobada}<br/>[solo staff de la tienda]
    pendiente --> rechazada : PUT /:id/estado<br/>{coti_estado: rechazada}
    aprobada --> completada : PUT /:id/estado<br/>{coti_estado: completada}
    aprobada --> pendiente : PUT /:id/estado<br/>{coti_estado: pendiente}
    aprobada --> rechazada : PUT /:id/estado<br/>{coti_estado: rechazada}

    rechazada --> [*]
    completada --> [*]
```

| Transición | Quién la ejecuta | Efecto |
|---|---|---|
| (creación) → `pendiente` | Cliente | `POST /api/cotizaciones` |
| `pendiente` → `aprobada` | Staff | Historial + correo al cliente |
| `pendiente` → `rechazada` | Staff | Historial + correo al cliente |
| `aprobada` → `completada` | Staff | Historial + correo al cliente |

---

## 4. Diagrama de flujo — Movimiento de inventario

> 📄 [`diagramas/flujo-inventario.mmd`](diagramas/flujo-inventario.mmd) · Código: `pages/admin/Inventario.jsx`, `InventoryMovement` (POST)

```mermaid
flowchart TD
    A([Inicio: /admin/inventario]) --> B["GET /api/inventario<br/>(lista de la tienda del usuario)"]
    B --> C{HTTP?}
    C -- "400" --> D[/Error: el usuario no tiene tienda/]
    C -- "503" --> E[/Banner: base de datos no disponible/]
    C -- "200" --> F[[Tabla: accesorio, SKU,<br/>stock_actual, stock_minimo, badge estado]]
    F --> G[/Usuario pulsa<br/>'Registrar movimiento'/]
    G --> H[/Modal: tipo de movimiento,<br/>cantidad, observaciones/]
    H --> I{"Campos válidos?<br/>cantidad > 0"}
    I -- No --> H
    I -- Sí --> J["POST /api/inventario/movimiento<br/>{id_inventario, id_tipomov,<br/>mov_cantidad, observaciones}"]
    J --> K{HTTP?}
    K -- "404" --> L[/Inventario o tipo<br/>no encontrado/]
    L --> H
    K -- "400" --> M[/Error: el stock<br/>quedaría negativo/]
    M --> H
    K -- "201" --> N["Backend (transacción):<br/>SELECT ... FOR UPDATE<br/>entrada → cantidad = abs()<br/>salida  → cantidad = -abs()<br/>UPDATE stock_actual + estado_inventario<br/>INSERT movimiento_inventario (usuario)"]
    N --> O[[Respuesta 201:<br/>movimiento + inventarioActualizado]]
    O --> P[[Tabla recargada]]
    P --> Q([Fin])
```

**Reglas de negocio:**
- `entrada` → cantidad absoluta y **suma**; `salida` → fuerza **negativa** y resta.
- **Nunca** puede quedar `stock_actual < 0` (400).
- El estado se recalcula: `agotado` (≤0), `bajo` (≤ mínimo), `normal`.

---

## 4b. Diagrama de secuencia — Movimiento de inventario

> 📄 [`diagramas/secuencia-movimiento.mmd`](diagramas/secuencia-movimiento.mmd)

```mermaid
sequenceDiagram
    autonumber
    actor S as Staff (Vendedor/Admin)
    participant SPA as SPA React (Inventario.jsx)
    participant API as Django API
    participant DB as PostgreSQL

    S->>SPA: Abre modal "Registrar movimiento"
    S->>SPA: Elige tipo, cantidad y observaciones
    SPA->>API: POST /api/inventario/movimiento<br/>Bearer JWT
    API->>API: JWTAuthentication ✓
    API->>API: IsStoreStaff (admin o vendedor) ✓
    alt Sin JWT o rol incorrecto
        API-->>SPA: 401 / 403
    else Autorizado
        API->>DB: SELECT id_tienda del inventario
        API->>API: ¿El inventario pertenece a la tienda del usuario?
        alt No pertenece
            API-->>SPA: 404 Not Found
        else Sí
            API->>DB: BEGIN
            API->>DB: SELECT ... FOR UPDATE (inventario)
            API->>API: entrada → cantidad = abs()<br/>salida → cantidad = -abs()
            alt Stock resultante < 0
                API->>DB: ROLLBACK
                API-->>SPA: 400 "stock negativo"
            else Stock válido
                API->>DB: UPDATE inventario SET stock_actual, estado_inventario, fecha_actualizacion
                API->>DB: INSERT movimiento_inventario (usuario = request.user)
                API->>DB: COMMIT
                DB-->>API: OK
                API-->>SPA: 201 {movimiento, inventarioActualizado}
                SPA-->>S: Tabla recargada con nuevo badge de estado
            end
        end
    end
```

---

## 5. Diagrama de flujo — Visor 3D

> 📄 [`diagramas/flujo-visor3d.mmd`](diagramas/flujo-visor3d.mmd) · Código: `components/Visor3D.jsx`, `pages/public/Visualizador.jsx`

```mermaid
flowchart TD
    A([Inicio: /visualizador/:id]) --> B["GET /api/accesorios/:id<br/>(ficha del accesorio)"]
    A --> C["GET /api/modelos-3d/accesorio/:id"]
    B --> D[[Ficha: categoría, nombre,<br/>descripción, SKU, peso, precio]]
    C --> E{HTTP?}
    E -- "404" --> F((Sin modelo 3D))
    E -- "200" --> G((url_modelo3d))
    E -- "error red" --> F
    F --> H["ModeloConFallback:<br/>fallo = true<br/>→ ModeloReemplazo<br/>(torus knot #0E6E6E)"]
    G --> I["ModeloReal: useGLTF(url)<br/>carga y cachea GLTF/GLB"]
    I --> J{"Error de carga<br/>del archivo GLTF?"}
    J -- Sí --> K["ErrorBoundary3D.componentDidCatch<br/>→ onError()"]
    K --> H
    J -- No --> L["<primitive object={scene} scale={1.5}/>"]
    H --> M
    L --> M["<Canvas> three.js / React Three Fiber:<br/>· ambientLight 0.6<br/>· directionalLight [5,5,5]<br/>· Environment preset='city'<br/>· OrbitControls (min 2, max 8, sin pan)"]
    M --> N[[Usuario rota, acerca y aleja<br/>el modelo con el ratón]]
    N --> O([Fin])
```

---

## 6. Estados del usuario e inventario

> 📄 [`diagramas/estados-usuario.mmd`](diagramas/estados-usuario.mmd)

```mermaid
stateDiagram-v2
    [*] --> activo : POST /api/auth/register

    activo --> activo : PUT /api/usuarios/:id<br/>sin cambio de estado
    activo --> inactivo : PUT /api/usuarios/:id<br/>estado_usuario=inactivo
    activo --> bloqueado : DELETE /api/usuarios/:id<br/>(soft delete)
    inactivo --> activo : PUT /api/usuarios/:id
    inactivo --> bloqueado : DELETE /api/usuarios/:id
    bloqueado --> activo : PUT /api/usuarios/:id

    state "Estados del inventario" as inv {
        [*] --> normal : stock > stock_minimo
        normal --> bajo : stock <= stock_minimo
        bajo --> agotado : stock <= 0
        agotado --> bajo : entrada de stock
        bajo --> normal : stock > stock_minimo
    }
```

Solo `activo` permite iniciar sesión o autenticar un JWT.

---

## 7. Flujo transversal — salud del backend

```mermaid
flowchart LR
    A["ConnectionContext"] -->|GET /api/health cada 10 s| B{Responde?}
    B -- Sí --> C[["backend:online"<br/>se oculta BannerConexion]]
    B -- No / timeout 4 s --> D[["backend:offline"<br/>se muestra BannerConexion]]
    E["Interceptores de axios"] -->|respuesta sin datos| D
    E -->|respuesta OK| C
    D --> A
```

---

**Anterior:** [05 — Casos de uso](05-casos-de-uso.md) · **Siguiente:** [07 — Vistas del frontend](07-vistas-frontend.md)
