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
 *   // Verificar con scope específico
 *   if (tienePermiso('productos', 'crear', 'global')) { ... }
 *   
 *   // Cargar permisos del usuario (opcional, se hace automáticamente en login)
 *   await cargarPermisos();
 */
export function usePermiso() {
  const { usuario, actualizarPermisos } = useContext(AuthContext);

  /**
   * Verifica si el usuario es SUPERADMIN (bypass total)
   */
  const esSuperAdmin = () => {
    if (!usuario) return false;
    // ROL_SUPERADMIN UUID: '00000000-0000-0000-0000-000000000000'
    return usuario.id_rol === '00000000-0000-0000-0000-000000000000';
  };

  /**
   * Verifica si el usuario tiene un permiso específico
   * @param {string} recurso - Código del recurso (ej: 'productos', 'usuarios', 'cotizaciones')
   * @param {string} accion - Código de la acción (ej: 'crear', 'leer', 'actualizar', 'eliminar', 'listar', 'exportar')
   * @param {string} [scope] - Scope opcional: 'global', 'tienda', 'propio'. Si no se pasa, acepta cualquier scope.
   * @returns {boolean}
   */
  const tienePermiso = (recurso, accion, scope) => {
    if (!usuario || !usuario.permisos) return false;
    
    // SUPERADMIN bypass
    if (esSuperAdmin()) return true;

    // Buscar en los permisos del usuario
    const permiso = usuario.permisos.find(p => 
      p.recurso === recurso && 
      p.accion === accion &&
      p.activo &&
      (!scope || p.scope === scope)
    );
    
    return !!permiso;
  };

  /**
   * Verifica múltiples permisos (AND - todos deben cumplirse)
   * @param {Array<{recurso: string, accion: string, scope?: string}>} permisos
   */
  const tieneTodosPermisos = (permisos) => {
    return permisos.every(({ recurso, accion, scope }) => tienePermiso(recurso, accion, scope));
  };

  /**
   * Verifica si tiene al menos uno de los permisos (OR)
   */
  const tieneAlgunPermiso = (permisos) => {
    return permisos.some(({ recurso, accion, scope }) => tienePermiso(recurso, accion, scope));
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
   * Carga los permisos del usuario desde el backend (via service/api).
   * Se llama automáticamente en login, pero se puede forzar recarga.
   */
  const cargarPermisos = async () => {
    try {
      const respuesta = await obtenerPermisosUsuario();
      const lista = respuesta?.permisos || [];
      // Espera formato: [{ recurso, accion, scope, activo }]
      actualizarPermisos(lista);
      return lista;
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
    esSuperAdmin,
    permisos: usuario?.permisos || [],
  };
}

export default usePermiso;