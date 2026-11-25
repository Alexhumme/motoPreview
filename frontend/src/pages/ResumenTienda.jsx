import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClipboardList, TrendingUp, WalletCards } from 'lucide-react';
import GestionInventarioTienda from '../components/inventario/GestionInventarioTienda';
import { obtenerResumenDia } from '../services/reportes';
import { obtenerTienda, obtenerTiendas } from '../services/tiendas';
import { obtenerUsuarios, actualizarUsuario } from '../services/usuarios';
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

const TABS = [
  { clave: 'inventario', etiqueta: 'Inventario de la tienda' },
  { clave: 'movimientos', etiqueta: 'Movimientos de la tienda' },
  { clave: 'datos', etiqueta: 'Datos de la tienda' },
];

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

  const [tabActivo, setTabActivo] = useState('inventario');

  const cargar = useCallback(async () => {
    try {
      const [datosTienda, datosResumen] = await Promise.all([obtenerTienda(id), obtenerResumenDia(id)]);
      setTienda(datosTienda);
      setResumen(datosResumen);
      setError('');
    } catch (err) {
      console.error(err);
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
      console.error(err);
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

      {/* Indicadores: siempre visibles, sin importar la pestaña */}
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

      <div className="inventario-tabs" role="tablist" aria-label="Vistas de la tienda">
        {TABS.map((t) => (
          <button
            key={t.clave}
            id={`tab-${t.clave}`}
            type="button"
            role="tab"
            aria-selected={tabActivo === t.clave}
            aria-controls={`panel-${t.clave}`}
            className={`inventario-tab${tabActivo === t.clave ? ' inventario-tab--activa' : ''}`}
            onClick={() => setTabActivo(t.clave)}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>

      {/* TAB: Inventario */}
      {tabActivo === 'inventario' && (
        <div id="panel-inventario" role="tabpanel" aria-labelledby="tab-inventario">
          <GestionInventarioTienda idTienda={id} />
        </div>
      )}

      {/* TAB: Movimientos */}
      {tabActivo === 'movimientos' && (
        <div id="panel-movimientos" role="tabpanel" aria-labelledby="tab-movimientos">
          <section className="card" aria-label="Movimientos de la tienda">
            <header className="card-head">
              <span>
                <small>Historial</small>
                <strong>Movimientos de {tienda.nombre_tienda}</strong>
              </span>
            </header>
            {/* TODO: reemplazar por tu componente de movimientos, por ejemplo:
                <MovimientosTienda idTienda={id} /> */}
            <p className="mini-vacio">Aún no hay un listado de movimientos configurado para esta vista.</p>
          </section>
        </div>
      )}

      {/* TAB: Datos de la tienda */}
      {tabActivo === 'datos' && (
        <div id="panel-datos" role="tabpanel" aria-labelledby="tab-datos">
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

          <section className="card" aria-label="Cotizaciones de la tienda">
            <header className="card-head">
              <span>
                <small>Cotizaciones</small>
                <strong>Cotizaciones de {tienda.nombre_tienda}</strong>
              </span>
            </header>
            <div className="cotizaciones-panel">
              <p className="cotizaciones-count">
                <strong>{pendientes.cantidad} cotización{pendientes.cantidad !== 1 ? 'es' : ''} pendiente{pendientes.cantidad !== 1 ? 's' : ''}</strong>
              </p>
              <MiniCotizacionesList idTienda={id} rango={3} />
              <div className="ver-todas">
                <Link className="btn btn--outline btn--sm" to={`/admin/tiendas/${id}/cotizaciones`}>
                  Ver todas las cotizaciones de la tienda
                </Link>
              </div>
            </div>
          </section>

          <section className="card" aria-label="Estado de solicitudes">
            <header className="card-head">
              <span>
                <small>Período</small>
                <strong>Estado de las solicitudes</strong>
              </span>
            </header>
            <PanelEstadosResumen datos={resumen} />
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
        </div>
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

/** Mini-listado de las últimas cotizaciones solicitadas a la tienda */
function MiniCotizacionesList({ idTienda, rango = 3 }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const params = { limite: rango };
      if (idTienda) params.id_tienda = idTienda;
      const query = new URLSearchParams(params).toString();
      // TODO: mover a services/cotizaciones para reutilizar el token de autenticación.
      const respuesta = await fetch(`/api/cotizaciones/ultimas?${query}`, { credentials: 'include' });
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      const data = await respuesta.json();
      setCotizaciones(data.cotizaciones || []);
    } catch (err) {
      console.error(err);
      setCotizaciones([]);
    } finally {
      setCargando(false);
    }
  }, [idTienda, rango]);

  const cargarRef = useRef();
  useEffect(() => {
    if (cargarRef.current === cargar) return;
    cargarRef.current = cargar;
    async function init() { await cargar(); }
    init();
  }, [cargar]);

  if (cargando) {
    return (
      <div className="mini-skeleton">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton" style={{ height: '40px', marginBottom: '8px' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="mini-listado">
      {cotizaciones.length === 0 && <p className="mini-vacio">No hay cotizaciones registradas.</p>}
      {cotizaciones.map((cot) => (
        <div key={cot.id_cotizacion} className="mini-item">
          <div className="mini-info">
            <strong>{cot.producto?.nombre || cot.accesorio?.acc_nombre || 'Producto'}</strong>
            <small>#{cot.id_cotizacion}</small>
          </div>
          <div className="mini-estado">
            <span className={`badge badge--${cot.estado === 'aprobada' ? 'mint' : cot.estado === 'rechazada' ? 'pink' : 'violet'}`}>
              {cot.estado}
            </span>
          </div>
          <div className="mini-acciones">
            <Link className="btn btn--ghost btn--xs" to={`/cotizacion/${cot.id_cotizacion}`}>
              Ver detalle
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Barras de estado de solicitudes (usa resumen.estados si el backend lo entrega) */
function PanelEstadosResumen({ datos }) {
  const ESTADOS = [
    { clave: 'pendiente', etiqueta: 'Pendientes' },
    { clave: 'aprobada', etiqueta: 'Aprobadas' },
    { clave: 'rechazada', etiqueta: 'Rechazadas' },
    { clave: 'completada', etiqueta: 'Completadas' },
  ];

  const obtenerCantidad = (clave) => Number(datos?.estados?.[clave]?.cantidad) || 0;
  const total = ESTADOS.reduce((suma, estado) => suma + obtenerCantidad(estado.clave), 0);

  return (
    <div className="status-bars">
      {ESTADOS.map((estado) => {
        const cantidad = obtenerCantidad(estado.clave);
        const porcentaje = total > 0 ? (cantidad / total) * 100 : 0;
        return (
          <div key={estado.clave} className="status-bar">
            <div className="status-bar__label"><span>{estado.etiqueta}</span><b>{cantidad}</b></div>
            <div className="status-bar__track">
              <div className="status-bar__value" style={{ width: `${porcentaje}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
