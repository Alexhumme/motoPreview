import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/authContexto';
import { usePermiso } from '../../context/usePermiso';

/**
 * Guarda de rutas:
 * - rolesPermitidos: array de id_rol (guarda heredada por rol).
 * - recurso/accion:  permiso RBAC simple.
 * - permisos:        array {recurso, accion} — basta con cumplir uno (any-of).
 * - requiereTienda:  la vista necesita que la cuenta pertenezca a una tienda.
 * - soloSuperAdmin:  vistas de plataforma que el backend solo abre a la sede.
 *
 * El panel es accesible para cualquier cuenta autenticada; los módulos se
 * deciden con la matriz RBAC. Si el usuario tiene la matriz cargada
 * (usuario.permisos, aunque sea vacía), los permisos mandan. Mientras llega la
 * matriz se deja pasar para no expulsar a quien ya tenía sesión; el backend
 * sigue siendo la validación definitiva.
 */
export default function RutaProtegida({
  children,
  rolesPermitidos,
  recurso,
  accion,
  permisos,
  requiereTienda = false,
  soloSuperAdmin = false,
}) {
  const { usuario } = useAuth();
  const { tieneAlgunPermiso, esSuperAdmin } = usePermiso();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (soloSuperAdmin && !esSuperAdmin()) {
    return <Navigate to="/admin" replace />;
  }

  if (requiereTienda && !usuario.id_tienda) {
    return <Navigate to="/admin" replace />;
  }

  if (esSuperAdmin()) {
    return children;
  }

  const permisosCargados = Array.isArray(usuario.permisos);
  const requeridos = permisos || (recurso && accion ? [{ recurso, accion }] : null);

  if (requeridos && permisosCargados && !tieneAlgunPermiso(requeridos)) {
    return <Navigate to="/" replace />;
  }

  // Legacy: verificación por roles para vistas que aún no declaran permisos.
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.id_rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
