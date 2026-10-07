import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__main">
        <div>
          <Link to="/" className="brand brand--light">
            <span className="brand-mark">↗</span>
            <span>Moto<span>Preview</span></span>
          </Link>
          <p>La forma más precisa de<br />personalizar tu motocicleta.</p>
        </div>
        <div className="site-footer__links">
          <div><small>Explora</small><Link to="/">Catálogo</Link><Link to="/configurador">Configurador</Link></div>
          <div><small>Cuenta</small><Link to="/login">Ingresar</Link><Link to="/registro">Crear cuenta</Link></div>
          <div><small>Ayuda</small><a href="/#como-funciona">Cómo funciona</a><Link to="/carrito">Cotización</Link></div>
        </div>
      </div>
      <div className="site-footer__bottom"><span>© 2026 MotoPreview</span><span>Hecho para la ruta.</span></div>
    </footer>
  );
}