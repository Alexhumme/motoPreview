import api from './api';

/**
 * Resumen del día para el dashboard.
 *
 * El personal de tienda siempre recibe el de SU tienda (el parámetro no abre
 * una tienda ajena). El superadmin recibe el consolidado de todas las tiendas
 * y, con `idTienda`, el desglose de esa tienda específica.
 */
export async function obtenerResumenDia(idTienda) {
  const params = idTienda ? { id_tienda: idTienda } : {};
  const respuesta = await api.get('/reportes/resumen', { params });
  return respuesta.data;
}

export async function obtenerResumenPanel({ comparar = false, desde, hasta } = {}) {
  const params = {};
  if (comparar) params.comparar = 1;
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  const respuesta = await api.get('/panel/resumen', { params });
  return respuesta.data;
}
