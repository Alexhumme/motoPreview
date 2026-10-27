import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/authContexto';
import { obtenerCotizaciones, cambiarEstadoCotizacion } from '../services/cotizaciones';
import { ConPermiso } from '../components/menus/ConPermiso';
import './Cotizaciones.css';

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

export default function Cotizaciones() {
  const { usuario } = useAuth();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [expandida, setExpandida] = useState(null);
  const [actualizando, setActualizando] = useState(null);

  const idTienda = usuario.id_tienda;

  const cargar = useCallback(async () => {
    try {
      const datos = await obtenerCotizaciones(idTienda);
      setCotizaciones(datos);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, [idTienda]);

  useEffect(() => {
    async function refrescar() { await cargar(); }
    refrescar();
  }, [cargar]);

  function alternarExpandida(id) {
    setExpandida(expandida === id ? null : id);
  }

  async function manejarCambioEstado(id, nuevoEstado) {
    setActualizando(id);
    try {
      await cambiarEstadoCotizacion(id, nuevoEstado);
      await cargar();
    } catch {
      alert('No se pudo actualizar el estado');
    } finally {
      setActualizando(null);
    }
  }

  const precioFormateado = (valor) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

  if (cargando) {
    return (
      <div className="cotizaciones" role="status" aria-live="polite">
        <div className="skeleton" style={{ height: '56px', width: '200px', marginBottom: 'var(--space-32)' }} />
        <div className="skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  return (
    <div className="cotizaciones">
      <header className="cotizaciones-header">
        <h1 className="cotizaciones-title">Cotizaciones</h1>
      </header>

      <section className="cotizaciones-list" aria-label="Listado de cotizaciones">
        {cotizaciones.length === 0 ? (
          <div className="cotizaciones-empty">
            <span className="empty-icon" aria-hidden="true">▤</span>
            <p>No hay cotizaciones todavía.</p>
          </div>
        ) : (
          cotizaciones.map((cot) => (
            <article key={cot.id_cotizacion} className="cotizacion-card">
              <header className="cotizacion-header" onClick={() => alternarExpandida(cot.id_cotizacion)}>
                <div className="cotizacion-main">
                  <div className="cotizacion-moto">
                    {cot.moto?.modelo_moto?.marca_moto?.marca_nombre} {cot.moto?.modelo_moto?.modelo_nombre}
                  </div>
                  <div className="cotizacion-meta">
                    <span className="cotizacion-cliente">{cot.usuario?.usu_nombre} · {cot.usuario?.usu_email}</span>
                    <span className="cotizacion-fecha">
                      {new Date(cot.fecha_solicitud).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
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

                  <div className="cotizacion-actions">
                    {cot.coti_estado === 'pendiente' && (
                      <>
                        <ConPermiso recurso="cotizaciones" accion="actualizar" scope="tienda" fallback={null}>
                          <button
                            className="btn btn--danger btn--sm"
                            disabled={actualizando === cot.id_cotizacion}
                            onClick={() => manejarCambioEstado(cot.id_cotizacion, 'rechazada')}
                          >
                            Rechazar
                          </button>
                        </ConPermiso>
                        <ConPermiso recurso="cotizaciones" accion="actualizar" scope="tienda" fallback={null}>
                          <button
                            className="btn btn--primary btn--sm"
                            disabled={actualizando === cot.id_cotizacion}
                            onClick={() => manejarCambioEstado(cot.id_cotizacion, 'aprobada')}
                          >
                            Aprobar
                          </button>
                        </ConPermiso>
                      </>
                    )}

                    {cot.coti_estado === 'aprobada' && (
                      <ConPermiso recurso="cotizaciones" accion="actualizar" scope="tienda" fallback={null}>
                        <button
                          className="btn btn--outline btn--sm"
                          disabled={actualizando === cot.id_cotizacion}
                          onClick={() => manejarCambioEstado(cot.id_cotizacion, 'completada')}
                        >
                          Marcar como completada
                        </button>
                      </ConPermiso>
                    )}
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}