import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROL_ADMIN } from '../utils/constants/roles';
import './AdminLayout.css';

export default function AdminLayout() {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const enlacesBase = [
    { ruta: '/admin', etiqueta: 'Resumen', icono: '◈' },
    { ruta: '/admin/inventario', etiqueta: 'Inventario', icono: '▣' },
    { ruta: '/admin/cotizaciones', etiqueta: 'Cotizaciones', icono: '▤' },
    { ruta: '/admin/reportes', etiqueta: 'Reportes', icono: '▥' },
  ];
  const enlaces = usuario?.id_rol === ROL_ADMIN
    ? [enlacesBase[0], { ruta: '/admin/accesorios', etiqueta: 'Accesorios', icono: '◇' }, ...enlacesBase.slice(1), { ruta: '/admin/usuarios', etiqueta: 'Usuarios', icono: '◎' }, { ruta: '/admin/tienda', etiqueta: 'Mi tienda', icono: '⌂' }]
    : enlacesBase;

  function manejarLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link to="/" className="brand" aria-label="MotoPreview home">
          <span className="brand-mark">↗</span>
          <span className="brand-text">Moto<span>Preview</span></span>
        </Link>
        <nav className="admin-nav" aria-label="Navegación principal">
          {enlaces.map((enlace) => (
            <Link
              key={enlace.ruta}
              to={enlace.ruta}
              className={location.pathname === enlace.ruta ? 'admin-nav-link admin-nav-link--active' : 'admin-nav-link'}
              aria-current={location.pathname === enlace.ruta ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{enlace.icono}</span>
              <span>{enlace.etiqueta}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-header-actions">
          <Link to="/" className="btn btn--ghost btn--sm">Volver a la tienda</Link>
          <button className="btn btn--ghost btn--sm" onClick={manejarLogout}>Salir</button>
        </div>
      </header>

      <main className="admin-main">
        <Outlet />
      </main>

      <footer className="admin-footer">
        <span>MP / 2026</span>
        <span>Hecho para quienes siguen avanzando.</span>
      </footer>
    </div>
  );
}