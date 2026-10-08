import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext();

function leerUsuarioGuardado() {
  const token = localStorage.getItem('token');
  const usuarioGuardado = localStorage.getItem('usuario');
  if (!token || !usuarioGuardado) return null;
  try {
    return JSON.parse(usuarioGuardado);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // La sesión se hidrata de localStorage con estado perezoso (lazy initializer):
  // el usuario ya está disponible en el primer render y no hace falta un efecto.
  const [usuario, setUsuario] = useState(leerUsuarioGuardado);

  async function login(usu_email, password) {
    const respuesta = await api.post('/auth/login', { usu_email, password });
    const { token, usuario } = respuesta.data;
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    setUsuario(usuario);
    return usuario;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }

  return <AuthContext.Provider value={{ usuario, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
