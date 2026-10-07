# MotoPreview
Aplicación de catálogo y configuración de accesorios para motocicletas. El frontend esta en React  y el backend esta en Django REST Framework para usar la base de datos PostgreSQL .


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

**Dónde está en el código**

| Archivo | Contenido |
| --- | --- |
| `backend/api/i18n.py` | Detección del idioma, textos de las páginas y traducciones de los mensajes |
| `backend/api/middleware.py` | Activa el idioma en cada petición y guarda la cookie |
| `backend/api/renderers.py` | JSON con mensajes traducidos y vista HTML con tabla |
| `backend/api/pages.py` | Datos comunes de las páginas (menú, selector de idioma) |
| `backend/api/templates/api/` | Plantillas `base.html`, `landing.html` y `table.html` (diseño) |
| `backend/api/tests.py` | Pruebas del soporte multilingüe |

**Pruebas** 

```bash
cd backend
python manage.py test api
```

## Páginas del backend

Al abrir el backend en el navegador se ve una portada (`/`) y una tabla con buscador y modo
claro/oscuro para cada ruta (`/api/accesorios`, `/api/marcas`, ...). El botón **Ver JSON** (o
`?format=json`) muestra la respuesta cruda. Los clientes que piden JSON, como el frontend o
`curl`, siguen recibiendo JSON. Los estilos están en `backend/api/templates/api/base.html`
(variables de color al inicio, `--accent` para el color principal).

