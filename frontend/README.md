# MotoPreview — Frontend

Aplicación **React 19 + Vite** (SPA) del catálogo, configurador 3D y gestión de
cotizaciones de accesorios para motocicletas.

## Scripts

| Comando | Descripción |
|---|---|
| `npm install` | Instala las dependencias |
| `npm run dev` | Servidor de desarrollo en <http://localhost:5173> |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción |
| `npm run lint` | ESLint (0 errores obligatorios) |

## Configuración

Copia `.env.example` a `.env.local` y define la URL del backend:

```
VITE_API_URL=http://127.0.0.1:8000/api
```

Si no se define, `src/config.js` usa el backend de Render por defecto.

## Documentación

- [README raíz](../README.md) — puesta en marcha de todo el proyecto (backend + frontend).
- [`documentacion/`](../../documentacion/README.md) — documentación técnica (arquitectura, API, vistas, etc.).
