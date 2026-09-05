import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
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
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
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