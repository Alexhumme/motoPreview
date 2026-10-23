import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './SiteHeader.css';

export default function SiteHeader() {
  const location = useLocation();
  const { usuario, logout } = useAuth();
  const { totalItems } = useCart();

  const isAdmin = usuario && (
    usuario.id_rol === '11111111-0000-0000-0000-000000000001' ||
    usuario.id_rol === '11111111-0000-0000-0000-000000000002'
  );

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <span className="brand-mark">↗</span>
          <span>Moto<span>Preview</span></span>
        </Link>

        <nav className="main-nav">
          <Link to="/" className={location.pathname === '/' ? 'nav-link nav-link--active' : 'nav-link'}>
            Catálogo
          </Link>
          <Link to="/configurador" className={location.pathname === '/configurador' ? 'nav-link nav-link--active' : 'nav-link'}>
            Configurador
          </Link>
          <a href="/#como-funciona" className="nav-link">Cómo funciona</a>
        </nav>

        <div className="header-actions">
          {usuario ? (
            <div className="header-account">
              <Link to="/mis-cotizaciones">{usuario.usu_nombre?.split(' ')[0]}</Link>
              {isAdmin && <Link to="/admin">Panel</Link>}
              <button onClick={logout}>Salir</button>
            </div>
          ) : (
            <Link to="/login" className="header-login">↪ Ingresar</Link>
          )}
          <Link to="/carrito" className="cart-button">
            <span>▣</span>
            <span>Carrito</span>
            {totalItems > 0 && <b>{totalItems}</b>}
          </Link>
        </div>
      </div>
    </header>
  );
}