import { Link } from 'react-router-dom';
import './Footer.css';

const CINTA = [
  'Visualiza en 3D',
  'Configura pieza a pieza',
  'Cotiza al instante',
  'Repuestos originales',
];

function PistaCinta({ oculta }) {
  return (
    <div className="fx-marquee__pista" aria-hidden={oculta ? 'true' : undefined}>
      {CINTA.map((frase, indice) => (
        <span
          key={frase}
          className={`footer-cinta__elemento${indice % 2 === 0 ? ' footer-cinta__elemento--marca' : ''}`}
        >
          {frase}
        </span>
      ))}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-cinta fx-marquee">
        <PistaCinta />
        <PistaCinta oculta />
      </div>

      <div className="site-footer-main" data-reveal="up">
        <div className="footer-brand">
          <Link to="/" className="brand" aria-label="MotoPreview home">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-text">Moto<span>Preview</span></span>
          </Link>
          <p className="footer-desc">
            La forma más precisa de<br />
            personalizar tu motocicleta.
          </p>
        </div>

        <div className="footer-links">
          <div className="footer-link-group">
            <small className="footer-label">Explora</small>
            <Link to="/" className="footer-link">Catálogo</Link>
            <Link to="/configurador" className="footer-link">Configurador</Link>
          </div>
          <div className="footer-link-group">
            <small className="footer-label">Cuenta</small>
            <Link to="/login" className="footer-link">Ingresar</Link>
            <Link to="/registro" className="footer-link">Crear cuenta</Link>
          </div>
          <div className="footer-link-group">
            <small className="footer-label">Ayuda</small>
            <Link to="/carrito" className="footer-link">Cotización</Link>
          </div>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>© 2026 MotoPreview</span>
        <span>Hecho para la ruta.</span>
      </div>
    </footer>
  );
}