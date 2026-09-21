import api from './api';

export async function obtenerAccesorios() {
  const respuesta = await api.get('/accesorios');
  return respuesta.data;
}

export async function obtenerCategorias() {
  const respuesta = await api.get('/categorias');
  return respuesta.data;
}

export async function crearAccesorio(datos) {
  const respuesta = await api.post('/accesorios', datos);
  return respuesta.data;
}

export async function actualizarAccesorio(id, datos) {
  const respuesta = await api.put(`/accesorios/${id}`, datos);
  return respuesta.data;
}
