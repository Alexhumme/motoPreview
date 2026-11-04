import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, ClipboardList, Settings, Receipt, FileText,
  BarChart3, Store, Shield, Users, ShieldCheck, Building2, Wrench,
  Menu, X, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../context/authContexto';
import { usePermiso } from '../context/usePermiso';
import { useTema } from '../context/temaContexto';
import { ROL_ADMIN } from '../utils/constants/roles';
import './AdminLayout.css';

/**
 * Menú dinámico agrupado por categorías. Cada enlace se pinta solo si el rol
 * del usuario tiene alguno de los permisos RBAC indicados. Los enlaces sin
 * `permisos` son siempre visibles para el personal de tienda, y `soloAdmin`
 * restringe a administradores. Si el usuario aún no tiene permisos cargados,
 * se aplica el menú por rol heredado para no dejar al personal sin navegación.
 */
const CATEGORIAS = [
  {
    id: 'general',
    etiqueta: 'General',
    icono: LayoutDashboard,
    items: [
      { ruta: '/admin', etiqueta: 'Resumen', icono: LayoutDashboard },
    ],
  },
  {
    id: 'catalogo',
    etiqueta: 'Catálogo',
    icono: Package,
    items: [
      {
        ruta: '/admin/accesorios',
        etiqueta: 'Accesorios',
        icono: Wrench,
        permisos: [
          { recurso: 'productos', accion: 'crear' },
          { recurso: 'productos', accion: 'actualizar' },
        ],
      },
      {
        ruta: '/admin/inventario',
        etiqueta: 'Inventario',
        icono: ClipboardList,
        permisos: [
          { recurso: 'inventario', accion: 'listar' },
          { recurso: 'inventario', accion: 'actualizar' },
        ],
      },
      {
        ruta: '/admin/catalogo',
        etiqueta: 'Catálogo RBAC',
        icono: Settings,
        soloSuperAdmin: true,
      },
    ],
  },
  {
    id: 'ventas',
    etiqueta: 'Ventas',
    icono: Receipt,
    items: [
      {
        ruta: '/admin/cotizaciones',
        etiqueta: 'Cotizaciones',
        icono: FileText,
        permisos: [
          { recurso: 'cotizaciones', accion: 'listar' },
          { recurso: 'cotizaciones', accion: 'actualizar' },
        ],
      },
      {
        ruta: '/admin/reportes',
        etiqueta: 'Reportes',
        icono: BarChart3,
        permisos: [{ recurso: 'cotizaciones', accion: 'listar' }],
      },
      { ruta: '/admin/tienda', etiqueta: 'Mi tienda', icono: Store, soloConTienda: true },
    ],
  },
  {
    id: 'administracion',
    etiqueta: 'Administración',
    icono: Shield,
    items: [
      {
        ruta: '/admin/usuarios',
        etiqueta: 'Usuarios',
        icono: Users,
        soloAdmin: true,
        permisos: [
          { recurso: 'usuarios', accion: 'listar' },
          { recurso: 'usuarios', accion: 'crear' },
        ],
      },
      {
        ruta: '/admin/permisos',
        etiqueta: 'Seguridad',
        icono: ShieldCheck,
        soloAdmin: true,
        permisos: [{ recurso: 'roles', accion: 'listar' }],
      },
      {
        ruta: '/admin/tiendas',
        etiqueta: 'Tiendas',
        icono: Building2,
        soloSuperAdmin: true,
      },
    ],
  },
];

