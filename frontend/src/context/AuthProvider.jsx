import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../services/api';
import { obtenerPermisosUsuario } from '../services/auth';
import {
  actualizarUsuarioGuardado,
  guardarSesion,
  leerUsuarioGuardado,
  limpiarSesion,
} from '../utils/sesion';
import { AuthContext } from './authContexto';

export function AuthProvider({ children }) {
  // La sesión se hidrata del almacenamiento elegido con estado perezoso.
  const [usuario, setUsuario] = useState(leerUsuarioGuardado);
  // De qué usuario ya se pidieron los permisos. Es una ref y no estado porque el
  // login y el efecto comparten la marca, y porque cambiarla no debe re-renderizar.
  const permisosDe = useRef(usuario?.id_usuario ?? null);

  async function login(usu_email, password, recordar = false) {
    const respuesta = await api.post('/auth/login', { usu_email, password });
    const { token, usuario: sesion } = respuesta.data;
    guardarSesion(token, sesion, recordar);
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
    if (permisos) actualizarUsuarioGuardado(usuarioCompleto);
    setUsuario(usuarioCompleto);
    return sesion;
  }

  function logout() {
    limpiarSesion();
    permisosDe.current = null;
    setUsuario(null);
  }

  // Función para actualizar permisos del usuario (para RBAC)
  const actualizarPermisos = useCallback((permisos) => {
    setUsuario(prev => {
      if (!prev) return null;
      const actualizado = { ...prev, permisos };
      actualizarUsuarioGuardado(actualizado);
      return actualizado;
    });
  }, []);

  // Recupera permisos al rehidratar una sesión guardada sin ellos.
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
            actualizarUsuarioGuardado({ ...prev, permisos });
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
