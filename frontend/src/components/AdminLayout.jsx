import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';
import { ROL_ADMIN } from '../constants/roles';

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
      <aside className="admin-sidebar">
        <Link to="/" className="brand brand--light"><span className="brand-mark">↗</span><span>Moto<span>Preview</span></span></Link>
        <div className="admin-profile"><span className="profile-avatar">{usuario?.usu_nombre?.slice(0, 2).toUpperCase()}</span><span><strong>{usuario?.usu_nombre}</strong><small>Administrador</small></span></div>
        <nav>{enlaces.map((enlace) => <Link key={enlace.ruta} to={enlace.ruta} className={location.pathname === enlace.ruta ? 'admin-nav-link admin-nav-link--active' : 'admin-nav-link'}><span>{enlace.icono}</span>{enlace.etiqueta}</Link>)}</nav>
        <div className="admin-help"><span>?</span><span>¿Necesitas ayuda?<b>Centro de soporte</b></span></div>
        <Link to="/" className="admin-back">← Volver a la tienda</Link>
        <button className="admin-logout" onClick={manejarLogout}>Salir de la cuenta</button>
      </aside>
      <main className="admin-content">
        <div className="admin-mobile-top"><Link to="/" className="brand"><span className="brand-mark">↗</span><span>Moto<span>Preview</span></span></Link><button onClick={manejarLogout}>Salir</button></div>
        <Outlet />
      </main>
    </div>
  );
}