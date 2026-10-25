import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div className="footer-brand">
          <Link to="/" className="brand" aria-label="MotoPreview home">
            <span className="brand-mark">↗</span>
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
            <a href="/#como-funciona" className="footer-link">Cómo funciona</a>
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