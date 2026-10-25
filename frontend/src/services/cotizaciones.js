import api from './api';

export async function obtenerCotizaciones(idTienda) {
  const params = idTienda ? { id_tienda: idTienda } : {};
  const respuesta = await api.get('/cotizaciones', { params });
  return respuesta.data;
}

export async function cambiarEstadoCotizacion(id, coti_estado) {
  const respuesta = await api.put(`/cotizaciones/${id}/estado`, { coti_estado });
  return respuesta.data;
}

export async function crearCotizacion(datos) {
  const respuesta = await api.post('/cotizaciones', datos);
  return respuesta.data;
}