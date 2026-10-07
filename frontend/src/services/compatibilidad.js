import api from './api';

export async function obtenerAccesoriosCompatibles(id_modelo_moto) {
  const respuesta = await api.get(`/compatibilidad/modelo/${id_modelo_moto}`);
  return respuesta.data;
}

export async function obtenerModelosCompatibles(id_accesorio) {
  const respuesta = await api.get(`/compatibilidad/accesorio/${id_accesorio}`);
  return respuesta.data;
}

export async function marcarCompatible(id_accesorio, id_modelo_moto) {
  const respuesta = await api.post('/compatibilidad', { id_accesorio, id_modelo_moto });
  return respuesta.data;
}

export async function quitarCompatible(id_compatibilidad) {
  const respuesta = await api.delete(`/compatibilidad/${id_compatibilidad}`);
  return respuesta.data;
}