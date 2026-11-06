import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './NoEncontrado.css';

export default function NoEncontrado() {
  return (
    <div className="no-encontrado-page">
      <Link to="/" className="btn btn--ghost btn--sm">
        <ArrowLeft size={15} aria-hidden="true" /> Volver al catálogo
      </Link>

      <div className="not-found" data-reveal="up">
        <span className="not-found-code" data-scramble="404">404</span>
        <h1 className="not-found-title" data-glitch="Esta página no existe">Esta página no existe</h1>
        <p className="not-found-text">
          Puede que el enlace esté roto o que hayas escrito mal la dirección.
        </p>
        <Link to="/" className="btn btn--primary btn--full">Volver al catálogo</Link>
      </div>
    </div>
  );
}