import api from './api';

export async function obtenerTienda(id) {
  const respuesta = await api.get(`/tiendas/${id}`);
  return respuesta.data;
}

export async function actualizarTienda(id, datos) {
  const respuesta = await api.put(`/tiendas/${id}`, datos);
  return respuesta.data;
}