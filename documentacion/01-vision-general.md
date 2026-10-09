# 01 — Visión General

## 1. Descripción del producto

**MotoPreview** es una aplicación web que permite:

1. **Publicar un catálogo** de accesorios para motocicletas (nombre, precio, SKU, categoría, peso, imagen).
2. **Visualizar los accesorios en 3D** (modelos GLTF/GLB) antes de comprarlos.
3. **Configurar una moto** y ver *únicamente* los accesorios compatibles con su modelo.
4. **Armar un carrito y enviar una cotización**, que la tienda aprueba, rechaza o completa.
5. **Gestionar el negocio** desde un panel administrativo: inventario con movimientos (entradas/salidas), cotizaciones, catálogo de accesorios y compatibilidades, usuarios de la tienda, plan de suscripción y reportes.

La plataforma es **multi-tienda**: cada tienda (con su plan de suscripción) tiene su propio inventario, sus usuarios y sus cotizaciones.

## 2. Objetivos

| Objetivo | Cómo se logra |
|---|---|
| Reducir devoluciones por accesorios incompatibles | Matriz de compatibilidad `accesorio ↔ modelo_moto` con rango de años |
| Mejorar la conversión de compras | Visor 3D interactivo y configurador con filtro en tiempo real |
| Digitalizar la gestión de tienda | Panel admin con inventario, cotizaciones, usuarios y reportes |
| Escalar sin servidor propio | SPA en Vercel + API en Render + Postgres serverless (Neon) |
| Soportar español e inglés | Motor i18n propio (`i18n.py`, ~90 mensajes) con selector por query/header/cookie |

## 3. Alcance

### Dentro del alcance
- Autenticación por JWT con verificación de correo y recuperación de contraseña.
- 3 roles: **Administrador**, **Vendedor** y **Cliente**.
- Catálogo público con búsqueda, filtros y paginación.
- Configurador de motos con accesorios compatibles.
- Carrito persistente (localStorage) → cotización.
- Ciclo de vida de cotizaciones con historial de estados y notificación por correo.
- Inventario por tienda con movimientos transaccionales (sin stock negativo).
- Visor 3D con fallback geométrico.
- Límites de productos/usuarios según el plan de suscripción.

### Fuera del alcance (hoy)
- Pasarela de pagos / compra directa (solo cotización).
- Gestión de envíos y logística.
- App móvil nativa.
- Panel super-administrativo de la plataforma (alta de tiendas/planes desde UI).
- Migraciones de Django (el esquema de BD se gestiona fuera de Django).

## 4. Stack tecnológico

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| React | ^19.2.8 | UI (SPA) |
| React Router | ^7.18.3 | Enrutamiento client-side |
| Vite | ^8.2.2 | Bundler / dev server |
| Axios | ^1.20.0 | Cliente HTTP con interceptores |
| three.js | ^0.185.1 | Render 3D |
| @react-three/fiber | ^9.7.0 | Declaración de escenas three.js en React |
| @react-three/drei | ^10.7.8 | `useGLTF`, `OrbitControls`, `Environment` |
| Context API | — | Estado global (Auth, Cart, Connection) |
| ESLint | ^10.9.0 | Lint (flat config) |

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Django | >=5.2,<7.0 | Framework web |
| djangorestframework | >=3.16,<4.0 | API REST |
| django-cors-headers | >=4.7,<5.0 | CORS |
| psycopg[binary] | >=3.2,<4.0 | Driver PostgreSQL |
| PyJWT | >=2.10,<3.0 | Tokens JWT HS256 |
| bcrypt | >=4.2,<6.0 | Hash de contraseñas (12 rounds) |
| gunicorn | >=23.0,<27.0 | Servidor WSGI (producción) |
| python-dotenv | >=1.0,<2.0 | Carga de `.env` |

### Datos e infraestructura
| Componente | Tecnología |
|---|---|
| Base de datos | PostgreSQL serverless (**Neon**, `us-east-2`), vía pooler |
| Frontend en producción | **Vercel** (`https://motopreview.vercel.app`) |
| Backend en producción | **Render** (`https://motopreview-backend.onrender.com/api`) |
| Correo | SMTP (configurable; opcional en desarrollo) |

## 5. Estructura del repositorio

