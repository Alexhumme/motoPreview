# MotoPreview — versión rediseñada

Esta copia conserva la API Express/Prisma y la lógica del proyecto original, pero incorpora el sistema visual rediseñado en el frontend:

- catálogo con búsqueda, categorías y paginación;
- configurador conectado a compatibilidad real;
- carrito con solicitud de cotización;
- autenticación y registro conectados al backend;
- panel administrativo con permisos y datos reales;
- diseño responsive para móvil y escritorio.

## Ejecutar el frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend usa `VITE_API_URL` si está definida. Si no, utiliza la API desplegada original.

## Ejecutar el backend

```bash
cd backend
npm install
npm run dev
```

Configura las variables de entorno del backend en un archivo `.env` local. No incluyas credenciales en este repositorio.

## Verificación realizada

```bash
cd frontend
npm run build
```

El build de producción se completó correctamente. El lint del repositorio original conserva avisos previos en varios contextos y páginas administrativas que no forman parte del rediseño.