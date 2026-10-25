import { Link } from 'react-router-dom';
import './NoEncontrado.css';

export default function NoEncontrado() {
  return (
    <div className="no-encontrado-page">
      <Link to="/" className="btn btn--ghost btn--sm">← Volver al catálogo</Link>

      <div className="not-found">
        <span className="not-found-code">404</span>
        <h1 className="not-found-title">Esta página no existe</h1>
        <p className="not-found-text">
          Puede que el enlace esté roto o que hayas escrito mal la dirección.
        </p>
        <Link to="/" className="btn btn--primary btn--full">Volver al catálogo</Link>
      </div>
    </div>
  );
}