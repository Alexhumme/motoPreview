import { useContext } from 'react';
import { AuthContext } from './AuthContext';
import { obtenerPermisosUsuario } from '../services/auth';

/**
 * Hook para verificar permisos RBAC en componentes
 *
 * Uso:
 *   const { tienePermiso, cargarPermisos } = usePermiso();
 *
 *   // Verificar permiso simple
 *   if (tienePermiso('productos', 'crear')) { ... }
 *
 *   // Cargar permisos del usuario (opcional, se hace automáticamente en login)
 *   await cargarPermisos();
 *
 * Los componentes de renderizado condicional (ConPermiso, ConTodosPermisos,
 * ConAlgunPermiso) están en components/ConPermiso.jsx.
 */
export function usePermiso() {
  const { usuario, actualizarPermisos } = useContext(AuthContext);

  /**
   * Verifica si el usuario tiene un permiso específico
   * @param {string} recurso - Código del recurso (ej: 'productos', 'usuarios', 'cotizaciones')
   * @param {string} accion - Código de la acción (ej: 'crear', 'leer', 'actualizar', 'eliminar', 'listar', 'exportar')
   * @returns {boolean}
   */
  const tienePermiso = (recurso, accion) => {
    if (!usuario || !usuario.permisos) return false;

    // Superadmin tiene acceso total sin necesidad de permisos explícitos
    if (usuario.id_rol === '00000000-0000-0000-0000-000000000000') {
      return true;
    }

    // Buscar en los permisos del usuario
    const permiso = usuario.permisos.find(p =>
      p.recurso === recurso &&
      p.accion === accion &&
      p.activo
    );

    if (!permiso) return false;

    // TODO: Verificar scope según necesidad (global, tienda, propio)
    // Por ahora, si tiene el permiso, se permite
    return true;
  };

  /**
   * Verifica múltiples permisos (AND - todos deben cumplirse)
   */
  const tieneTodosPermisos = (permisos) => {
    return permisos.every(({ recurso, accion }) => tienePermiso(recurso, accion));
  };

  /**
   * Verifica si tiene al menos uno de los permisos (OR)
   */
  const tieneAlgunPermiso = (permisos) => {
    return permisos.some(({ recurso, accion }) => tienePermiso(recurso, accion));
  };

  /**
   * Obtiene todos los permisos del usuario para un recurso específico
   */
  const getPermisosRecurso = (recurso) => {
    if (!usuario || !usuario.permisos) return [];
    return usuario.permisos
      .filter(p => p.recurso === recurso && p.activo)
      .map(p => ({ accion: p.accion, scope: p.scope }));
  };

  /**
   * Carga los permisos del usuario desde el backend
   * Se llama automáticamente en login, pero se puede forzar recarga.
   * Usa el cliente axios (services/api.js) para que la URL base y el token
   * sean los mismos que en el resto de la app; un fetch relativo no llegaría
   * al backend cuando el frontend se despliega aparte (Vercel).
   */
  const cargarPermisos = async () => {
    try {
      // Espera formato: { permisos: [{ recurso, accion, scope, activo }] }
      const data = await obtenerPermisosUsuario();
      const permisos = data.permisos || [];
      actualizarPermisos(permisos);
      return permisos;
    } catch (error) {
      console.warn('No se pudieron cargar permisos:', error);
    }
    return [];
  };

  return {
    tienePermiso,
    tieneTodosPermisos,
    tieneAlgunPermiso,
    getPermisosRecurso,
    cargarPermisos,
    permisos: usuario?.permisos || [],
  };
}

export default usePermiso;
