import { useEffect, useMemo, useState } from 'react';
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
        const [datosInventario, datosCotizaciones] = await Promise.all([obtenerInventario(), obtenerCotizaciones()]);
        setInventario(datosInventario.filter((item) => item.id_tienda === usuario.id_tienda));
        setCotizaciones(datosCotizaciones.filter((item) => item.id_tienda === usuario.id_tienda));
      } catch {
        setInventario([]);
        setCotizaciones([]);
      } finally {
        setCargando(false);
      }
    }
    if (usuario?.id_tienda) cargar();
  }, [usuario]);

  const stockBajo = inventario.filter((item) => item.estado_inventario === 'bajo' || item.estado_inventario === 'agotado');
  const pendientes = cotizaciones.filter((item) => item.coti_estado === 'pendiente').length;
  const aprobadas = cotizaciones.filter((item) => item.coti_estado === 'aprobada').length;
  const agotados = inventario.filter((item) => item.estado_inventario === 'agotado').length;
  const maxStatus = Math.max(cotizaciones.length, 1);
  const nombre = usuario?.usu_nombre?.split(' ')[0] || 'administrador';
  const actividad = useMemo(() => cotizaciones.slice(0, 4), [cotizaciones]);

  if (cargando) return <div className="admin-card">Cargando resumen...</div>;

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__topbar"><div><span className="admin-breadcrumb">Panel / Resumen</span><h1 className="admin-dashboard__title">Buenos días, {nombre}.</h1></div></div>
      <div className="admin-alert"><span>✦</span><span><strong>Tu tienda está funcionando bien.</strong> Hay {pendientes} cotizaciones pendientes por revisar.</span></div>
      <div className="admin-kpis">
        <div className="admin-kpi"><span className="admin-kpi__icon">▣</span><small>Productos en inventario</small><strong>{inventario.length}</strong><em>Registros activos</em></div>
        <div className="admin-kpi admin-kpi--alert"><span className="admin-kpi__icon">!</span><small>Stock bajo o agotado</small><strong>{stockBajo.length}</strong><em>Requieren atención</em></div>
        <div className="admin-kpi"><span className="admin-kpi__icon">▤</span><small>Cotizaciones pendientes</small><strong>{pendientes}</strong><em>{cotizaciones.length} solicitudes totales</em></div>
      </div>
      <div className="admin-dashboard__grid">
        <section className="admin-card"><div className="admin-card__head"><span><small>Rendimiento</small><strong>Estado de la operación</strong></span></div><div className="status-bars"><div><div className="status-bar__label"><span>Inventario normal</span><b>{Math.max(inventario.length - stockBajo.length, 0)}</b></div><div className="status-bar__track"><div className="status-bar__value" style={{ width: `${Math.round(((inventario.length - stockBajo.length) / Math.max(inventario.length, 1)) * 100)}%` }} /></div></div><div><div className="status-bar__label"><span>Cotizaciones aprobadas</span><b>{aprobadas}</b></div><div className="status-bar__track"><div className="status-bar__value status-bar__value--green" style={{ width: `${(aprobadas / maxStatus) * 100}%` }} /></div></div><div><div className="status-bar__label"><span>Agotados</span><b>{agotados}</b></div><div className="status-bar__track"><div className="status-bar__value status-bar__value--gray" style={{ width: `${(agotados / Math.max(inventario.length, 1)) * 100}%` }} /></div></div></div></section>
        <section className="admin-card"><div className="admin-card__head"><span><small>Actividad reciente</small><strong>Últimas cotizaciones</strong></span></div>{actividad.length ? actividad.map((item) => <div className="activity-row" key={item.id_cotizacion}><span className="activity-avatar">MP</span><span><strong>Solicitud {item.coti_estado}</strong><small>{item.coti_fecha ? new Date(item.coti_fecha).toLocaleDateString('es-CO') : 'Sin fecha'}</small></span></div>) : <p className="activity-row">Todavía no hay actividad reciente.</p>}</section>
      </div>
      {stockBajo.length > 0 && <section className="admin-card admin-dashboard__stock"><div className="admin-card__head"><span><small>Atención requerida</small><strong>Necesitan reabastecimiento</strong></span></div>{stockBajo.slice(0, 5).map((item) => <div className="activity-row" key={item.id_inventario}><span className="activity-avatar">!</span><span><strong>{item.accesorio?.acc_nombre || 'Producto'}</strong><small>Quedan {item.stock_actual}; mínimo {item.stock_minimo}</small></span></div>)}</section>}
    </div>
  );
}