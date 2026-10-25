import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { obtenerCotizaciones } from '../services/cotizaciones';
import './Reportes.css';

const precioFormateado = (valor) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

export default function Reportes() {
  const { usuario } = useAuth();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [rango, setRango] = useState('mes');

  useEffect(() => {
    async function cargar() {
      try {
        const datos = await obtenerCotizaciones(usuario.id_tienda);
        setCotizaciones(datos);
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [usuario]);

  if (cargando) {
    return (
      <div className="reportes" role="status" aria-live="polite">
        <div className="skeleton" style={{ height: '56px', width: '200px', marginBottom: 'var(--space-32)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-20)' }}>
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '120px' }} />
        </div>
      </div>
    );
  }

  const ahora = new Date();
  const esEsteMes = (fecha) => {
    const d = new Date(fecha);
    return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
  };

  const cotizacionesEnRango = rango === 'mes'
    ? cotizaciones.filter((c) => esEsteMes(c.fecha_solicitud))
    : cotizaciones;

  const ventasConfirmadas = cotizacionesEnRango.filter(
    (c) => c.coti_estado === 'aprobada' || c.coti_estado === 'completada'
  );
  const totalVentas = ventasConfirmadas.reduce((suma, c) => suma + Number(c.total), 0);
  const totalCotizaciones = cotizacionesEnRango.length;
  const tasaAprobacion = totalCotizaciones > 0
    ? Math.round((ventasConfirmadas.length / totalCotizaciones) * 100)
    : 0;

  const conteoEstados = { pendiente: 0, aprobada: 0, rechazada: 0, completada: 0 };
  cotizacionesEnRango.forEach((c) => {
    conteoEstados[c.coti_estado] = (conteoEstados[c.coti_estado] || 0) + 1;
  });

  const conteoAccesorios = {};
  cotizacionesEnRango.forEach((c) => {
    c.detalle_cotizacion?.forEach((item) => {
      const nombre = item.accesorio?.acc_nombre || 'Desconocido';
      conteoAccesorios[nombre] = (conteoAccesorios[nombre] || 0) + item.cantidad;
    });
  });
  const topAccesorios = Object.entries(conteoAccesorios)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCantidad = topAccesorios.length > 0 ? topAccesorios[0][1] : 1;

  return (
    <div className="reportes">
      <header className="reportes-header">
        <h1 className="reportes-title">Reportes</h1>
        <div className="reportes-toggle" role="radiogroup" aria-label="Filtrar por período">
          <button
            className={`btn ${rango === 'mes' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setRango('mes')}
            role="radio"
            aria-checked={rango === 'mes'}
          >
            Este mes
          </button>
          <button
            className={`btn ${rango === 'todo' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setRango('todo')}
            role="radio"
            aria-checked={rango === 'todo'}
          >
            Todo el tiempo
          </button>
        </div>
      </header>

      <section className="reportes-kpis" aria-label="Resumen de métricas">
        <article className="kpi">
          <span className="kpi-icon" aria-hidden="true">▤</span>
          <div className="kpi-content">
            <small>Ventas confirmadas</small>
            <strong>{precioFormateado(totalVentas)}</strong>
            <em>{rango === 'mes' ? 'este mes' : 'histórico'}</em>
          </div>
        </article>
        <article className="kpi">
          <span className="kpi-icon" aria-hidden="true">▤</span>
          <div className="kpi-content">
            <small>Cotizaciones recibidas</small>
            <strong>{totalCotizaciones}</strong>
            <em>{rango === 'mes' ? 'este mes' : 'histórico'}</em>
          </div>
        </article>
        <article className="kpi">
          <span className="kpi-icon" aria-hidden="true">%</span>
          <div className="kpi-content">
            <small>Tasa de aprobación</small>
            <strong>{tasaAprobacion}%</strong>
            <em>{rango === 'mes' ? 'este mes' : 'histórico'}</em>
          </div>
        </article>
      </section>

      <section className="reportes-grid" aria-label="Detalles de reportes">
        <article className="card reportes-card">
          <header className="card-head">
            <strong>Accesorios más cotizados</strong>
          </header>
          <div className="reportes-ranking">
            {topAccesorios.length === 0 ? (
              <p className="reportes-empty">Sin datos en este periodo.</p>
            ) : (
              topAccesorios.map(([nombre, cantidad]) => (
                <div key={nombre} className="reportes-row">
                  <div className="reportes-row-info">
                    <span>{nombre}</span>
                    <span className="reportes-row-count">{cantidad}</span>
                  </div>
                  <div className="reportes-bar-track">
                    <div
                      className="reportes-bar"
                      style={{ width: `${(cantidad / maxCantidad) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card reportes-card">
          <header className="card-head">
            <strong>Cotizaciones por estado</strong>
          </header>
          <div className="reportes-estados">
            <EstadoItem label="Pendientes" value={conteoEstados.pendiente} color="violet" />
            <EstadoItem label="Aprobadas" value={conteoEstados.aprobada} color="mint" />
            <EstadoItem label="Rechazadas" value={conteoEstados.rechazada} color="pink" />
            <EstadoItem label="Completadas" value={conteoEstados.completada} color="gray" />
          </div>
        </article>
      </section>
    </div>
  );
}

function EstadoItem({ label, value, color }) {
  const colorMap = {
    mint: 'badge--mint',
    violet: 'badge--violet',
    pink: 'badge--pink',
    gray: 'badge--gray'
  };

  return (
    <div className="estado-item">
      <span className={`badge ${colorMap[color]}`}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}