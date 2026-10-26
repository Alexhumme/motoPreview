import api from './api';

/**
 * Resumen del día para el dashboard (solo personal de tienda).
 * El backend filtra siempre por la tienda del usuario autenticado.
 */
export async function obtenerResumenDia() {
  const respuesta = await api.get('/reportes/resumen');
  return respuesta.data;
}
