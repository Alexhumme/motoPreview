import api from './api';

export async function obtenerModelo3dPorAccesorio(id_accesorio) {
  const respuesta = await api.get(`/modelos-3d/accesorio/${id_accesorio}`);
  return respuesta.data;
}