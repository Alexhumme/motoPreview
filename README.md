# MotoPreview
Aplicación de catálogo y configuración de accesorios para motocicletas. El frontend esta en React  y el backend esta en Django REST Framework para usar la base de datos PostgreSQL .

> **Documentación de la corrección P0–P3 (backend):** está en la carpeta
> `documentacion/` que acompaña a la entrega (fuera de este repositorio):
> seguridad de la API, reglas de negocio, pruebas automáticas y comandos de mantenimiento.


## 1.Activar el iniciar.bat

Darle click izquierdo al iniciar.bat en la carpeta MotoPreview

### 1.1 Crear y activar el entorno virtual


```bash
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
```

### 1.2 Verificar y arrancar

Comprobar que la configuración carga:

```bash
python manage.py check
```

Debe responder `System check identified no issues (0 silenced).`

Preparar el panel de administración de Django (solo la primera vez):

```bash
python manage.py migrate             # crea las tablas auth_* y django_* de /admin/
python manage.py createsuperuser     # define tu usuario y contraseña del panel
python manage.py collectstatic --noinput
```

El panel queda en `http://127.0.0.1:8000/admin/` (ver sección 6).

Probar la conexión con la base:

```bash
python manage.py shell -c "from django.db import connection; c=connection.cursor(); c.execute('select current_database(), current_user'); print(c.fetchone())"
```

Arrancar el servidor:

```bash
python manage.py runserver 
```

Comprobar que responde (en otra terminal):

```bash
curl http://127.0.0.1:8000/api/health
```
## 2. Resumen rápido (dos terminales)

Terminal 1, backend:

```bash
cd backend
source venv/bin/activate        
python manage.py runserver 
```

Terminal 2, frontend:

```bash
cd frontend
npm run dev
```

## 3. Solución de problemas

| Error | Causa y solución |
| --- | --- |
| `ModuleNotFoundError: No module named 'django'` | El entorno virtual no está activo. Ejecuta `source venv/bin/activate` (o `.fish`). |
| `ImproperlyConfigured: Define DJANGO_SECRET_KEY o SESSION_SECRET` | Falta `DJANGO_SECRET_KEY` en `backend/.env`, o el archivo no existe. |
| `failed to resolve host 'host'` | `MOTOPREVIEW_DATABASE_URL` todavía tiene los valores de plantilla (`USUARIO`, `HOST`…). Pon la conexión real. |
| `password authentication failed` | Contraseña incorrecta o desactualizada. Pide la cadena de conexión vigente. |
| `Network is unreachable` con direcciones `2600:...` | Intentos por IPv6 que tu red no soporta. Si también aparecen intentos por IPv4 que funcionan, se pueden ignorar. |
| El frontend no muestra datos o da error de CORS | Revisa `VITE_API_URL` en `frontend/.env.local` y `FRONTEND_ORIGINS` en `backend/.env`. |
| Un usuario no entra a `/admin/...` o recibe 403 en escrituras | No tiene rol: la tabla `usuario_rol` está vacía o le falta la fila. Asigna el rol con `python manage.py asignar_rol --email X --rol admin --permitir-remoto`. |
| `/admin/` responde **400 (DisallowedHost)** | El host usado no está en `ALLOWED_HOSTS` | Añádelo a `DJANGO_ALLOWED_HOSTS` en `backend/.env` |
| `/admin/` se ve sin estilos | Faltan los estáticos | `python manage.py collectstatic --noinput` |

**Dónde está en el código**

| Archivo | Contenido |
| --- | --- |
| `backend/motopreview/urls.py` | Todas las rutas de la API |
| `backend/api/views.py` | Vistas (endpoints) y paginación de servidor |
| `backend/api/models.py` | Modelos (`managed=False`: el esquema vive en PostgreSQL) |
| `backend/api/serializers.py` | Serializadores de entrada y salida |
| `backend/api/security.py` | Permisos `IsStoreStaff` / `IsStoreAdmin` |
| `backend/api/authentication.py` | Autenticación JWT (Bearer, expiración de 8 h) |
| `backend/api/admin.py` | Registro de las tablas en el admin de Django (`/admin/`) |
| `backend/api/errors.py` | Manejador de errores con respuestas `{ "error": ... }` |
| `backend/api/i18n.py` | Detección del idioma y traducción de los mensajes |
| `backend/api/middleware.py` | Activa el idioma en cada petición y guarda la cookie |
| `backend/api/renderers.py` | JSON con los mensajes traducidos |
| `backend/api/tests.py` | Pruebas del soporte multilingüe |
| `backend/api/test_endpoints.py` | Pruebas de endpoints, permisos y paginación |
| `backend/api/test_comandos.py` | Pruebas del comando `asignar_rol` |
| `backend/api/management/commands/seed_demo.py` | Datos de demostración |
| `backend/api/management/commands/asignar_rol.py` | Alta y asignación de roles (admin/vendedor/cliente) |

