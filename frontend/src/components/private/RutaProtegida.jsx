import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermiso } from '../context/usePermiso';

// rolesPermitidos: array de id_rol que pueden entrar (legacy)
// recurso/accion: nuevo sistema RBAC
export default function RutaProtegida({ children, rolesPermitidos, recurso, accion }) {
  const { usuario } = useAuth();
  const { tienePermiso } = usePermiso();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // Legacy: verificación por roles
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.id_rol)) {
    return <Navigate to="/" replace />;
  }

  // Nuevo sistema RBAC: verificación por recurso/acción
  if (recurso && accion && !tienePermiso(recurso, accion)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
