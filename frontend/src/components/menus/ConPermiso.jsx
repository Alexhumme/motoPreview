import { usePermiso } from '../../context/usePermiso';

/**
 * Componente wrapper para renderizado condicional basado en permisos
 * Uso:
 *   <ConPermiso recurso="productos" accion="crear">
 *     <BotonCrearProducto />
 *   </ConPermiso>
 *   <ConPermiso recurso="productos" accion="crear" scope="global">
 *     <BotonCrearGlobal />
 *   </ConPermiso>
 */
export function ConPermiso({ recurso, accion, scope, children, fallback = null }) {
  const { tienePermiso } = usePermiso();
  return tienePermiso(recurso, accion, scope) ? children : fallback;
}

/**
 * Componente para requerir múltiples permisos (AND)
 * Uso:
 *   <ConTodosPermisos permisos={[{recurso:'a',accion:'b'}, {recurso:'c',accion:'d'}]}>...</ConTodosPermisos>
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

/**
 * Componente solo para SUPERADMIN (bypass total RBAC)
 * Uso:
 *   <ConPermisoAdmin><PanelSuperAdmin /></ConPermisoAdmin>
 */
export function ConPermisoAdmin({ children, fallback = null }) {
  const { esSuperAdmin } = usePermiso();
  return esSuperAdmin() ? children : fallback;
}