```
motoPreview/
├── README.md                  # Instrucciones de arranque
├── iniciar.bat                # Launcher local (Windows): backend + frontend
├── vercel.json                # Rewrites SPA para Vercel
├── backend/
│   ├── .env / .env.example    # Secrets y URL de BD
│   ├── requirements.txt
│   ├── manage.py
│   ├── motopreview/           # Proyecto Django (settings, urls, wsgi, asgi)
│   ├── templates/admin/       # base_site.html (selector de idioma del admin)
│   └── api/                   # Única app
│       ├── models.py          # 21 modelos (mapeo a BD existente, managed=False)
│       ├── views.py           # ~1116 líneas: endpoints REST
│       ├── serializers.py     # Serializers de salida y de entrada
│       ├── authentication.py  # JWTAuthentication (Bearer)
│       ├── security.py        # Roles fijos + IsStoreStaff / IsStoreAdmin
│       ├── middleware.py       # LanguageMiddleware (es/en)
│       ├── i18n.py            # Catálogo de traducciones es→en
│       ├── renderers.py       # TranslatedJSONRenderer
│       ├── errors.py          # Handler de excepciones ({"error": ...})
│       ├── fields.py          # PostgreSQLEnumField (enums nativos PG)
│       ├── admin.py           # Registro de las tablas en el admin de Django
│       ├── tests.py           # Tests de i18n/selección de idioma
│       ├── test_endpoints.py  # Pruebas de endpoints, permisos y paginación
│       ├── test_comandos.py   # Pruebas del comando asignar_rol
│       └── management/commands/
│           ├── seed_demo.py   # Datos de demostración
│           └── asignar_rol.py # Alta y asignación de roles de usuario
└── frontend/
    ├── package.json / vite.config.js / vercel.json
    ├── .env.local             # VITE_API_URL
    └── src/
        ├── App.jsx            # Todas las rutas
        ├── config.js          # API_URL
        ├── constants/         # roles.js, tiposMovimiento.js
        ├── context/           # AuthContext, CartContext, ConnectionContext
        ├── services/          # 10 módulos de acceso a la API
        ├── components/        # SiteHeader, Footer, AdminLayout, Visor3D, ...
        └── pages/             # public/, auth/, admin/
```

## 6. Glosario

| Término | Definición |
|---|---|
| **Accesorio** | Registro `Accessory` que *envuelve* un `Product` (nombre, precio, SKU e imagen viven en `producto`) |
| **Compatibilidad** | Relación N:M entre un accesorio y un `MotorcycleModel`, opcionalmente con rango de años (`anio_desde`–`anio_hasta`) |
| **Cotización** | Solicitud de compra de accesorios para una moto; tiene detalle (líneas), total e historial de estados |
| **Movimiento de inventario** | Registro de entrada o salida de stock que actualiza `stock_actual` de forma transaccional |
| **Plan de suscripción** | Define límites (`limite_productos`, `limite_usuarios`) aplicados al dar de alta productos e usuarios |
| **Modelo 3D** | URL de un archivo GLTF/GLB asociado a un accesorio para su visualización |
| **Store staff** | Usuario con rol Administrador o Vendedor de una tienda |
| **`DatabaseModel`** | Clase base abstracta de los modelos: `managed=False`, Django no crea ni migra tablas |
| **ROL_ADMIN / ROL_VENDEDOR / ROL_CLIENTE** | UUIDs fijos de roles (`...0001`, `...0002`, `...0003`) |

## 7. Datos semilla (roles y constantes fijas)

| Constante | Valor |
|---|---|
| `ROL_ADMIN` | `11111111-0000-0000-0000-000000000001` |
| `ROL_VENDEDOR` | `11111111-0000-0000-0000-000000000002` |
| `ROL_CLIENTE` | `11111111-0000-0000-0000-000000000003` |
| `TIENDA_PRINCIPAL` | `33333333-0000-0000-0000-000000000001` |
| `TIPO_ENTRADA` | `cccccccc-0000-0000-0000-000000000001` |
| `TIPO_SALIDA` | `cccccccc-0000-0000-0000-000000000002` |
| `TIPO_AJUSTE` | `cccccccc-0000-0000-0000-000000000003` |

---

**Siguiente:** [02 — Arquitectura](02-arquitectura.md)
