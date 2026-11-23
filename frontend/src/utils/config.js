// Base de la API.
// - En desarrollo (npm run dev): backend local de Django en el puerto 8000.
// - En producción (build desplegado): backend de Render.
// - Siempre se puede forzar una URL distinta con la variable VITE_API_URL.
const FALLBACK = import.meta.env.DEV
  ? "http://localhost:8000/api"
  : "https://motopreview-backend.onrender.com/api";

export const API_URL = import.meta.env.VITE_API_URL || FALLBACK;
