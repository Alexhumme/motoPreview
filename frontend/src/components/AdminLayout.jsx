import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';
import { ROL_ADMIN } from '../constants/roles';

export default function AdminLayout() {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function manejarLogout() {
    logout();
    navigate('/login');
  }

const enlacesBase = [
  { ruta: '/admin', etiqueta: 'Resumen' },
  { ruta: '/admin/inventario', etiqueta: 'Inventario' },
  { ruta: '/admin/cotizaciones', etiqueta: 'Cotizaciones' },
  { ruta: '/admin/reportes', etiqueta: 'Reportes' },
];

const enlaces = usuario?.id_rol === ROL_ADMIN
  ? [
      enlacesBase[0],
      { ruta: '/admin/accesorios', etiqueta: 'Accesorios' },
      ...enlacesBase.slice(1),
      { ruta: '/admin/usuarios', etiqueta: 'Usuarios' },
      { ruta: '/admin/tienda', etiqueta: 'Mi tienda' },
    ]
  : enlacesBase;

  return (
    <div className="admin-layout">
      <aside className="admin-layout__sidebar">
        <div className="admin-layout__marca">MotoPreview</div>
                <nav className="admin-layout__nav">
          {enlaces.map((enlace) => (
            <Link
              key={enlace.ruta}
              to={enlace.ruta}
              className={`admin-layout__enlace ${location.pathname === enlace.ruta ? 'admin-layout__enlace--activo' : ''}`}
            >
              {enlace.etiqueta}
            </Link>
          ))}
          <Link to="/" className="admin-layout__enlace admin-layout__enlace--catalogo">
            Ver catálogo público
          </Link>
        </nav>
        <div className="admin-layout__usuario">
          <span>{usuario?.usu_nombre}</span>
          <button onClick={manejarLogout} className="admin-layout__logout">Salir</button>
        </div>
      </aside>
      <main className="admin-layout__contenido">
        <Outlet />
      </main>
    </div>
  );
}