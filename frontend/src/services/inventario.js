import api from './api';

export async function obtenerInventario(idTienda) {
  const params = idTienda ? { id_tienda: idTienda } : {};
  const respuesta = await api.get('/inventario', { params });
  return respuesta.data;
}

export async function registrarMovimiento(datos) {
  const respuesta = await api.post('/inventario/movimiento', datos);
  return respuesta.data;
}