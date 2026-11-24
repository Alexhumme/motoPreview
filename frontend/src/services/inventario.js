import api from './api';

export async function obtenerInventario(idTienda) {
  const params = idTienda ? { id_tienda: idTienda } : {};
  const respuesta = await api.get('/inventario', { params });
  return respuesta.data;
}

export async function crearInventario(datos) {
  const respuesta = await api.post('/inventario', datos);
  return respuesta.data;
}

export async function actualizarInventario(id, datos) {
  const respuesta = await api.patch(`/inventario/${id}`, datos);
  return respuesta.data;
}

export async function registrarMovimiento(datos) {
  const respuesta = await api.post('/inventario/movimiento', datos);
  return respuesta.data;
}

export async function obtenerMovimientos(idInventario, idTienda) {
  const params = {};
  if (idInventario) params.id_inventario = idInventario;
  if (idTienda) params.id_tienda = idTienda;
  const respuesta = await api.get('/inventario/movimiento', { params });
  return respuesta.data;
}
