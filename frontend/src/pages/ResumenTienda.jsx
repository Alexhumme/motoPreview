import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { obtenerResumenDia } from '../services/reportes';
import { obtenerTienda } from '../services/tiendas';
import { mensajeError } from '../services/crud';
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
  const [tienda, setTienda] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

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
  }, [id]);

  useEffect(() => {
    async function init() { await cargar(); }
    init();
  }, [cargar]);

  function reintentar() {
    setCargando(true);
    cargar();
  }

  if (cargando) {
    return (
      <div className="tiendas" role="status" aria-live="polite">
        <div className="skeleton" style={{ height: '56px', width: '320px', marginBottom: 'var(--space-24)' }} />
        <div className="skeleton" style={{ height: '120px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tiendas" role="alert">
        <p>{error}</p>
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
          <span className="kpi-icon" aria-hidden="true">↗</span>
          <div className="kpi-content">
            <small>Ventas del día</small>
            <strong>{formatoCOP(ventasDia.total)}</strong>
            <em>{ventasDia.cantidad} venta{ventasDia.cantidad !== 1 ? 's' : ''} completada{ventasDia.cantidad !== 1 ? 's' : ''}</em>
          </div>
        </article>
        <article className="kpi kpi--cobrar">
          <span className="kpi-icon" aria-hidden="true">◎</span>
          <div className="kpi-content">
            <small>Pagos que faltan</small>
            <strong>{formatoCOP(porCobrar.total)}</strong>
            <em>{porCobrar.cantidad} cotización{porCobrar.cantidad !== 1 ? 'es' : ''} por cobrar</em>
          </div>
        </article>
        <article className="kpi">
          <span className="kpi-icon" aria-hidden="true">▤</span>
          <div className="kpi-content">
            <small>Pedidos pendientes</small>
            <strong>{pendientes.cantidad}</strong>
            <em>{formatoCOP(pendientes.total)} sin revisar</em>
          </div>
        </article>
      </section>

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
    </div>
  );
}
