import api from './api';

export async function obtenerUsuarios(id_tienda) {
  const respuesta = await api.get('/usuarios', { params: { id_tienda } });
  return respuesta.data;
}

export async function registrarUsuario(datos) {
  const respuesta = await api.post('/auth/register', datos);
  return respuesta.data;
}

export async function actualizarUsuario(id, datos) {
  const respuesta = await api.put(`/usuarios/${id}`, datos);
  return respuesta.data;
}

export async function desactivarUsuario(id) {
  const respuesta = await api.delete(`/usuarios/${id}`);
  return respuesta.data;
}