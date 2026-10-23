import { useContext } from 'react';
import { AuthContext } from './AuthContext';

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
   * Se llama automáticamente en login, pero se puede forzar recarga
   */
  const cargarPermisos = async () => {
    try {
      // Llamar al endpoint para obtener permisos del usuario
      const respuesta = await fetch('/api/permisos/usuario', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (respuesta.ok) {
        const data = await respuesta.json();
        // Espera formato: { permisos: [{ recurso, accion, scope, activo }] }
        actualizarPermisos(data.permisos || []);
        return data.permisos;
      }
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

/**
 * Componente wrapper para renderizado condicional basado en permisos
 * Uso:
 *   <ConPermiso recurso="productos" accion="crear">
 *     <BotonCrearProducto />
 *   </ConPermiso>
 */
export function ConPermiso({ recurso, accion, children, fallback = null }) {
  const { tienePermiso } = usePermiso();
  return tienePermiso(recurso, accion) ? children : fallback;
}

/**
 * Componente para requerir múltiples permisos (AND)
 */
export function ConTodosPermisos({ permisos, children, fallback = null }) {
  const { tieneTodosPermisos } = usePermiso();
  return tieneTodosPermisos(permisos) ? children : fallback;
}

/**
 * Componente para requerir al menos un permiso (OR)
 */
export function ConAlgunPermiso({ permisos, children, fallback = null }) {
  const { tieneAlgunPermiso } = usePermiso();
  return tieneAlgunPermiso(permisos) ? children : fallback;
}

export default usePermiso;