**Pruebas**

```bash
cd backend
python manage.py test api
```

No necesitan base de datos: se ejecutan igual en local y en CI.

**Roles de usuario**

El registro público solo crea clientes. Para tener administradores y vendedores
(la escritura de catálogos exige rol de administrador) usa el comando:

```bash
cd backend
python manage.py asignar_rol --listar
python manage.py asignar_rol --email admin@tienda.com --rol admin --permitir-remoto
python manage.py asignar_rol --email nuevo@tienda.com --rol vendedor --crear \
    --nombre "Nombre Apellido" --password "Secreto123" --tienda "MotoAccesorios Riohacha" \
    --permitir-remoto
```

Los roles son UUIDs fijos (admin `...0001`, vendedor `...0002`, cliente `...0003`)
y se guardan en la tabla `usuario_rol` de PostgreSQL.

**CI**

En cada *push* y *pull request* a `main`, GitHub Actions (`.github/workflows/ci.yml`)
ejecuta `manage.py check`, las pruebas del backend, `eslint` y `npm run build` del frontend.

## 4. API (JSON)

La API responde JSON en todas las rutas (`/api/...`); la raíz `/` devuelve un mensaje de
estado y `/api/health` el estado de la base de datos.

> **Formato de rutas:** se aceptan con y sin barra final (`/api/marcas` y `/api/marcas/`
> funcionan igual). El frontend usa la forma sin barra.

- **Lectura de catálogos** (`/api/marcas`, `/api/accesorios`, ...): pública.
- **Escritura de catálogos**: solo el rol administrador de tienda.
- **Inventario y cambio de estado de cotizaciones**: roles administrador y vendedor.
- **Gestión de usuarios**: solo el rol administrador.

**Paginación de servidor** (opcional, compatible con el frontend actual):

```
GET /api/accesorios                    → array completo (como siempre)
GET /api/accesorios?pagina=2&por_pagina=20
      → { "count": 57, "pagina": 2, "por_pagina": 20, "total_paginas": 3, "resultados": [...] }
```

`por_pagina` admite de 1 a 100 (20 por defecto). También aplican a `/api/usuarios`,
`/api/inventario` y `/api/cotizaciones`.

## 5. Seguridad

- `backend/.env` **no está versionado** (está en `.gitignore`). Solo existe
  `backend/.env.example` con las variables necesarias. Si clonaste un histórico que
  incluyera `.env`, rota esas credenciales: quedan en el historial de Git.
- JWT con firma HS256 y expiración de 8 horas; el token se envía en `Authorization: Bearer`.
- Los permisos se prueban en `backend/api/test_endpoints.py`.

## 6. Admin de Django (`/admin/`)

Panel propio de Django para inspeccionar y corregir las tablas de PostgreSQL.
Los modelos son `managed=False`, así que Django **no** crea ni migra tus tablas:
`manage.py migrate` únicamente crea las tablas de `auth`/`sessions`/`admin` que
necesita el panel (`auth_user`, `django_session`, `django_admin_log`, ...).

- **Acceso:** `http://127.0.0.1:8000/admin/` (en producción, `/admin/` del backend).
- **Credenciales para la revisión:**

  | Campo | Valor |
  | --- | --- |
  | URL (local) | `http://127.0.0.1:8000/admin/` |
  | URL (producción) | `https://motopreview-backend.onrender.com/admin/` |
  | Usuario | `admin` |
  | Email | `admin@motopreview.com` |
  | Contraseña | `Motopreview12345` |

  El superusuario vive en `auth_user`, es **independiente** de los usuarios de la
  aplicación (`usuario`); sirve solo para el panel. Se crea/repone con
  `python manage.py createsuperuser`. ⚠️ Al terminar la revisión conviene rotarla:
  `python manage.py changepassword admin` (este README es público).
- **Qué se registra:** todos los modelos de `api` excepto `usuario_rol`, que tiene
  clave primaria compuesta y el admin de Django no admite. Para asignar roles usa
  `python manage.py asignar_rol`.
- **Datos sensibles:** en el admin no se muestran `password_hash`, `reset_token`,
  `verificacion_token` ni el `hash` de `token`.
- **Estáticos:** WhiteNoise los sirve (también con `DEBUG=false` y con gunicorn en
  Render). Ejecuta `collectstatic` tras un despliegue.
- **Producción:** `ALLOWED_HOSTS` incluye `.onrender.com`; si usas otro dominio,
  defínelo en `DJANGO_ALLOWED_HOSTS`.
- **Idioma:** el panel se ve en **español** e **inglés** con el selector
  *Idioma / Language* (o `?lang=en` / `?lang=es`). La API también responde en ambos
  idiomas con `?lang=` o el encabezado `X-Language`.