export default function AdminLayout() {
  const { usuario, logout } = useAuth();
  const { tema, alternarTema } = useTema();
  const { tieneAlgunPermiso, esSuperAdmin } = usePermiso();
  const location = useLocation();
  const navigate = useNavigate();

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [categoriasAbiertas, setCategoriasAbiertas] = useState({});

  useEffect(() => { setMenuAbierto(false); }, [location.pathname]);

  const esAdmin = usuario?.id_rol === ROL_ADMIN || esSuperAdmin();
  const permisosCargados = (usuario?.permisos?.length ?? 0) > 0 || esSuperAdmin();

  function itemVisible(enlace) {
    if (enlace.soloAdmin && !esAdmin) return false;
    if (enlace.soloSuperAdmin && !esSuperAdmin()) return false;
    if (enlace.soloConTienda && !usuario?.id_tienda) return false;
    if (!permisosCargados) return true;
    if (!enlace.permisos) return true;
    return tieneAlgunPermiso(enlace.permisos);
  }

  // Categorías con al menos un item visible.
  const categorias = CATEGORIAS.map((cat) => ({
    ...cat,
    items: cat.items.filter(itemVisible),
  })).filter((cat) => cat.items.length > 0);

  function toggleCategoria(id) {
    setCategoriasAbiertas((prev) => ({ ...prev, [id]: !prev[id] }));
  }

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
        <div className="admin-header-actions">
          <button
            className="menu-toggle"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
          >
            {menuAbierto ? <X size={18} /> : <Menu size={18} />}
          </button>
          <button
            className="btn-tema"
            onClick={alternarTema}
            aria-label={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}
          >
            {tema === 'oscuro' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link to="/" className="btn btn--ghost btn--sm">Volver a la tienda</Link>
          <button className="btn btn--ghost btn--sm" onClick={manejarLogout}>Salir</button>
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-sidebar" aria-label="Navegación del panel">
          {categorias.map((cat) => {
            const abierta = !!categoriasAbiertas[cat.id];
            return (
              <div key={cat.id} className={`sidebar-cat ${abierta ? 'sidebar-cat--open' : ''}`}>
                <button
                  className="sidebar-cat__head"
                  onClick={() => toggleCategoria(cat.id)}
                  aria-expanded={abierta}
                  title={cat.etiqueta}
                >
                  <span className="sidebar-cat__icon" aria-hidden="true"><cat.icono size={18} /></span>
                  <span className="sidebar-cat__label">{cat.etiqueta}</span>
                  <span className="sidebar-cat__chevron" aria-hidden="true">{abierta ? '▾' : '▸'}</span>
                </button>
                {abierta && (
                  <nav className="sidebar-cat__items">
                    {cat.items.map((enlace) => (
                      <Link
                        key={enlace.ruta}
                        to={enlace.ruta}
                        className={location.pathname === enlace.ruta ? 'sidebar-link sidebar-link--active' : 'sidebar-link'}
                        aria-current={location.pathname === enlace.ruta ? 'page' : undefined}
                      >
                        <span className="sidebar-link__icon" aria-hidden="true"><enlace.icono size={16} /></span>
                        <span className="sidebar-link__label">{enlace.etiqueta}</span>
                      </Link>
                    ))}
                  </nav>
                )}
              </div>
            );
          })}
        </aside>

        {menuAbierto && (
          <div className="mobile-menu">
            <nav className="mobile-nav" aria-label="Navegación móvil del panel">
              {categorias.map((cat) => (
                <div key={cat.id} className="mobile-cat">
                  <span className="mobile-cat__title">{cat.etiqueta}</span>
                  {cat.items.map((enlace) => (
                    <Link
                      key={enlace.ruta}
                      to={enlace.ruta}
                      className={location.pathname === enlace.ruta ? 'mobile-nav-link mobile-nav-link--active' : 'mobile-nav-link'}
                    >
                      <span className="nav-icon" aria-hidden="true"><enlace.icono size={16} /></span>
                      <span>{enlace.etiqueta}</span>
                    </Link>
                  ))}
                </div>
              ))}
              <Link to="/" className="mobile-nav-link">Volver a la tienda</Link>
            </nav>
          </div>
        )}

        <main className="admin-main">
          <Outlet />
        </main>
      </div>

      <footer className="admin-footer">
        <span>MP / 2026</span>
        <span>Hecho para quienes siguen avanzando.</span>
      </footer>
    </div>
  );
}
