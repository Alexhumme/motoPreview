import api from './api';

export async function obtenerRoles() {
  const respuesta = await api.get('/roles');
  return respuesta.data;
}

export async function crearRol(datos) {
  const respuesta = await api.post('/roles', datos);
  return respuesta.data;
}

export async function actualizarRol(id, datos) {
  const respuesta = await api.put(`/roles/${id}`, datos);
  return respuesta.data;
}

export async function desactivarRol(id) {
  const respuesta = await api.delete(`/roles/${id}`);
  return respuesta.data;
}

export async function obtenerRol(id) {
  const respuesta = await api.get(`/roles/${id}`);
  return respuesta.data;
}

export async function obtenerPermisosRol(rolId) {
  const respuesta = await api.get('/recursos-con-permisos', { params: { rol_id: rolId } });
  return respuesta.data;
}

export async function actualizarPermisosRol(rolId, permisos) {
  const respuesta = await api.put(`/roles/${rolId}/permisos`, { permisos });
  return respuesta.data;
}