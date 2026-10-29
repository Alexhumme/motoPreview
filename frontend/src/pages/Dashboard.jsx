import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/authContexto';
import { usePermiso } from '../context/usePermiso';
import { obtenerInventario } from '../services/inventario';
import { obtenerCotizaciones } from '../services/cotizaciones';
import { obtenerResumenDia } from '../services/reportes';
import './Dashboard.css';

const formatoCOP = (valor) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0);

const RESUMEN_VACIO = {
  ventas_dia: { cantidad: 0, total: 0 },
  por_cobrar: { cantidad: 0, total: 0 },
  pedidos_pendientes: { cantidad: 0, total: 0 },
};

export default function Dashboard() {
  const { usuario } = useAuth();
  const { esSuperAdmin } = usePermiso();
  const [inventario, setInventario] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [resumen, setResumen] = useState(RESUMEN_VACIO);
  const [cargando, setCargando] = useState(true);

  // La dependencia es el id de la tienda, no el objeto usuario: el objeto cambia de
  // referencia cada vez que se cargan los permisos y volvería a disparar la carga.
  const idTienda = usuario?.id_tienda;
  const consolidado = esSuperAdmin();

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        // Sin tienda propia el panel muestra el consolidado de todas las tiendas;
        // el inventario y las cotizaciones solo existen por tienda.
        const resumenDia = await obtenerResumenDia().catch(() => RESUMEN_VACIO);
        if (!activo) return;
        setResumen(resumenDia);
        if (!idTienda) return;
        const [datosInventario, datosCotizaciones] = await Promise.all([
          obtenerInventario(idTienda),
          obtenerCotizaciones(idTienda),
        ]);
        if (!activo) return;
        setInventario(datosInventario);
        setCotizaciones(datosCotizaciones);
      } catch {
        setInventario([]);
        setCotizaciones([]);
        setResumen(RESUMEN_VACIO);
      } finally {
        if (activo) setCargando(false);
      }
    }
    cargar();
    return () => { activo = false; };
  }, [idTienda]);

  const stockBajo = inventario.filter((item) =>
    item.estado_inventario === 'bajo' || item.estado_inventario === 'agotado'
  );
  const ventasDia = resumen?.ventas_dia || RESUMEN_VACIO.ventas_dia;
  const porCobrar = resumen?.por_cobrar || RESUMEN_VACIO.por_cobrar;
  const pendientes = resumen?.pedidos_pendientes?.cantidad ?? 0;
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

  if (consolidado) {
    return <PanelGlobal resumen={resumen} nombre={nombre} />;
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
        <article className="kpi kpi--venta">
          <span className="kpi-icon" aria-hidden="true">↗</span>
          <div className="kpi-content">
            <small>Ventas del día</small>
            <strong>{formatoCOP(ventasDia.total)}</strong>
            <em>{ventasDia.cantidad} venta{ventasDia.cantidad !== 1 ? 's' : ''} completada{ventasDia.cantidad !== 1 ? 's' : ''} hoy</em>
          </div>
        </article>
        <article className="kpi kpi--cobrar">
          <span className="kpi-icon" aria-hidden="true">◎</span>
          <div className="kpi-content">
            <small>Pagos que faltan</small>
            <strong>{formatoCOP(porCobrar.total)}</strong>
            <em>{porCobrar.cantidad} cotización{porCobrar.cantidad !== 1 ? 'es' : ''} aprobada{porCobrar.cantidad !== 1 ? 's' : ''} por cobrar</em>
          </div>
        </article>
        <article className="kpi">
          <span className="kpi-icon" aria-hidden="true">▤</span>
          <div className="kpi-content">
            <small>Pedidos pendientes</small>
            <strong>{pendientes}</strong>
            <em>Cotizaciones por revisar</em>
          </div>
        </article>
        <article className="kpi">
          <span className="kpi-icon" aria-hidden="true">▣</span>
          <div className="kpi-content">
            <small>Productos en inventario</small>
            <strong>{inventario.length}</strong>
            <em>{stockBajo.length} con stock bajo o agotado</em>
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

function PanelGlobal({ resumen, nombre }) {
  const tiendas = resumen?.tiendas || [];
  const ventasDia = resumen?.ventas_dia || RESUMEN_VACIO.ventas_dia;
  const porCobrar = resumen?.por_cobrar || RESUMEN_VACIO.por_cobrar;
  const pendientes = resumen?.pedidos_pendientes?.cantidad ?? 0;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-breadcrumb">
          <span className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span>Panel / Todas las tiendas</span>
        </div>
        <h1 className="dashboard-title">Buenos días, {nombre}.</h1>
      </header>

      <section className="dashboard-kpis" aria-label="Indicadores clave de todas las tiendas">
        <article className="kpi kpi--venta">
          <span className="kpi-icon" aria-hidden="true">↗</span>
          <div className="kpi-content">
            <small>Ventas del día</small>
            <strong>{formatoCOP(ventasDia.total)}</strong>
            <em>{ventasDia.cantidad} venta{ventasDia.cantidad !== 1 ? 's' : ''} completada{ventasDia.cantidad !== 1 ? 's' : ''} hoy</em>
          </div>
        </article>
        <article className="kpi kpi--cobrar">
          <span className="kpi-icon" aria-hidden="true">◎</span>
          <div className="kpi-content">
            <small>Pagos que faltan</small>
            <strong>{formatoCOP(porCobrar.total)}</strong>
            <em>{porCobrar.cantidad} cotización{porCobrar.cantidad !== 1 ? 'es' : ''} aprobada{porCobrar.cantidad !== 1 ? 's' : ''} por cobrar</em>
          </div>
        </article>
        <article className="kpi">
          <span className="kpi-icon" aria-hidden="true">▤</span>
          <div className="kpi-content">
            <small>Pedidos pendientes</small>
            <strong>{pendientes}</strong>
            <em>Cotizaciones por revisar</em>
          </div>
        </article>
        <article className="kpi">
          <span className="kpi-icon" aria-hidden="true">⌂</span>
          <div className="kpi-content">
            <small>Tiendas activas</small>
            <strong>{tiendas.length}</strong>
            <em><Link to="/admin/tiendas">Ver inventario de tiendas</Link></em>
          </div>
        </article>
      </section>

      <section className="card dashboard-card" aria-label="Resumen por tienda">
        <header className="card-head">
          <span>
            <small>Por tienda</small>
            <strong>Resumen de hoy</strong>
          </span>
        </header>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tienda</th>
                <th>Ventas del día</th>
                <th>Por cobrar</th>
                <th>Pendientes</th>
                <th style={{ width: '140px' }}></th>
              </tr>
            </thead>
            <tbody>
              {tiendas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-40)', color: 'var(--color-mist-gray)' }}>
                    No hay tiendas activas.
                  </td>
                </tr>
              ) : (
                tiendas.map((t) => (
                  <tr key={t.id_tienda}>
                    <td><strong>{t.nombre}</strong></td>
                    <td>{formatoCOP(t.ventas_dia.total)}</td>
                    <td>{formatoCOP(t.por_cobrar.total)}</td>
                    <td>{t.pedidos_pendientes.cantidad}</td>
                    <td>
                      <Link className="btn btn--outline btn--sm" to={`/admin/tiendas/${t.id_tienda}`}>
                        Ver resumen
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
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