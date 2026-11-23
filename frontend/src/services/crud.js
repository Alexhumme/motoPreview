import api from './api';

// Crea las 4 operaciones estándar para un recurso REST del backend.
// La edición usa PATCH para no tener que reenviar todos los campos.
export function crearCrud(ruta) {
  return {
    listar: async (params) => (await api.get(ruta, { params })).data,
    crear: async (datos) => (await api.post(ruta, datos)).data,
    actualizar: async (id, datos) => (await api.patch(`${ruta}/${id}`, datos)).data,
    eliminar: async (id) => (await api.delete(`${ruta}/${id}`)).data,
  };
}

// Convierte la respuesta de error del backend en un texto legible.
export function mensajeError(err, porDefecto = 'No se pudo completar la operación. Inténtalo nuevamente.') {
  const data = err?.response?.data?.error;
  if (!data) return porDefecto;
  if (typeof data === 'string') return data;
  const textos = Object.values(data).flat().map(String);
  return textos.length ? textos.join(' ') : porDefecto;
}
