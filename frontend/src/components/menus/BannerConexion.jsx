import { useConnection } from '../context/ConnectionContext';
import './BannerConexion.css';

export default function BannerConexion() {
  const { conectado } = useConnection();

  if (conectado) return null;

  return (
    <div className="banner-conexion">
      <span className="banner-conexion__punto" />
      No pudimos conectar con el servidor. Revisa tu conexión o intenta de nuevo en un momento.
    </div>
  );
}