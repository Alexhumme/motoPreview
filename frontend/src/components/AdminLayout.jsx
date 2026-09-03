import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';

export default function AdminLayout() {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function manejarLogout() {
    logout();
    navigate('/login');
  }

const enlaces = [
  { ruta: '/admin', etiqueta: 'Resumen' },
  { ruta: '/admin/accesorios', etiqueta: 'Accesorios' },
  { ruta: '/admin/inventario', etiqueta: 'Inventario' },
  { ruta: '/admin/cotizaciones', etiqueta: 'Cotizaciones' },
];

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