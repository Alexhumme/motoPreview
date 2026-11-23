# 10 — Guía del Desarrollador

## 1. Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Python | 3.11+ (probado con 3.13) |
| Node.js | 18+ (con npm) |
| PostgreSQL | cualquier 13+ (o cuenta en Neon) |
| Git | — |

## 2. Estructura y responsabilidades por archivo

### Backend (`backend/`)

| Archivo | Responsabilidad |
|---|---|
| `motopreview/settings.py` | Apps, middleware, DB (parseo de URL), DRF, CORS, i18n, env vars |
| `motopreview/urls.py` | Todas las rutas `/api/...` (sin router de DRF) |
| `api/models.py` | 21 modelos sobre una BD existente (`managed=False`) |
| `api/views.py` | Lógica de negocio y endpoints (~1116 líneas) |
| `api/serializers.py` | Validación/transformación de entrada y salida |
| `api/authentication.py` | `JWTAuthentication` + `AnonymousPrincipal` |
| `api/security.py` | UUIDs de roles, `IsStoreStaff`, `IsStoreAdmin` |
| `api/middleware.py` | `LanguageMiddleware` (idioma + cookie `mp_lang`) |
| `api/i18n.py` | Catálogo es→en (~90 mensajes) + `translate_payload` |
| `api/renderers.py` | `TranslatedJSONRenderer` |
| `api/errors.py` | Handler → `{"error": ...}` |
| `api/fields.py` | `PostgreSQLEnumField` (enums nativos PG) |
| `api/admin.py` | Registro de las tablas en el admin de Django (`/admin/`) |
| `templates/admin/base_site.html` | Selector de idioma (es/en) del admin |
| `api/tests.py` | Tests de i18n y selección de idioma |
| `api/test_endpoints.py` | Tests de endpoints, permisos y paginación (sin BD) |
| `api/test_comandos.py` | Tests del comando `asignar_rol` (sin BD) |
| `api/management/commands/seed_demo.py` | Datos de demostración reproducibles |
| `api/management/commands/asignar_rol.py` | Alta y asignación de roles (admin/vendedor/cliente), con `--listar` |

### Frontend (`frontend/src/`)

| Carpeta | Responsabilidad |
|---|---|
| `App.jsx` | Definición completa de rutas y guardas |
| `config.js` | `API_URL` (`VITE_API_URL` o fallback de Render) |
| `context/` | Estado global: Auth, Cart, Connection |
| `services/` | Acceso a la API (axios) — único punto que habla con el backend |
| `components/` | UI reutilizable (header, footer, layout, visor 3D, modales) |
| `pages/public|auth|admin` | Vistas |
| `constants/` | UUIDs de roles y tipos de movimiento |

## 3. Convenciones del proyecto

- **Idioma:** nombres de funciones/variables en español (`obtenerAccesorios`, `manejarEnvio`).
- **BD:** nombres de tablas y columnas en español; claves PK en `UUID`.
- **Estilos:** un `.css` por componente, convención BEM.
- **Respuestas de API:** siempre `{"error": ...}` en fallos y `{"mensaje": ...}` en éxitos (traducibles).
- **Permisos:** declarados explícitamente por vista (`permission_classes`), nunca por defecto.
- **HTTP:** `GET` público de catálogos; escritura siempre con `Bearer`.

## 4. Comandos útiles

```bash
# Backend
python manage.py check                     # verificación de configuración
python manage.py runserver                 # desarrollo (8000)
python manage.py test api                  # pruebas (i18n)
python manage.py seed_demo --cantidad 50   # datos demo (solo BD local)
python manage.py seed_demo --borrar        # elimina datos [DEMO]

# Frontend
npm run dev      # Vite (5173)
npm run build    # build de producción → dist/
npm run lint     # ESLint
npm run preview  # previsualizar el build
```

## 5. Cómo agregar un nuevo endpoint (patrón existente)

1. **Modelo** en `api/models.py` (hereda `DatabaseModel`, `db_table` + `managed=False`).
2. **Serializer** en `api/serializers.py`.
3. **Vista**: reutilizar `ResourceCollection`/`ResourceDetail` o crear una FBV/clase con `permission_classes`.
4. **Ruta** en `motopreview/urls.py`.
5. **Service** en `frontend/src/services/` usando la instancia `api` de `api.js`.
6. **UI**: consumir el service desde la página correspondiente.

> Como `managed=False`, **no** ejecutar `makemigrations` para `api` ni usar `migrate --run-syncdb`: las 21 tablas deben existir previamente en PostgreSQL. `manage.py migrate` solo se usa para crear/actualizar las tablas internas del admin de Django (`auth_*`, `django_*`).

## 6. Cómo agregar una vista/página

