import api from './api';

export async function obtenerAccesorios() {
  const respuesta = await api.get('/accesorios');
  return respuesta.data;
}

export async function obtenerCategorias() {
  const respuesta = await api.get('/categorias');
  return respuesta.data;
}