import { usePermiso } from '../../context/usePermiso';

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
