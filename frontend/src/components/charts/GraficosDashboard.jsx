import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const COLORES = {
  cotizaciones: 'var(--color-brand-orange-soft)',
  ventas: 'var(--color-brand-orange)',
  pendiente: 'var(--color-brand-orange-soft)',
  aprobada: 'var(--color-brand-orange)',
  rechazada: 'var(--color-jam-pink)',
  completada: 'var(--color-mist-gray)',
};

const ETIQUETAS_ESTADOS = {
  pendiente: 'Pendientes',
  aprobada: 'Aprobadas',
  rechazada: 'Rechazadas',
  completada: 'Completadas',
};

const eje = {
  tick: { fill: 'var(--color-mist-gray)', fontSize: 11 },
  axisLine: { stroke: 'var(--color-ink-border)' },
  tickLine: { stroke: 'var(--color-ink-border)' },
};

function fechaCorta(fecha) {
  const [anio, mes, dia] = String(fecha).split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' })
    .format(new Date(anio, mes - 1, dia));
}

function TooltipGrafico({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const titulo = label && /^\d{4}-\d{2}-\d{2}$/.test(label) ? fechaCorta(label) : label;
  return (
    <div className="chart-tooltip">
      {titulo && <strong>{titulo}</strong>}
      {payload.map((item) => (
        <span key={item.dataKey || item.name}>
          <i style={{ background: item.color || item.payload?.fill }} aria-hidden="true" />
          {item.name}: {item.value}
        </span>
      ))}
    </div>
  );
}

export default function GraficosDashboard({ datos }) {
  const historico = (datos.diario || []).map((dia) => ({
    ...dia,
    cotizaciones: dia.cotizaciones?.cantidad || 0,
    ventas: dia.ventas_completadas?.cantidad || 0,
  }));
  const estados = Object.entries(datos.estados || {})
    .filter(([, magnitud]) => magnitud?.cantidad > 0)
    .map(([clave, magnitud]) => ({
      clave,
      nombre: ETIQUETAS_ESTADOS[clave] || clave,
      cantidad: magnitud.cantidad,
      fill: COLORES[clave] || COLORES.completada,
    }));
  const tiendas = (datos.tiendas || []).map((tienda) => ({
    ...tienda,
    cotizaciones: tienda.cotizaciones?.cantidad || 0,
    ventas: tienda.ventas_completadas?.cantidad || 0,
  }));
  const hayActividad = historico.some((dia) => dia.cotizaciones > 0 || dia.ventas > 0);
  const cantidadGraficos = Number(estados.length > 0) + Number(tiendas.length > 0);

  return (
    <section className="dashboard-charts" aria-label="Análisis gráfico del período">
      <article className="card dashboard-card">
        <header className="card-head">
          <span><small>Histórico</small><strong>Solicitudes y ventas por día</strong></span>
        </header>
        {hayActividad ? (
          <div className="chart-container" role="img" aria-label="Gráfico de barras y líneas con cotizaciones y ventas completadas por día">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={historico} margin={{ top: 12, right: 12, left: -18, bottom: 0 }} accessibilityLayer>
                <CartesianGrid stroke="var(--color-ink-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="fecha" tickFormatter={fechaCorta} minTickGap={28} {...eje} />
                <YAxis allowDecimals={false} {...eje} />
                <Tooltip content={<TooltipGrafico />} cursor={{ fill: 'rgba(242, 106, 33, 0.08)' }} />
                <Legend iconType="circle" wrapperStyle={{ color: 'var(--color-mist-gray)', fontSize: 12 }} />
                <Bar dataKey="cotizaciones" name="Cotizaciones" fill={COLORES.cotizaciones} radius={[3, 3, 0, 0]} maxBarSize={22} />
                <Line dataKey="ventas" name="Ventas completadas" stroke={COLORES.ventas} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="chart-empty">Aún no hay solicitudes ni ventas en este período.</p>
        )}
      </article>

      {cantidadGraficos > 0 && (
        <div className={`dashboard-grid${cantidadGraficos === 1 ? ' dashboard-grid--una' : ''}`}>
          {estados.length > 0 && (
            <article className="card dashboard-card">
              <header className="card-head">
                <span><small>Distribución</small><strong>Estados de las cotizaciones</strong></span>
              </header>
              <div className="chart-container chart-container--pie" role="img" aria-label="Gráfico de torta con la distribución de cotizaciones por estado">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart accessibilityLayer>
                    <Pie
                      data={estados}
                      dataKey="cantidad"
                      nameKey="nombre"
                      cx="50%"
                      cy="45%"
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={3}
                      label={({ nombre, percent }) => `${nombre} ${Math.round(percent * 100)}%`}
                      labelLine={false}
                    >
                      {estados.map((estado) => <Cell key={estado.clave} fill={estado.fill} />)}
                    </Pie>
                    <Tooltip content={<TooltipGrafico />} />
                    <Legend iconType="circle" wrapperStyle={{ color: 'var(--color-mist-gray)', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>
          )}

          {tiendas.length > 0 && (
            <article className="card dashboard-card">
              <header className="card-head">
                <span><small>Comparación</small><strong>Actividad por tienda</strong></span>
              </header>
              <div
                className="chart-container"
                style={{ height: Math.max(280, tiendas.length * 72 + 70) }}
                role="img"
                aria-label="Gráfico de barras que compara cotizaciones y ventas completadas por tienda"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tiendas} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }} accessibilityLayer>
                    <CartesianGrid stroke="var(--color-ink-border)" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} {...eje} />
                    <YAxis type="category" dataKey="nombre" width={112} {...eje} />
                    <Tooltip content={<TooltipGrafico />} cursor={{ fill: 'rgba(242, 106, 33, 0.08)' }} />
                    <Legend iconType="circle" wrapperStyle={{ color: 'var(--color-mist-gray)', fontSize: 12 }} />
                    <Bar dataKey="cotizaciones" name="Cotizaciones" fill={COLORES.cotizaciones} radius={[0, 3, 3, 0]} maxBarSize={22} />
                    <Bar dataKey="ventas" name="Ventas completadas" fill={COLORES.ventas} radius={[0, 3, 3, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
