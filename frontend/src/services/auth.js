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