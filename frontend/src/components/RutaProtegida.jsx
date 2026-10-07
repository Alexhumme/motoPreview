import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// rolesPermitidos: array de id_rol que pueden entrar. Si no se pasa, solo exige estar logueado.
export default function RutaProtegida({ children, rolesPermitidos }) {
  const { usuario, cargando } = useAuth();

  if (cargando) return <p>Cargando...</p>;

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.id_rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}