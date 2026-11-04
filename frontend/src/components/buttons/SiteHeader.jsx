import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/authContexto';
import { usePermiso } from '../../context/usePermiso';
import { useCart } from '../../context/CartContext';
import { useTema } from '../../context/temaContexto';
import { ROL_ADMIN, ROL_VENDEDOR } from '../../utils/constants/roles';
import './SiteHeader.css';

export default function SiteHeader() {
  const location = useLocation();
  const { usuario, logout } = useAuth();
  const { tieneAlgunPermiso, esSuperAdmin } = usePermiso();
  const { totalItems } = useCart();
  const { tema, alternarTema } = useTema();

  const [menuAbierto, setMenuAbierto] = useState(false);

  // Cierra el menú móvil al cambiar de ruta.
  useEffect(() => {
    setMenuAbierto(false);
  }, [location.pathname]);

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
            Inicio
          </Link>
          <Link
            to="/configurador"
            className={`nav-link${location.pathname === '/configurador' ? ' nav-link--active' : ''}`}
          >
            Configurador
          </Link>
          <Link
            to="/catalogo"
            className={`nav-link${location.pathname === '/catalogo' ? ' nav-link--active' : ''}`}
          >
            Catálogo
          </Link>
          <Link
            to="/contacto"
            className={`nav-link${location.pathname === '/contacto' ? ' nav-link--active' : ''}`}
          >
            Contactanos
          </Link>
        </nav>

        <div className="header-actions">
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
          <Link to="/carrito" className="btn cart-button">
            <span>▣</span>
            <span className="cart-label">Carrito</span>
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </Link>
        </div>
      </div>

      {menuAbierto && (
        <div className="mobile-menu">
          <nav className="mobile-nav" aria-label="Navegación móvil">
            <Link to="/" className={`mobile-nav-link${location.pathname === '/' ? ' mobile-nav-link--active' : ''}`}>Inicio</Link>
            <Link to="/catalogo" className={`mobile-nav-link${location.pathname === '/catalogo' ? ' mobile-nav-link--active' : ''}`}>Catálogo</Link>
            <Link to="/configurador" className={`mobile-nav-link${location.pathname === '/configurador' ? ' mobile-nav-link--active' : ''}`}>Configurador</Link>
            <Link to="/contacto" className={`mobile-nav-link${location.pathname === '/contacto' ? ' mobile-nav-link--active' : ''}`}>Contactanos</Link>
            <a href="/#como-funciona" className="mobile-nav-link">Cómo funciona</a>
            <Link to="/carrito" className="mobile-nav-link">Carrito {totalItems > 0 && `(${totalItems})`}</Link>
            {usuario ? (
              <>
                <Link to={esSuperAdmin() ? '/admin/permisos' : esStaff ? '/admin' : '/mis-cotizaciones'} className="mobile-nav-link">
                  {usuario.usu_nombre?.split(' ')[0]}
                </Link>
                {mostrarPanel && (esSuperAdmin() ? (
                  <Link to="/admin/permisos" className="mobile-nav-link">Seguridad</Link>
                ) : (
                  <Link to="/admin" className="mobile-nav-link">Panel</Link>
                ))}
                <button onClick={logout} className="mobile-nav-link mobile-nav-link--button">Salir</button>
              </>
            ) : (
              <Link to="/login" className="mobile-nav-link mobile-nav-link--brand">Ingresar</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}