import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { obtenerInventario } from '../services/inventario';
import { obtenerCotizaciones } from '../services/cotizaciones';
import './Dashboard.css';

export default function Dashboard() {
  const { usuario } = useAuth();
  const [inventario, setInventario] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      try {
        const [datosInventario, datosCotizaciones] = await Promise.all([
          obtenerInventario(usuario.id_tienda),
          obtenerCotizaciones(usuario.id_tienda)
        ]);
        setInventario(datosInventario);
        setCotizaciones(datosCotizaciones);
      } catch {
        setInventario([]);
        setCotizaciones([]);
      } finally {
        setCargando(false);
      }
    }
    if (usuario?.id_tienda) cargar();
  }, [usuario]);

  const stockBajo = inventario.filter((item) =>
    item.estado_inventario === 'bajo' || item.estado_inventario === 'agotado'
  );
  const pendientes = cotizaciones.filter((item) => item.coti_estado === 'pendiente').length;
  const aprobadas = cotizaciones.filter((item) => item.coti_estado === 'aprobada').length;
  const agotados = inventario.filter((item) => item.estado_inventario === 'agotado').length;
  const maxStatus = Math.max(cotizaciones.length, 1);
  const nombre = usuario?.usu_nombre?.split(' ')[0] || 'administrador';
  const actividad = useMemo(() => cotizaciones.slice(0, 4), [cotizaciones]);

  if (cargando) {
    return (
      <div className="dashboard" role="status" aria-live="polite">
        <div className="skeleton" style={{ height: '56px', width: '300px', marginBottom: 'var(--space-24)' }} />
        <div className="skeleton" style={{ height: '120px' }} />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-breadcrumb">
          <span className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span>Panel / Resumen</span>
        </div>
        <h1 className="dashboard-title">Buenos días, {nombre}.</h1>
      </header>

      {/* Alert */}
      <section className="dashboard-alert" aria-live="polite">
        <span className="alert-icon" aria-hidden="true">✦</span>
        <div className="alert-content">
          <strong>Tu tienda está funcionando bien.</strong>
          <span>Hay {pendientes} cotización{pendientes !== 1 ? 'es' : ''} pendiente{pendientes !== 1 ? 's' : ''} por revisar.</span>
        </div>
      </section>

      {/* KPIs */}
      <section className="dashboard-kpis" aria-label="Indicadores clave">
        <article className="kpi">
          <span className="kpi-icon" aria-hidden="true">▣</span>
          <div className="kpi-content">
            <small>Productos en inventario</small>
            <strong>{inventario.length}</strong>
            <em>Registros activos</em>
          </div>
        </article>
        <article className="kpi kpi--alert">
          <span className="kpi-icon" aria-hidden="true">!</span>
          <div className="kpi-content">
            <small>Stock bajo o agotado</small>
            <strong>{stockBajo.length}</strong>
            <em>Requieren atención</em>
          </div>
        </article>
        <article className="kpi">
          <span className="kpi-icon" aria-hidden="true">▤</span>
          <div className="kpi-content">
            <small>Cotizaciones pendientes</small>
            <strong>{pendientes}</strong>
            <em>{cotizaciones.length} solicitudes totales</em>
          </div>
        </article>
      </section>

      {/* Grid */}
      <section className="dashboard-grid" aria-label="Paneles de detalle">
        {/* Performance bars */}
        <article className="card dashboard-card">
          <header className="card-head">
            <span>
              <small>Rendimiento</small>
              <strong>Estado de la operación</strong>
            </span>
          </header>
          <div className="status-bars">
            <StatusBar
              label="Inventario normal"
              value={Math.max(inventario.length - stockBajo.length, 0)}
              max={inventario.length}
              color="mint"
            />
            <StatusBar
              label="Cotizaciones aprobadas"
              value={aprobadas}
              max={maxStatus}
              color="violet"
            />
            <StatusBar
              label="Agotados"
              value={agotados}
              max={inventario.length}
              color="gray"
            />
          </div>
        </article>

        {/* Recent activity */}
        <article className="card dashboard-card">
          <header className="card-head">
            <span>
              <small>Actividad reciente</small>
              <strong>Últimas cotizaciones</strong>
            </span>
          </header>
          <div className="activity-list">
            {actividad.length ? (
              actividad.map((item) => (
                <div key={item.id_cotizacion} className="activity-row">
                  <span className="activity-avatar" aria-hidden="true">MP</span>
                  <div className="activity-info">
                    <strong>Solicitud {item.coti_estado}</strong>
                    <small>
                      {item.coti_fecha
                        ? new Date(item.coti_fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Sin fecha'}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="activity-row activity-row--empty">Todavía no hay actividad reciente.</p>
            )}
          </div>
        </article>
      </section>

      {/* Low stock alert */}
      {stockBajo.length > 0 && (
        <section className="card dashboard-card dashboard-stock" aria-label="Productos con stock bajo">
          <header className="card-head">
            <span>
              <small>Atención requerida</small>
              <strong>Necesitan reabastecimiento</strong>
            </span>
          </header>
          <div className="activity-list">
            {stockBajo.slice(0, 5).map((item) => (
              <div key={item.id_inventario} className="activity-row activity-row--alert">
                <span className="activity-avatar activity-avatar--alert" aria-hidden="true">!</span>
                <div className="activity-info">
                  <strong>{item.accesorio?.acc_nombre || 'Producto'}</strong>
                  <small>Quedan {item.stock_actual}; mínimo {item.stock_minimo}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatusBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const colorClass = {
    mint: 'status-bar__value--mint',
    violet: 'status-bar__value--violet',
    gray: 'status-bar__value--gray'
  }[color] || '';

  return (
    <div className="status-bar">
      <div className="status-bar__label">
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <div className="status-bar__track">
        <div className={`status-bar__value ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}