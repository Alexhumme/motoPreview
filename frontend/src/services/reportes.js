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
