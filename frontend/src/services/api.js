import axios from 'axios';
import { API_URL } from '../utils/config';
import { limpiarSesion, obtenerToken } from '../utils/sesion';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = obtenerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (respuesta) => {
    window.dispatchEvent(new Event('backend:online'));
    return respuesta;
  },
  (error) => {
    if (error.response?.status === 401) {
      limpiarSesion();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (!error.response) {
      // Sin respuesta del servidor: caído, sin red, o timeout
      window.dispatchEvent(new Event('backend:offline'));
    }
    return Promise.reject(error);
  }
);

export default api;