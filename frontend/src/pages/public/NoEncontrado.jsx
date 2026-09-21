import { Link } from 'react-router-dom';
import './NoEncontrado.css';

export default function NoEncontrado() {
  return (
    <div className="no-encontrado">
      <span className="no-encontrado__codigo">404</span>
      <h1 className="no-encontrado__titulo">Esta página no existe</h1>
      <p className="no-encontrado__texto">
        Puede que el enlace esté roto o que hayas escrito mal la dirección.
      </p>
      <Link to="/" className="no-encontrado__boton">Volver al catálogo</Link>
    </div>
  );
}