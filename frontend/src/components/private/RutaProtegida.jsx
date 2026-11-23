import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/authContexto';
import { usePermiso } from '../../context/usePermiso';

/**
 * Guarda de rutas:
 * - rolesPermitidos: array de id_rol (guarda heredada por rol).
 * - recurso/accion:  permiso RBAC simple.
 * - permisos:        array {recurso, accion} — basta con cumplir uno (any-of).
 *
 * Si el usuario tiene la matriz RBAC cargada (usuario.permisos), los permisos
 * mandan; si no la tiene todavía, se aplica la guarda por rol heredada para
 * no bloquear al personal mientras se configura la matriz. La validación
 * definitiva siempre ocurre en el backend.
 */
export default function RutaProtegida({ children, rolesPermitidos, recurso, accion, permisos }) {
  const { usuario } = useAuth();
  const { tieneAlgunPermiso, esSuperAdmin } = usePermiso();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (esSuperAdmin()) {
    return children;
  }

  const permisosCargados = (usuario.permisos?.length ?? 0) > 0;
  const requeridos = permisos || (recurso && accion ? [{ recurso, accion }] : null);

  if (requeridos && permisosCargados && !tieneAlgunPermiso(requeridos)) {
    return <Navigate to="/" replace />;
  }

  // Legacy: verificación por roles
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.id_rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
