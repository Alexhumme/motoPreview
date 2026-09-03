import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { obtenerCotizaciones, cambiarEstadoCotizacion } from '../../services/cotizaciones';
import './Cotizaciones.css';

export default function Cotizaciones() {
  const { usuario } = useAuth();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [expandida, setExpandida] = useState(null);
  const [actualizando, setActualizando] = useState(null);

async function cargar() {
  setCargando(true);
  try {
    const datos = await obtenerCotizaciones();
    setCotizaciones(datos.filter((c) => c.id_tienda === usuario.id_tienda));
  } catch (err) {
    console.error(err);
  } finally {
    setCargando(false);
  }
}

  useEffect(() => {
    cargar();
  }, [usuario]);

  function alternarExpandida(id) {
    setExpandida(expandida === id ? null : id);
  }

  async function manejarCambioEstado(id, nuevoEstado) {
    setActualizando(id);
    try {
      await cambiarEstadoCotizacion(id, nuevoEstado);
      await cargar();
    } catch (err) {
      alert('No se pudo actualizar el estado');
    } finally {
      setActualizando(null);
    }
  }

  const precioFormateado = (valor) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

  if (cargando) return <p>Cargando cotizaciones...</p>;

  return (
    <div>
      <h1 className="cotizaciones__titulo">Cotizaciones</h1>

      <div className="cotizaciones__lista">
        {cotizaciones.length === 0 && <p>No hay cotizaciones todavía.</p>}

        {cotizaciones.map((cot) => (
          <div key={cot.id_cotizacion} className="cotizaciones__tarjeta">
            <div className="cotizaciones__resumen" onClick={() => alternarExpandida(cot.id_cotizacion)}>
              <div>
                <span className="cotizaciones__moto">
                  {cot.moto?.modelo_moto?.marca_moto?.marca_nombre} {cot.moto?.modelo_moto?.modelo_nombre}
                </span>
                <span className="cotizaciones__fecha">
                  {new Date(cot.fecha_solicitud).toLocaleDateString('es-CO')}
                </span>
              </div>
              <div className="cotizaciones__derecha">
                <span className="cotizaciones__total">{precioFormateado(cot.total)}</span>
                <span className={`cotizaciones__estado cotizaciones__estado--${cot.coti_estado}`}>
                  {cot.coti_estado}
                </span>
              </div>
            </div>

            {expandida === cot.id_cotizacion && (
              <div className="cotizaciones__detalle">
                <ul className="cotizaciones__items">
                  {cot.detalle_cotizacion.map((item) => (
                    <li key={item.id_detalle_cotizacion}>
                      {item.cantidad} × {item.accesorio?.acc_nombre} — {precioFormateado(item.subtotal)}
                    </li>
                  ))}
                </ul>
                {cot.coti_observaciones && (
                  <p className="cotizaciones__observaciones">"{cot.coti_observaciones}"</p>
                )}

                {cot.coti_estado === 'pendiente' && (
                  <div className="cotizaciones__acciones">
                    <button
                      disabled={actualizando === cot.id_cotizacion}
                      className="cotizaciones__boton cotizaciones__boton--rechazar"
                      onClick={() => manejarCambioEstado(cot.id_cotizacion, 'rechazada')}
                    >
                      Rechazar
                    </button>
                    <button
                      disabled={actualizando === cot.id_cotizacion}
                      className="cotizaciones__boton cotizaciones__boton--aprobar"
                      onClick={() => manejarCambioEstado(cot.id_cotizacion, 'aprobada')}
                    >
                      Aprobar
                    </button>
                  </div>
                )}

                {cot.coti_estado === 'aprobada' && (
                  <div className="cotizaciones__acciones">
                    <button
                      disabled={actualizando === cot.id_cotizacion}
                      className="cotizaciones__boton cotizaciones__boton--aprobar"
                      onClick={() => manejarCambioEstado(cot.id_cotizacion, 'completada')}
                    >
                      Marcar como completada
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}