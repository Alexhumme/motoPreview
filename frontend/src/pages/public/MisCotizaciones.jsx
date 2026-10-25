import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { obtenerCotizaciones } from '../../services/cotizaciones';
import './MisCotizaciones.css';

export default function MisCotizaciones() {
  const { usuario } = useAuth();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [expandida, setExpandida] = useState(null);

  useEffect(() => {
    async function cargar() {
      try {
        const datos = await obtenerCotizaciones();
        setCotizaciones(datos.filter((c) => c.id_usuario === usuario.id_usuario));
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [usuario]);

  function alternarExpandida(id) {
    setExpandida(expandida === id ? null : id);
  }

  const precioFormateado = (valor) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

  if (cargando) return <p className="mis-cotizaciones__estado">Cargando tus cotizaciones...</p>;

  return (
    <div className="mis-cotizaciones">
      <Link to="/" className="mis-cotizaciones__volver">← Volver al catálogo</Link>
      <h1 className="mis-cotizaciones__titulo">Mis cotizaciones</h1>

      {cotizaciones.length === 0 && (
        <p className="mis-cotizaciones__vacio">
          Todavía no has enviado ninguna cotización. Ve al{' '}
          <Link to="/configurador">configurador</Link> o al{' '}
          <Link to="/">catálogo</Link> para armar una.
        </p>
      )}

      <div className="mis-cotizaciones__lista">
        {cotizaciones.map((cot) => (
          <div key={cot.id_cotizacion} className="mis-cotizaciones__tarjeta">
            <div className="mis-cotizaciones__resumen" onClick={() => alternarExpandida(cot.id_cotizacion)}>
              <div>
                <span className="mis-cotizaciones__moto">
                  {cot.moto?.modelo_moto?.marca_moto?.marca_nombre} {cot.moto?.modelo_moto?.modelo_nombre}
                </span>
                <span className="mis-cotizaciones__fecha">
                  {new Date(cot.fecha_solicitud).toLocaleDateString('es-CO')}
                </span>
              </div>
              <div className="mis-cotizaciones__derecha">
                <span className="mis-cotizaciones__total">{precioFormateado(cot.total)}</span>
                <span className={`mis-cotizaciones__estado-badge mis-cotizaciones__estado-badge--${cot.coti_estado}`}>
                  {cot.coti_estado}
                </span>
              </div>
            </div>

            {expandida === cot.id_cotizacion && (
              <div className="mis-cotizaciones__detalle">
                <ul className="mis-cotizaciones__items">
                  {cot.detalle_cotizacion.map((item) => (
                    <li key={item.id_detalle_cotizacion}>
                      {item.cantidad} × {item.accesorio?.acc_nombre} — {precioFormateado(item.subtotal)}
                    </li>
                  ))}
                </ul>
                {cot.coti_observaciones && (
                  <p className="mis-cotizaciones__observaciones">"{cot.coti_observaciones}"</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}