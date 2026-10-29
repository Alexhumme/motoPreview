import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/authContexto';
import { obtenerCotizaciones } from '../../services/cotizaciones';
import SiteHeader from '../../components/buttons/SiteHeader';
import './MisCotizaciones.css';

const precioFormateado = (valor) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

const estadoLabels = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  completada: 'Completada'
};

const estadoBadge = {
  pendiente: 'violet',
  aprobada: 'mint',
  rechazada: 'pink',
  completada: 'gray'
};

export default function MisCotizaciones() {
  const { usuario } = useAuth();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [expandida, setExpandida] = useState(null);

  // Depender de `usuario` volvería a recargar al fusionar los permisos: el objeto
  // cambia de referencia aunque el usuario sea el mismo.
  const idUsuario = usuario?.id_usuario;

  useEffect(() => {
    if (!idUsuario) return;
    async function cargar() {
      try {
        const datos = await obtenerCotizaciones();
        setCotizaciones(datos.filter((c) => c.id_usuario === idUsuario));
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [idUsuario]);

  function alternarExpandida(id) {
    setExpandida(expandida === id ? null : id);
  }

  if (cargando) {
    return (
      <div className="mis-cotizaciones" role="status" aria-live="polite">
        <div className="skeleton" style={{ height: '56px', width: '200px', marginBottom: 'var(--space-32)' }} />
        <div className="skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  return (
    <div className="mis-cotizaciones-page">
      <SiteHeader />
      <div className="mis-cotizaciones">
        <header className="mis-cotizaciones-header">
        <Link to="/" className="btn btn--ghost btn--sm">← Volver al catálogo</Link>
        <h1 className="mis-cotizaciones-title">Mis cotizaciones</h1>
      </header>

      {cotizaciones.length === 0 && (
        <div className="cotizaciones-empty">
          <span className="empty-icon" aria-hidden="true">▣</span>
          <h2 className="empty-title">Todavía no has enviado ninguna cotización.</h2>
          <p className="empty-subtitle">Ve al <Link to="/configurador">configurador</Link> o al <Link to="/">catálogo</Link> para armar una.</p>
        </div>
      )}

      <section className="mis-cotizaciones-list" aria-label="Mis cotizaciones">
        {cotizaciones.map((cot) => (
          <article key={cot.id_cotizacion} className="cotizacion-card">
            <header className="cotizacion-header" onClick={() => alternarExpandida(cot.id_cotizacion)}>
              <div className="cotizacion-main">
                <div className="cotizacion-moto">
                  {cot.moto?.modelo_moto?.marca_moto?.marca_nombre} {cot.moto?.modelo_moto?.modelo_nombre}
                </div>
                <div className="cotizacion-meta">
                  <span className="cotizacion-fecha">
                    {new Date(cot.fecha_solicitud).toLocaleDateString('es-CO')}
                  </span>
                </div>
              </div>
              <div className="cotizacion-side">
                <span className="cotizacion-total">{precioFormateado(cot.total)}</span>
                <span className={`badge badge--${estadoBadge[cot.coti_estado] || 'gray'}`}>
                  {estadoLabels[cot.coti_estado] || cot.coti_estado}
                </span>
              </div>
            </header>

            {expandida === cot.id_cotizacion && (
              <div className="cotizacion-detail">
                <ul className="cotizacion-items">
                  {cot.detalle_cotizacion?.map((item) => (
                    <li key={item.id_detalle_cotizacion}>
                      <span>{item.cantidad} × {item.accesorio?.acc_nombre}</span>
                      <span>{precioFormateado(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>

                {cot.coti_observaciones && (
                  <p className="cotizacion-observaciones">"{cot.coti_observaciones}"</p>
                )}
              </div>
            )}
          </article>
        ))}
      </section>
      </div>
    </div>
  );
}