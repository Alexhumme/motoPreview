import api from './api';

function lista(respuesta) {
  return Array.isArray(respuesta.data) ? respuesta.data : respuesta.data.resultados || [];
}

export async function obtenerAccesorios() {
  return lista(await api.get('/accesorios'));
}

export async function obtenerProductos() {
  return lista(await api.get('/productos'));
}

export async function obtenerCategorias() {
  return lista(await api.get('/categorias-producto'));
}

export async function obtenerTiposProducto() {
  return lista(await api.get('/tipos-producto'));
}

export async function obtenerMarcasProducto() {
  return lista(await api.get('/marcas-producto'));
}

export async function crearProducto(datos) {
  const respuesta = await api.post('/productos', datos);
  return respuesta.data;
}

export async function actualizarProducto(id, datos) {
  const respuesta = await api.put(`/productos/${id}`, datos);
  return respuesta.data;
}
