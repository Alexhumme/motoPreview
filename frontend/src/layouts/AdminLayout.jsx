import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermiso } from '../context/usePermiso';
import { useTema } from '../context/TemaContext';
import { ROL_ADMIN } from '../utils/constants/roles';
import './AdminLayout.css';

/**
 * Menú dinámico: cada enlace se pinta solo si el rol del usuario tiene
 * alguno de los permisos RBAC indicados. Los enlaces sin `permisos` son
 * siempre visibles para el personal de tienda, y `soloAdmin` restringe a
 * administradores. Si el usuario aún no tiene permisos cargados (p. ej. la
 * tienda no tiene configurada la matriz RBAC), se aplica el menú por rol
 * heredado para no dejar al personal sin navegación.
 */
const ENLACES = [
  { ruta: '/admin', etiqueta: 'Resumen', icono: '◈' },
  {
    ruta: '/admin/accesorios',
    etiqueta: 'Accesorios',
    icono: '◇',
    permisos: [
      { recurso: 'productos', accion: 'crear' },
      { recurso: 'productos', accion: 'actualizar' },
    ],
  },
  {
    ruta: '/admin/inventario',
    etiqueta: 'Inventario',
    icono: '▣',
    permisos: [
      { recurso: 'inventario', accion: 'listar' },
      { recurso: 'inventario', accion: 'actualizar' },
    ],
  },
  {
    ruta: '/admin/cotizaciones',
    etiqueta: 'Cotizaciones',
    icono: '▤',
    permisos: [
      { recurso: 'cotizaciones', accion: 'listar' },
      { recurso: 'cotizaciones', accion: 'actualizar' },
    ],
  },
  {
    ruta: '/admin/reportes',
    etiqueta: 'Reportes',
    icono: '▥',
    permisos: [{ recurso: 'cotizaciones', accion: 'listar' }],
  },
  {
    ruta: '/admin/usuarios',
    etiqueta: 'Usuarios',
    icono: '◎',
    soloAdmin: true,
    permisos: [
      { recurso: 'usuarios', accion: 'listar' },
      { recurso: 'usuarios', accion: 'crear' },
    ],
  },
  {
    ruta: '/admin/permisos',
    etiqueta: 'Seguridad',
    icono: '⛨',
    soloAdmin: true,
    permisos: [{ recurso: 'roles', accion: 'listar' }],
  },
  { ruta: '/admin/tienda', etiqueta: 'Mi tienda', icono: '⌂' },
];

export default function AdminLayout() {
  const { usuario, logout } = useAuth();
  const { tema, alternarTema } = useTema();
  const { tieneAlgunPermiso, esSuperAdmin } = usePermiso();
  const location = useLocation();
  const navigate = useNavigate();

  const esAdmin = usuario?.id_rol === ROL_ADMIN || esSuperAdmin();
  const permisosCargados = (usuario?.permisos?.length ?? 0) > 0 || esSuperAdmin();

  const enlaces = ENLACES.filter((enlace) => {
    if (enlace.soloAdmin && !esAdmin) return false;
    if (enlace.soloSuperAdmin && !esSuperAdmin()) return false;
    if (!permisosCargados) return true; // sin matriz RBAC: menú por rol heredado
    if (!enlace.permisos) return true;
    return tieneAlgunPermiso(enlace.permisos);
  });

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
          <button
            className="btn-tema"
            onClick={alternarTema}
            aria-label={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}
          >
            {tema === 'oscuro' ? '☀' : '☾'}
          </button>
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
