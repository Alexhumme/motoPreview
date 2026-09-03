import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { obtenerInventario } from '../../services/inventario';
import { obtenerCotizaciones } from '../../services/cotizaciones';
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
        obtenerInventario(),
        obtenerCotizaciones(),
      ]);
      setInventario(datosInventario.filter((i) => i.id_tienda === usuario.id_tienda));
      setCotizaciones(datosCotizaciones.filter((c) => c.id_tienda === usuario.id_tienda));
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }
  cargar();
}, [usuario]);

  if (cargando) return <p>Cargando resumen...</p>;

  const stockBajo = inventario.filter((i) => i.estado_inventario === 'bajo' || i.estado_inventario === 'agotado');
  const cotizacionesPendientes = cotizaciones.filter((c) => c.coti_estado === 'pendiente');

  return (
    <div>
      <h1 className="dashboard__titulo">Resumen de {usuario.usu_nombre.split(' ')[0]}</h1>
      <div className="dashboard__tarjetas">
        <div className="dashboard__tarjeta">
          <span className="dashboard__numero">{inventario.length}</span>
          <span className="dashboard__etiqueta">Productos en inventario</span>
        </div>
        <div className="dashboard__tarjeta dashboard__tarjeta--alerta">
          <span className="dashboard__numero">{stockBajo.length}</span>
          <span className="dashboard__etiqueta">Con stock bajo o agotado</span>
        </div>
        <div className="dashboard__tarjeta">
          <span className="dashboard__numero">{cotizacionesPendientes.length}</span>
          <span className="dashboard__etiqueta">Cotizaciones pendientes</span>
        </div>
      </div>

      {stockBajo.length > 0 && (
        <div className="dashboard__seccion">
          <h2>Necesitan reabastecimiento</h2>
          <ul className="dashboard__lista">
            {stockBajo.map((item) => (
              <li key={item.id_inventario}>
                {item.accesorio?.acc_nombre} — quedan {item.stock_actual} (mínimo {item.stock_minimo})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}