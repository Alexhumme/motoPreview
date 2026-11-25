import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClipboardList, TrendingUp, WalletCards } from 'lucide-react';
import GestionInventarioTienda from '../components/inventario/GestionInventarioTienda';
import { obtenerResumenDia } from '../services/reportes';
import { obtenerTienda, obtenerTiendas, obtenerUsuarios } from '../services/tiendas';
import { actualizarUsuario } from '../services/roles';
import { mensajeError } from '../services/crud';
import DataTable from '../components/tables/DataTable';
import { usePermiso } from '../context/usePermiso';
import {
  NOMBRE_ROL,
  ROL_SUPERADMIN,
  ROL_ADMIN,
  ROL_VENDEDOR,
  ROL_CLIENTE,
} from '../utils/constants/roles';
import './Dashboard.css';
import './Tiendas.css';

const formatoCOP = (valor) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0);

const VACIO = { cantidad: 0, total: 0 };

/**
 * Resumen del día de una tienda específica, abierto desde el inventario de
 * tiendas. El backend solo entrega esta vista al superadmin; el personal de
 * tienda recibe siempre su propio resumen.
 */
export default function ResumenTienda() {
  const { id } = useParams();
  const { esSuperAdmin } = usePermiso();
  // Funciona tanto si usePermiso devuelve una función como un booleano.
  const esSuper = typeof esSuperAdmin === 'function' ? !!esSuperAdmin() : !!esSuperAdmin;

  const [tienda, setTienda] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const [usuarios, setUsuarios] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [errorUsuarios, setErrorUsuarios] = useState('');

  const [modalCambiarRol, setModalCambiarRol] = useState(null);
  const [rolDestino, setRolDestino] = useState('');
  const [tiendaDestino, setTiendaDestino] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [datosTienda, datosResumen] = await Promise.all([obtenerTienda(id), obtenerResumenDia(id)]);
      setTienda(datosTienda);
      setResumen(datosResumen);
      setError('');
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cargar el resumen de esta tienda.'));
    } finally {
      setCargando(false);
    }

    if (!esSuper) return;

    try {
      setCargandoUsuarios(true);
      const [datosUsuarios, datosTiendas] = await Promise.all([
        obtenerUsuarios(id),
        obtenerTiendas().catch(() => []),
      ]);
      setUsuarios(datosUsuarios);
      setTiendas(datosTiendas);
      setErrorUsuarios('');
    } catch (err) {
      setErrorUsuarios(mensajeError(err, 'No se pudo cargar la lista de usuarios de la tienda.'));
    } finally {
      setCargandoUsuarios(false);
    }
  }, [id, esSuper]);

  const cargarRef = useRef();
  useEffect(() => {
    if (cargarRef.current === cargar) return;
    cargarRef.current = cargar;
    async function init() { await cargar(); }
    init();
  }, [cargar]);

  function reintentar() {
    setCargando(true);
    cargar();
  }

  function abrirCambiarRol(usuario) {
    setModalCambiarRol(usuario);
    setRolDestino(usuario.id_rol || '');
    setTiendaDestino(usuario.id_tienda || '');
    setErrorModal('');
  }

  function cerrarCambiarRol() {
    setModalCambiarRol(null);
    setRolDestino('');
    setTiendaDestino('');
    setErrorModal('');
  }

  async function confirmarCambiarRol(e) {
    if (e?.preventDefault) e.preventDefault();
    if (!modalCambiarRol || !rolDestino) return;
    setGuardando(true);
    setErrorModal('');
    try {
      await actualizarUsuario(modalCambiarRol.id_usuario, {
        id_rol: rolDestino,
        id_tienda: tiendaDestino || null,
      });
      cerrarCambiarRol();
      await cargar();
    } catch (err) {
      setErrorModal(err.response?.data?.error || 'Error al cambiar el rol.');
    } finally {
      setGuardando(false);
    }
  }

  const columnasUsuarios = [
    { clave: 'usu_nombre', etiqueta: 'Nombre', render: (u) => <strong>{u.usu_nombre}</strong> },
    { clave: 'usu_email', etiqueta: 'Email' },
    {
      clave: 'rol',
      etiqueta: 'Rol',
      valor: (u) => (u.id_rol ? NOMBRE_ROL[u.id_rol] || String(u.id_rol) : 'Sin rol'),
      render: (u) => {
        const rol = u.id_rol ? NOMBRE_ROL[u.id_rol] || String(u.id_rol) : 'Sin rol';
        return <span className="badge badge--violet">{rol}</span>;
      },
    },
    {
      clave: 'acciones',
      etiqueta: 'Acciones',
      render: (u) =>
        esSuper ? (
          <div className="acciones-small">
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              onClick={() => abrirCambiarRol(u)}
            >
              Cambiar rol
            </button>
          </div>
        ) : null,
    },
  ];

  if (cargando) {
    return (
      <div className="tiendas" role="status" aria-live="polite">
        <div className="skeleton" style={{ height: '56px', width: '320px', marginBottom: 'var(--space-24)' }} />
        <div className="skeleton" style={{ height: '120px' }} />
      </div>
    );
  }

  if (error || !tienda) {
    return (
      <div className="tiendas" role="alert">
        <p>{error || 'No se encontró la tienda.'}</p>
        <div className="tiendas-acciones">
          <button type="button" className="btn btn--outline btn--sm" onClick={reintentar}>Reintentar</button>
          <Link className="btn btn--ghost btn--sm" to="/admin/tiendas">Volver al inventario</Link>
        </div>
      </div>
    );
  }

  const ventasDia = resumen?.ventas_dia || VACIO;
  const porCobrar = resumen?.por_cobrar || VACIO;
  const pendientes = resumen?.pedidos_pendientes || VACIO;

  return (
    <div className="tiendas">
      <header className="tiendas-header">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span>Tiendas / {tienda.nombre_tienda}</span>
          <h1 className="tiendas-title">{tienda.nombre_tienda}</h1>
          <p className="tiendas-help">
            Resumen del {resumen?.fecha || 'día'} · {tienda.plan_subscripcion?.plan_nombre || 'sin plan'} ·{' '}
            <span className={`badge badge--${tienda.estado_tienda === 'activa' ? 'mint' : 'gray'}`}>{tienda.estado_tienda}</span>
          </p>
        </div>
        <div className="tiendas-acciones">
          <Link className="btn btn--ghost btn--sm" to="/admin/tiendas">Volver al inventario</Link>
        </div>
      </header>

      <section className="dashboard-kpis" aria-label={`Indicadores de ${tienda.nombre_tienda}`}>
        <article className="kpi kpi--venta">
          <span className="kpi-icon" aria-hidden="true"><TrendingUp size={20} /></span>
          <div className="kpi-content">
            <small>Ventas del día</small>
            <strong>{formatoCOP(ventasDia.total)}</strong>
            <em>{ventasDia.cantidad} venta{ventasDia.cantidad !== 1 ? 's' : ''} completada{ventasDia.cantidad !== 1 ? 's' : ''}</em>
          </div>
        </article>
        <article className="kpi kpi--cobrar">
          <span className="kpi-icon" aria-hidden="true"><WalletCards size={20} /></span>
          <div className="kpi-content">
            <small>Pagos que faltan</small>
            <strong>{formatoCOP(porCobrar.total)}</strong>
            <em>{porCobrar.cantidad} cotización{porCobrar.cantidad !== 1 ? 'es' : ''} por cobrar</em>
          </div>
        </article>
        <article className="kpi">
          <span className="kpi-icon" aria-hidden="true"><ClipboardList size={20} /></span>
          <div className="kpi-content">
            <small>Pedidos pendientes</small>
            <strong>{pendientes.cantidad}</strong>
            <em>{formatoCOP(pendientes.total)} sin revisar</em>
          </div>
        </article>
      </section>

      <GestionInventarioTienda idTienda={id} />

      <section className="card" aria-label="Datos de contacto">
        <header className="card-head">
          <span>
            <small>Contacto</small>
            <strong>Datos de la tienda</strong>
          </span>
        </header>
        <dl className="tiendas-data-list">
          <div><dt>NIT</dt><dd>{tienda.nit || '—'}</dd></div>
          <div><dt>Teléfono</dt><dd>{tienda.telefono_tienda || '—'}</dd></div>
          <div><dt>Email</dt><dd>{tienda.email_tienda || '—'}</dd></div>
          <div><dt>Dirección</dt><dd>{tienda.direccion_tienda || '—'}</dd></div>
        </dl>
      </section>

      {esSuper && (
        <section className="card" aria-label="Usuarios de la tienda">
          <header className="card-head">
            <span>
              <small>Usuarios</small>
              <strong>Usuarios asignados a {tienda.nombre_tienda}</strong>
            </span>
          </header>
          {errorUsuarios && <p className="form-error" role="alert">{errorUsuarios}</p>}
          {cargandoUsuarios ? (
            <p>Cargando usuarios...</p>
          ) : (
            <DataTable
              columnas={columnasUsuarios}
              filas={usuarios}
              claveFila="id_usuario"
              cargando={cargandoUsuarios}
              vacio="No hay usuarios asignados a esta tienda."
            />
          )}
        </section>
      )}

      {modalCambiarRol && (
        <div
          className="modal-overlay"
          onClick={cerrarCambiarRol}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cambiar-rol-modal-title"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="cambiar-rol-modal-title" className="modal-title">Cambiar rol de usuario</h2>
              <button type="button" className="modal-close" onClick={cerrarCambiarRol} aria-label="Cerrar">✕</button>
            </header>

            <form onSubmit={confirmarCambiarRol} className="modal-form">
              <p>
                <strong>{modalCambiarRol.usu_nombre}</strong> · {modalCambiarRol.usu_email}
              </p>

              <div className="form-field">
                <label htmlFor="rol-destino" className="form-label">Rol destino</label>
                <select
                  id="rol-destino"
                  className="form-input form-select"
                  value={rolDestino}
                  onChange={(e) => setRolDestino(e.target.value)}
                  disabled={guardando}
                >
                  <option value={ROL_SUPERADMIN}>Superadmin</option>
                  <option value={ROL_ADMIN}>Admin Tienda</option>
                  <option value={ROL_VENDEDOR}>Vendedor</option>
                  <option value={ROL_CLIENTE}>Cliente</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="tienda-asignar" className="form-label">Tienda</label>
                <select
                  id="tienda-asignar"
                  className="form-input form-select"
                  value={tiendaDestino}
                  onChange={(e) => setTiendaDestino(e.target.value)}
                  disabled={guardando}
                >
                  <option value="">Sin tienda</option>
                  {tiendas.map((t) => (
                    <option key={t.id_tienda} value={t.id_tienda}>
                      {t.tienda_nombre || t.nombre_tienda || t.id_tienda}
                    </option>
                  ))}
                </select>
              </div>

              {errorModal && <p className="form-error" role="alert">{errorModal}</p>}

              <footer className="modal-footer">
                <button type="button" className="btn btn--ghost" onClick={cerrarCambiarRol} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={guardando || !rolDestino}>
                  {guardando ? 'Guardando...' : 'Cambiar rol'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
