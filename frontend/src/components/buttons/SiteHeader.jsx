import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermiso } from '../../context/usePermiso';
import { useCart } from '../../context/CartContext';
import { ROL_ADMIN, ROL_VENDEDOR } from '../../utils/constants/roles';
import './SiteHeader.css';

export default function SiteHeader() {
  const location = useLocation();
  const { usuario, logout } = useAuth();
  const { tieneAlgunPermiso, esSuperAdmin } = usePermiso();
  const { totalItems } = useCart();

  const esStaff = !!usuario && (
    usuario.id_rol === ROL_ADMIN ||
    usuario.id_rol === ROL_VENDEDOR ||
    esSuperAdmin()
  );
  // Mismo criterio que el panel admin: con matriz RBAC cargada, el enlace
  // solo se pinta si el rol puede entrar a algún módulo; sin matriz, hereda.
  const permisosCargados = (usuario?.permisos?.length ?? 0) > 0 || esSuperAdmin();
  const mostrarPanel = esStaff && (!permisosCargados || tieneAlgunPermiso([
    { recurso: 'inventario', accion: 'listar' },
    { recurso: 'cotizaciones', accion: 'listar' },
    { recurso: 'usuarios', accion: 'listar' },
    { recurso: 'roles', accion: 'listar' },
    { recurso: 'productos', accion: 'crear' },
  ]));

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
              {/* El personal va a su panel; los clientes, a sus cotizaciones */}
              <Link
                to={esSuperAdmin() ? '/admin/permisos' : esStaff ? '/admin' : '/mis-cotizaciones'}
              >
                {usuario.usu_nombre?.split(' ')[0]}
              </Link>
              {mostrarPanel &&
                (esSuperAdmin() ? (
                  <Link to="/admin/permisos">Seguridad</Link>
                ) : (
                  <Link to="/admin">Panel</Link>
                ))}
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