1. Crear `pages/<grupo>/<Vista>.jsx` + `.css`.
2. Registrar la ruta en `App.jsx` (envolver en `RutaProtegida` con `rolesPermitidos` si es privada).
3. Si es de panel: añadir el enlace en `AdminLayout.jsx` (condicionado por rol).
4. Reutilizar `SiteHeader`/`Footer` en las páginas públicas.

## 7. Pruebas

- Backend: `python manage.py test api` — **72 pruebas** sin base de datos:
  - `tests.py`: soporte multilingüe (traducción de mensajes, selección de idioma, cookies, `Accept-Language` ignorado en JSON).
  - `test_endpoints.py`: permisos por rol en catálogos, inventario, cotizaciones y usuarios (401/403/503), autenticación JWT (token inválido, expirado, sin usuario), paginación de servidor y rutas.
  - `test_comandos.py`: resolución de nombres de rol del comando `asignar_rol` (sin BD).
- Frontend: no hay pruebas unitarias (solo ESLint: `npm run lint`, **0 errores**).

## 8. Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| Toda la API responde **503** | Falta `MOTOPREVIEW_DATABASE_URL` | Completar `backend/.env` |
| `ImproperlyConfigured` al arrancar | Falta `DJANGO_SECRET_KEY`/`SESSION_SECRET` | Definirla en `.env` |
| **401** en todas las peticiones autenticadas | `JWT_SECRET` distinto o token expirado (8 h) | Volver a hacer login; revisar env |
| **403** en login | Usuario `inactivo`/`bloqueado` | Activarlo desde `/admin/usuarios` |
| **403** en escrituras o no se entra a `/admin/...` | Usuario sin fila en `usuario_rol` (sin rol) | `python manage.py asignar_rol --email X --rol admin\|vendedor\|cliente [--permitir-remoto]` |
| `/admin/` responde **400 (DisallowedHost)** | El host no está en `ALLOWED_HOSTS` | Añadirlo a `DJANGO_ALLOWED_HOSTS` |
| `/admin/` se ve sin estilos | Faltan los estáticos | `python manage.py collectstatic --noinput` |
| `/admin/` pide login de nuevo o da error de sesión | No se ejecutó `migrate` (falta `django_session`) | `python manage.py migrate` |
| **409** al crear accesorio/compatibilidad | Violación de `UNIQUE` | Editar el registro existente |
| **403** al dar de alta inventario | Alcanzado `limite_productos` del plan | Subir el plan en `plan_subscripcion` |
| Banner "No pudimos conectar" | Backend caído o CORS | Revisar `FRONTEND_ORIGINS`, `ALLOWED_HOSTS` y el servicio en Render |
| Modelos 3D no cargan | URL externa sin CORS o caída | Verificar `url_modelo3d` accesible con CORS |
| Correos no llegan | SMTP sin configurar | Definir `EMAIL_*` en el entorno |

> El `README.md` de la raíz ya fue actualizado: el mapa de archivos refleja el código real (se eliminaron las referencias a `pages.py` y `templates/api/`, que ya no existen).

## 9. Backlog técnico recomendado

| Prioridad | Item |
|:-:|---|
| ✅ | ~~Excluir `backend/.env` del repo~~ — hecho (`git rm --cached` + `.gitignore`); **rotar secretos** si el histórico llegó a publicarse |
| ✅ | ~~Restringir escritura de catálogos a `IsStoreAdmin`~~ — hecho y probado |
| ✅ | ~~Paginación de servidor~~ — hecho (`?pagina=`/`?por_pagina=`, retrocompatible) |
| ✅ | ~~Tests de endpoints y permisos~~ — `backend/api/test_endpoints.py` (sin BD) |
| ✅ | ~~CI con GitHub Actions~~ — `.github/workflows/ci.yml` (check + pruebas + eslint + build) |
| 🔴 Alta | ~~Añadir `DJANGO_ALLOWED_HOSTS` = host de Render~~ — hecho: `.onrender.com` está en los valores por defecto |
| 🟠 Media | Filtros de servidor (`?q=`) y filtrado de listados admin por tienda en el servidor |
| 🟡 Baja | Centralizar el helper de formato COP |
| 🟡 Baja | Importar `constants/roles.js` en `SiteHeader` (hoy compara literales) |
| 🟡 Baja | Endurecer el admin en producción: `SECURE_SSL_REDIRECT`/HSTS y `SECURE_PROXY_SSL_HEADER` (Render) |
| 🟡 Baja | Refresh de token y cierre de sesión por expiración |
| 🟡 Baja | Exponer endpoints para `configuracion` / `configuracion_detalle` (tablas ya existentes) |

---

**Anterior:** [09 — Despliegue](09-despliegue.md) · **Volver al** [Índice](README.md)
