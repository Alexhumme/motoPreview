import api from './api';

export async function obtenerMotos() {
  const respuesta = await api.get('/motos');
  return respuesta.data;
}