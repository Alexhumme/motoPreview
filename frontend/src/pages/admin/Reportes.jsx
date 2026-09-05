import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { obtenerCotizaciones } from '../../services/cotizaciones';
import './Reportes.css';

export default function Reportes() {
  const { usuario } = useAuth();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [rango, setRango] = useState('mes'); // 'mes' | 'todo'

  useEffect(() => {
    async function cargar() {
      try {
        const datos = await obtenerCotizaciones();
        setCotizaciones(datos.filter((c) => c.id_tienda === usuario.id_tienda));
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [usuario]);

  if (cargando) return <p>Cargando reportes...</p>;

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

  // Conteo por estado
  const conteoEstados = { pendiente: 0, aprobada: 0, rechazada: 0, completada: 0 };
  cotizacionesEnRango.forEach((c) => {
    conteoEstados[c.coti_estado] = (conteoEstados[c.coti_estado] || 0) + 1;
  });

  // Accesorios más cotizados (por cantidad total pedida, dentro del rango)
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

  const precioFormateado = (valor) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

  return (
    <div>
      <div className="reportes__header">
        <h1 className="reportes__titulo">Reportes</h1>
        <div className="reportes__toggle">
          <button
            className={rango === 'mes' ? 'reportes__toggle-boton--activo' : ''}
            onClick={() => setRango('mes')}
          >
            Este mes
          </button>
          <button
            className={rango === 'todo' ? 'reportes__toggle-boton--activo' : ''}
            onClick={() => setRango('todo')}
          >
            Todo el tiempo
          </button>
        </div>
      </div>

      <div className="reportes__tarjetas">
        <div className="reportes__tarjeta">
          <span className="reportes__numero">{precioFormateado(totalVentas)}</span>
          <span className="reportes__etiqueta">Ventas confirmadas ({rango === 'mes' ? 'este mes' : 'histórico'})</span>
        </div>
        <div className="reportes__tarjeta">
          <span className="reportes__numero">{totalCotizaciones}</span>
          <span className="reportes__etiqueta">Cotizaciones recibidas</span>
        </div>
        <div className="reportes__tarjeta">
          <span className="reportes__numero">{tasaAprobacion}%</span>
          <span className="reportes__etiqueta">Tasa de aprobación</span>
        </div>
      </div>

      <div className="reportes__columnas">
        <div className="reportes__panel">
          <h2>Accesorios más cotizados</h2>
          {topAccesorios.length === 0 ? (
            <p className="reportes__vacio">Sin datos en este periodo.</p>
          ) : (
            <div className="reportes__ranking">
              {topAccesorios.map(([nombre, cantidad]) => (
                <div key={nombre} className="reportes__fila-ranking">
                  <div className="reportes__fila-info">
                    <span>{nombre}</span>
                    <span className="reportes__fila-cantidad">{cantidad}</span>
                  </div>
                  <div className="reportes__barra-fondo">
                    <div
                      className="reportes__barra"
                      style={{ width: `${(cantidad / maxCantidad) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="reportes__panel">
          <h2>Cotizaciones por estado</h2>
          <div className="reportes__estados">
            <div className="reportes__estado-item">
              <span className="reportes__estado-dot reportes__estado-dot--pendiente" />
              <span>Pendientes</span>
              <strong>{conteoEstados.pendiente}</strong>
            </div>
            <div className="reportes__estado-item">
              <span className="reportes__estado-dot reportes__estado-dot--aprobada" />
              <span>Aprobadas</span>
              <strong>{conteoEstados.aprobada}</strong>
            </div>
            <div className="reportes__estado-item">
              <span className="reportes__estado-dot reportes__estado-dot--rechazada" />
              <span>Rechazadas</span>
              <strong>{conteoEstados.rechazada}</strong>
            </div>
            <div className="reportes__estado-item">
              <span className="reportes__estado-dot reportes__estado-dot--completada" />
              <span>Completadas</span>
              <strong>{conteoEstados.completada}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}