# MotoPreview

Catálogo y configurador de accesorios para motocicletas. Frontend en **React** (Vite), backend en **Django REST Framework** (API JSON) y base de datos **PostgreSQL**.

## Cómo correrlo

**En la carepta click izquierdo en iniciar.bat**

**O tambien**

**Backend** (terminal 1):

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # en bash: source venv/bin/activate
pip install -r requirements.txt
# copia .env.example a .env y completa MOTOPREVIEW_DATABASE_URL (PostgreSQL)
python manage.py migrate       # solo crea las tablas del panel (auth/admin)
python manage.py runserver
```

**Frontend** (terminal 2):

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173 (el backend queda en http://127.0.0.1:8000).

## Dónde revisar cada parte

| Qué | Dónde |
| --- | --- |
| **Panel de administración** | http://127.0.0.1:8000/admin/ → usuario `admin`, contraseña `Motopreview12345` |
| API | http://127.0.0.1:8000/api/... → JSON para el frontend; **abierto en un navegador muestra la interfaz navegable de DRF** |
| Catálogo en la API | `/api/health` · `/api/categorias` · `/api/marcas` · `/api/modelos-moto` · `/api/motos` · `/api/accesorios` · `/api/productos` · `/api/categorias-producto` · `/api/tipos-accesorio` · `/api/compatibilidad` · `/api/modelos-3d` · `/api/roles` · `/api/tiendas` · `/api/planes-suscripcion` · `/api/tipos-movimiento` · `/api/configuraciones` · `/api/usuarios` · `/api/inventario` · `/api/cotizaciones` |
| Rutas de la API | `backend/motopreview/urls.py` |
| Vistas / endpoints | `backend/api/views.py` |
| Modelos (tablas) | `backend/api/models.py` (esquema real en PostgreSQL: `managed=False`) |
| Serializers | `backend/api/serializers.py` |
| Seguridad (JWT, permisos) | `backend/api/authentication.py`, `backend/api/security.py` |
| Pruebas | `cd backend && python manage.py test api` |