import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, Package, ClipboardList, Settings, Receipt, FileText,
  BarChart3, Store, Shield, Users, ShieldCheck, Building2, Wrench,
  PanelLeftClose, PanelLeftOpen, CircleUser, X, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../context/authContexto';
import { usePermiso } from '../context/usePermiso';
import { useTema } from '../context/temaContexto';
import { NOMBRE_ROL, ROL_ADMIN } from '../utils/constants/roles';
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
      {
        ruta: '/admin/marcas',
        etiqueta: 'Marcas',
        icono: Package,
        soloSuperAdmin: true,
      },
      {
        ruta: '/admin/tipos-producto',
        etiqueta: 'Tipos',
        icono: Wrench,
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

const CLAVE_RIEL = 'motopreview-admin-riel';

/** El riel recuerda su ancho (iconos o iconos + títulos) y la última categoría abierta. */
function leerRielGuardado() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_RIEL) || 'null');
    return {
      desplegada: !!guardado?.desplegada,
      categoria: typeof guardado?.categoria === 'string' ? guardado.categoria : null,
    };
  } catch {
    return { desplegada: false, categoria: null };
  }
}

export default function AdminLayout() {
  const { usuario, logout } = useAuth();
  const { tema, alternarTema } = useTema();
  const { tieneAlgunPermiso, esSuperAdmin } = usePermiso();
  const location = useLocation();
  const navigate = useNavigate();

  const [riel, setRiel] = useState(leerRielGuardado);

  useEffect(() => {
    localStorage.setItem(CLAVE_RIEL, JSON.stringify(riel));
  }, [riel]);

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

  const categoriaActiva = categorias.find((cat) => cat.id === riel.categoria) ?? null;
  const nombreUsuario = usuario?.usu_nombre || 'Mi perfil';
  const nombreRol = usuario?.rol?.nombre_rol || NOMBRE_ROL[usuario?.id_rol] || 'Personal de tienda';

  // La ruta recién visitada manda sobre la categoría persistida, pero solo cuando
  // cambia la ruta: si no, cerrar el panel mientras se sigue en la misma página
  // volvería a abrirlo de inmediato. En pantallas estrechas la segunda barra es un
  // panel superpuesto, así que elegir un enlace lo cierra en vez de dejarlo encima.
  const categoriaDeRuta =
    categorias.find((cat) => cat.items.some((item) => item.ruta === location.pathname))?.id ?? null;
  const ultimaRuta = useRef(location.pathname);

  useEffect(() => {
    if (ultimaRuta.current === location.pathname) return;
    ultimaRuta.current = location.pathname;
    const enPantallaEstrecha = window.matchMedia('(max-width: 1024px)').matches;
    setRiel((prev) => ({ ...prev, categoria: enPantallaEstrecha ? null : categoriaDeRuta }));
  }, [categoriaDeRuta, location.pathname]);

  function alternarCategoria(id) {
    setRiel((prev) => ({ ...prev, categoria: prev.categoria === id ? null : id }));
  }

  function alternarDespliegue() {
    setRiel((prev) => ({ ...prev, desplegada: !prev.desplegada }));
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
        <aside
          className={`admin-sidebar ${riel.desplegada ? 'admin-sidebar--desplegada' : ''}`}
          aria-label="Navegación del panel"
        >
          <nav className="sidebar-cats">
            {categorias.map((cat) => {
              const activa = cat.id === riel.categoria;
              return (
                <button
                  key={cat.id}
                  className={`sidebar-cat ${activa ? 'sidebar-cat--activa' : ''}`}
                  onClick={() => alternarCategoria(cat.id)}
                  aria-expanded={activa}
                  title={cat.etiqueta}
                >
                  <span className="sidebar-cat__icon" aria-hidden="true"><cat.icono size={18} /></span>
                  <span className="sidebar-cat__label">{cat.etiqueta}</span>
                </button>
              );
            })}
          </nav>

          <div className="sidebar-bottom">
            <Link
              to="/admin/perfil"
              className={`sidebar-profile ${location.pathname === '/admin/perfil' ? 'sidebar-profile--activa' : ''}`}
              title={`${nombreUsuario} · ${nombreRol}`}
            >
              <span className="sidebar-profile__icon" aria-hidden="true"><CircleUser size={18} /></span>
              <span className="sidebar-profile__text">
                <span className="sidebar-profile__name">{nombreUsuario}</span>
                <span className="sidebar-profile__role">{nombreRol}</span>
              </span>
            </Link>
            <button
              className="sidebar-toggle"
              onClick={alternarDespliegue}
              aria-label={riel.desplegada ? 'Contraer menú' : 'Expandir menú'}
              title={riel.desplegada ? 'Contraer menú' : 'Expandir menú'}
            >
              <span className="sidebar-toggle__icon" aria-hidden="true">
                {riel.desplegada ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              </span>
              <span className="sidebar-toggle__label">
                {riel.desplegada ? 'Contraer' : 'Expandir'}
              </span>
            </button>
          </div>
        </aside>

        {categoriaActiva && (
          <>
            <div className="subsidebar-respaldo" onClick={() => alternarCategoria(categoriaActiva.id)} aria-hidden="true" />
            <aside className="admin-subsidebar" aria-label={`Enlaces de ${categoriaActiva.etiqueta}`}>
              <header className="subsidebar-header">
                <span className="subsidebar-header__icon" aria-hidden="true">
                  <categoriaActiva.icono size={16} />
                </span>
                <h2 className="subsidebar-title">{categoriaActiva.etiqueta}</h2>
                <button
                  className="subsidebar-close"
                  onClick={() => alternarCategoria(categoriaActiva.id)}
                  aria-label={`Cerrar ${categoriaActiva.etiqueta}`}
                >
                  <X size={16} />
                </button>
              </header>
              <nav className="subsidebar-nav">
                {categoriaActiva.items.map((enlace) => (
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
            </aside>
          </>
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
