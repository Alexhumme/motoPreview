import api from './api';

export async function obtenerInventario() {
  const respuesta = await api.get('/inventario');
  return respuesta.data;
}

export async function registrarMovimiento(datos) {
  const respuesta = await api.post('/inventario/movimiento', datos);
  return respuesta.data;
}