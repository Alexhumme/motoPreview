# MotoPreview

Catálogo y configurador de accesorios para motocicletas. Frontend en **React** (Vite), backend en **Django REST Framework** (API JSON) y base de datos **PostgreSQL**.

## Cómo correrlo

La forma más simple es dar doble clic a `iniciar.bat` en la raíz del proyecto: arranca el backend (puerto 8001) y el frontend (puerto 5173) en ventanas separadas y abre el navegador.

**O manualmente:**

**Backend** (terminal 1):

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # en bash: source venv/bin/activate
pip install -r requirements.txt
# copia .env.example a .env y completa MOTOPREVIEW_DATABASE_URL (PostgreSQL)
python manage.py migrate
python manage.py runserver 127.0.0.1:8001
```

**Frontend** (terminal 2):

```bash
cd frontend
npm install
# opcional: echo VITE_API_URL=http://127.0.0.1:8001/api > .env.local
npm run dev
```

Abre http://localhost:5173 (el backend queda en http://127.0.0.1:8001).

> **Nota:** el puerto 8000 suele estar ocupado por otros proyectos (por ejemplo BrasaGo en WSL); por eso MotoPreview usa el **8001**. Si el 8001 también está ocupado, cambia `PORT` en `iniciar.bat`.

## Credenciales

| Rol | Correo | Contraseña |
|---|---|---|
| Superadmin | `superadmin@motopreview.com` | `Super2026` |

> La contraseña del superadmin debe cambiarse tras el primer login. Para restablecerla usa `backend/scripts/restablecer_password_superadmin.py` (escribe el hash bcrypt que verifica el login; `manage.py changepassword` no sirve aquí porque genera PBKDF2).

## Dónde revisar cada parte

| Qué | Dónde |
|---|---|
| **Panel de administración** | http://127.0.0.1:8001/admin/ — usuario Django independiente de la tabla `usuario` (`createsuperuser`) |
| **Consola de Seguridad (RBAC)** | http://localhost:5173/admin/permisos (solo Superadmin edita la matriz; Admin de tienda gestiona roles) |
| API | http://127.0.0.1:8001/api/... — JSON para el frontend; abierto en un navegador muestra la interfaz navegable de DRF. Docs interactivas: http://127.0.0.1:8001/api/docs/ |
| Catálogo en la API | `/api/health` · `/api/categorias` · `/api/marcas` · `/api/modelos-moto` · `/api/motos` · `/api/accesorios` · `/api/productos` · `/api/compatibilidad` · `/api/roles` · `/api/tiendas` · `/api/usuarios` |
| Rutas de la API | `backend/motopreview/urls.py` |

## Funcionalidades principales

- **Catálogo y carrito** de accesorios con placeholder "FOTO PENDIENTE".
- **Configurador 3D** (lazy-loaded) de accesorios compatibles por modelo de moto.
- **RBAC**: matriz de permisos (15 recursos × 6 acciones = 90 combos) editable solo por Superadmin; roles CRUD por Admin de tienda.
- **Dashboard** con métricas por tienda y consolidado para Superadmin.
- **Tema oscuro/claro** con conmutador persistente (sol/luna).
- **Marca** con el logo del casco (modo oscuro: logo v2; modo claro: casco sobre chip blanco).

## Despliegue

- Frontend: Vercel (configurado con `vercel.json`).
- Backend: Render (`motopreview-backend.onrender.com`), con base de datos PostgreSQL en Neon.
- Pasos detallados: [`documentacion/despliegue-en-render.md`](documentacion/despliegue-en-render.md).

## Documentación técnica

Ver [`documentacion/`](documentacion/) — arquitectura, modelo de datos, API REST, casos de uso, flujos, vistas frontend, seguridad, despliegue y guía del desarrollador.