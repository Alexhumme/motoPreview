import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import './SiteHeader.css';

export default function SiteHeader() {
  const location = useLocation();
  const { usuario, logout } = useAuth();
  const { totalItems } = useCart();

  const isAdmin = usuario && (
    usuario.id_rol === '00000000-0000-0000-0000-000000000000' ||
    usuario.id_rol === '11111111-0000-0000-0000-000000000001' ||
    usuario.id_rol === '11111111-0000-0000-0000-000000000002'
  );

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand" aria-label="MotoPreview home">
          <span className="brand-mark">↗</span>
          <span className="brand-text">Moto<span>Preview</span></span>
        </Link>

        <nav className="main-nav" aria-label="Navegación principal">
          <Link
            to="/"
            className={`nav-link${location.pathname === '/' ? ' nav-link--active' : ''}`}
          >
            Catálogo
          </Link>
          <Link
            to="/configurador"
            className={`nav-link${location.pathname === '/configurador' ? ' nav-link--active' : ''}`}
          >
            Configurador
          </Link>
          <a href="/#como-funciona" className="nav-link">Cómo funciona</a>
        </nav>

        <div className="header-actions">
          {usuario ? (
            <div className="header-account">
              <Link to="/mis-cotizaciones">{usuario.usu_nombre?.split(' ')[0]}</Link>
              {isAdmin && <Link to="/admin">Panel</Link>}
              <button onClick={logout} className="btn btn--ghost btn--sm">Salir</button>
            </div>
          ) : (
            <Link to="/login" className="btn btn--brand btn--sm">Ingresar</Link>
          )}
          <Link to="/carrito" className="cart-button">
            <span>▣</span>
            <span className="cart-label">Carrito</span>
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}