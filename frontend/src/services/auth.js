import api from './api';

export async function registrarCliente(datos) {
  const respuesta = await api.post('/auth/register', datos);
  return respuesta.data;
}

export async function solicitarRecuperacion(usu_email) {
  const respuesta = await api.post('/auth/forgot-password', { usu_email });
  return respuesta.data;
}

export async function restablecerPassword(token, password) {
  const respuesta = await api.post('/auth/reset-password', { token, password });
  return respuesta.data;
}

export async function verificarCorreo(token) {
  const respuesta = await api.get(`/auth/verificar/${token}`);
  return respuesta.data;
}

// RBAC - Permisos
export async function obtenerPermisosUsuario() {
  const respuesta = await api.get('/permisos/usuario');
  return respuesta.data;
}

export async function obtenerRecursosConPermisos(rolId) {
  const respuesta = await api.get('/recursos-con-permisos', { params: { rol_id: rolId } });
  return respuesta.data;
}

export async function obtenerRecursos() {
  const respuesta = await api.get('/recursos');
  return respuesta.data;
}

export async function obtenerAcciones() {
  const respuesta = await api.get('/acciones');
  return respuesta.data;
}

export async function obtenerRecursoAcciones() {
  const respuesta = await api.get('/recurso-acciones');
  return respuesta.data;
}

export async function obtenerRolRecursos() {
  const respuesta = await api.get('/rol-recursos');
  return respuesta.data;
}

export async function crearRolRecurso(datos) {
  const respuesta = await api.post('/rol-recursos', datos);
  return respuesta.data;
}

export async function actualizarRolRecurso(id, datos) {
  const respuesta = await api.put(`/rol-recursos/${id}`, datos);
  return respuesta.data;
}

export async function eliminarRolRecurso(id) {
  const respuesta = await api.delete(`/rol-recursos/${id}`);
  return respuesta.data;
}