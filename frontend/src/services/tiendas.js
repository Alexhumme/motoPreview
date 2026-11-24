import api from './api';

function lista(respuesta) {
  return Array.isArray(respuesta) ? respuesta : respuesta.resultados || [];
}

export async function obtenerTiendas() {
  const respuesta = await api.get('/tiendas');
  return lista(respuesta.data);
}

export async function obtenerTienda(id) {
  const respuesta = await api.get(`/tiendas/${id}`);
  return respuesta.data;
}

export async function obtenerPlanesSuscripcion() {
  const respuesta = await api.get('/planes-suscripcion');
  return lista(respuesta.data);
}

export async function crearTienda(datos) {
  const respuesta = await api.post('/tiendas', datos);
  return respuesta.data;
}

export async function actualizarTienda(id, datos) {
  const respuesta = await api.patch(`/tiendas/${id}`, datos);
  return respuesta.data;
}

export async function eliminarTienda(id) {
  const respuesta = await api.delete(`/tiendas/${id}`);
  return respuesta.data;
}
