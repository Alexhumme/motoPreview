import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../services/api';
import { obtenerPermisosUsuario } from '../services/auth';
import { AuthContext } from './authContexto';

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
  // De qué usuario ya se pidieron los permisos. Es una ref y no estado porque el
  // login y el efecto comparten la marca, y porque cambiarla no debe re-renderizar.
  const permisosDe = useRef(usuario?.id_usuario ?? null);

  async function login(usu_email, password) {
    const respuesta = await api.post('/auth/login', { usu_email, password });
    const { token, usuario: sesion } = respuesta.data;
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(sesion));
    // Se marca ANTES de publicar el usuario para que el efecto de abajo no
    // vuelva a pedir los mismos permisos.
    permisosDe.current = sesion.id_usuario;
    let permisos = null;
    try {
      const respuestaPermisos = await obtenerPermisosUsuario();
      permisos = respuestaPermisos?.permisos ?? null;
    } catch (error) {
      permisosDe.current = null;
      console.warn('No se pudieron cargar permisos:', error);
    }
    const usuarioCompleto = permisos ? { ...sesion, permisos } : sesion;
    if (permisos) localStorage.setItem('usuario', JSON.stringify(usuarioCompleto));
    setUsuario(usuarioCompleto);
    return sesion;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    permisosDe.current = null;
    setUsuario(null);
  }

  // Función para actualizar permisos del usuario (para RBAC)
  const actualizarPermisos = useCallback((permisos) => {
    setUsuario(prev => prev ? { ...prev, permisos } : null);
  }, []);

  // Solo al rehidratar la sesión desde localStorage (usuario guardado sin
  // permisos). Con `usuario` en las dependencias se re-ejecuta cada vez que se
  // fusionan los permisos, por eso la guarda de `permisosDe`.
  useEffect(() => {
    const id = usuario?.id_usuario;
    if (!id || usuario.permisos || permisosDe.current === id) return;
    permisosDe.current = id;
    obtenerPermisosUsuario()
      .then(res => {
        if (res?.permisos) {
          const permisos = res.permisos;
          setUsuario(prev => {
            if (!prev || prev.id_usuario !== id) return prev;
            localStorage.setItem('usuario', JSON.stringify({ ...prev, permisos }));
            return { ...prev, permisos };
          });
        }
      })
      .catch(err => {
        permisosDe.current = null;
        console.warn('No se pudieron cargar permisos:', err);
      });
  }, [usuario]);

  return (
    <AuthContext.Provider value={{ usuario, login, logout, actualizarPermisos }}>
      {children}
    </AuthContext.Provider>
  );
}
