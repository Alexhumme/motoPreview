import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { obtenerPermisosUsuario } from '../services/auth';
import { AuthContext } from './AuthContext';

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

    // Cargar permisos RBAC después de login exitoso
    try {
      const respuestaPermisos = await obtenerPermisosUsuario();
      if (respuestaPermisos.permisos) {
        setUsuario(prev => prev ? { ...prev, permisos: respuestaPermisos.permisos } : null);
      }
    } catch (error) {
      console.warn('No se pudieron cargar permisos:', error);
    }

    return usuario;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }

  // Función para actualizar permisos del usuario (para RBAC)
  const actualizarPermisos = useCallback((permisos) => {
    setUsuario(prev => prev ? { ...prev, permisos } : null);
  }, []);

  // Cargar permisos al iniciar si hay usuario guardado
  useEffect(() => {
    if (usuario && !usuario.permisos) {
      obtenerPermisosUsuario()
        .then(res => {
          if (res.permisos) {
            setUsuario(prev => prev ? { ...prev, permisos: res.permisos } : null);
          }
        })
        .catch(err => console.warn('No se pudieron cargar permisos:', err));
    }
  }, [usuario]);

  return (
    <AuthContext.Provider value={{ usuario, login, logout, actualizarPermisos }}>
      {children}
    </AuthContext.Provider>
  );
}
