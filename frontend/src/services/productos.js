import api from './api';

// Vidriera: todos los productos (accesorios y no accesorios) en forma plana.
export async function obtenerProductos() {
  const respuesta = await api.get('/productos');
  return respuesta.data;
}
