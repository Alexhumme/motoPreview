import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Package,
  Percent,
  Store,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/authContexto';
import { mensajeError } from '../services/crud';
import { obtenerResumenPanel } from '../services/reportes';
import { ROL_ADMIN, ROL_CLIENTE, ROL_SUPERADMIN, ROL_VENDEDOR } from '../utils/constants/roles';
import DataTable from '../components/tables/DataTable';
import SiteHeader from '../components/buttons/SiteHeader';
import './Dashboard.css';

const formatoCOP = (valor) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0);

const ESTADOS = [
  { clave: 'pendiente', etiqueta: 'Pendientes', color: 'violet' },
  { clave: 'aprobada', etiqueta: 'Aprobadas', color: 'mint' },
  { clave: 'rechazada', etiqueta: 'Rechazadas', color: 'pink' },
  { clave: 'completada', etiqueta: 'Completadas', color: 'gray' },
];

export default function Dashboard() {
  const { usuario } = useAuth();
  const location = useLocation();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const peticionRef = useRef(0);

  const rol = usuario?.id_rol;
  const consolidado = rol === ROL_SUPERADMIN;
  const cliente = rol === ROL_CLIENTE;
  const vendedor = rol === ROL_VENDEDOR;
  const portal = location.pathname === '/resumen';
  const idUsuario = usuario?.id_usuario;

  const cargar = useCallback(async () => {
    if (!idUsuario) return;
    const peticion = ++peticionRef.current;
    setCargando(true);
    setError('');
    try {
      const respuesta = await obtenerResumenPanel({ comparar: consolidado });
      if (peticionRef.current === peticion) setDatos(respuesta);
    } catch (err) {
      if (peticionRef.current === peticion) {
        setError(mensajeError(err, 'No se pudo cargar tu resumen.'));
      }
    } finally {
      if (peticionRef.current === peticion) setCargando(false);
    }
  }, [consolidado, idUsuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombre = usuario?.usu_nombre?.split(' ')[0] || 'usuario';
  let contenido;

  if (cargando) {
    contenido = <CargandoResumen />;
  } else if (error) {
    contenido = <ErrorResumen mensaje={error} onReintentar={cargar} />;
  } else if (!datos) {
    contenido = <ErrorResumen mensaje="No hay información disponible para tu cuenta." onReintentar={cargar} />;
  } else if (consolidado) {
    contenido = <PanelGlobal datos={datos} nombre={nombre} />;
  } else if (cliente) {
    contenido = <PanelCliente datos={datos} nombre={nombre} />;
  } else if (vendedor) {
    contenido = <PanelVendedor datos={datos} nombre={nombre} />;
  } else if (rol === ROL_ADMIN) {
    contenido = <PanelAdmin datos={datos} nombre={nombre} />;
  } else {
    contenido = <PanelPermisos datos={datos} nombre={nombre} />;
  }

  if (portal) {
    return (
      <div className="portal-resumen">
        <SiteHeader />
        <main className="portal-resumen__main">{contenido}</main>
      </div>
    );
  }
  return contenido;
}

function Encabezado({ nombre, descripcion, acciones }) {
  return (
    <header className="dashboard-header">
      <span className="eyebrow"><span className="eyebrow-dot" aria-hidden="true" />Portal / Resumen</span>
      <h1 className="dashboard-title">Hola, {nombre}.</h1>
      <p className="dashboard-help">{descripcion}</p>
      {acciones && <div className="dashboard-actions">{acciones}</div>}
    </header>
  );
}

function Kpi({ icono: Icono, etiqueta, valor, detalle, alerta = false }) {
  return (
    <article className={`kpi${alerta ? ' kpi--alert' : ''}`}>
      <span className="kpi-icon" aria-hidden="true"><Icono size={22} strokeWidth={1.8} /></span>
      <div className="kpi-content">
        <small>{etiqueta}</small>
        <strong>{valor}</strong>
        <em>{detalle}</em>
      </div>
    </article>
  );
}

function PanelGlobal({ datos, nombre }) {
  const actual = datos.actual;
  const tiendas = datos.tiendas || [];
  if (!actual) return <SinAcceso nombre={nombre} />;

  return (
    <div className="dashboard">
      <Encabezado
        nombre={nombre}
        descripcion="Compara la operación de todas las tiendas y detecta dónde hace falta atención."
        acciones={(
          <>
            <Link className="btn btn--outline btn--sm" to="/admin/tiendas">Gestionar tiendas</Link>
          </>
        )}
      />
      <section className="dashboard-kpis dashboard-kpis--4" aria-label="Indicadores globales">
        <Kpi icono={ArrowUpRight} etiqueta="Ventas de hoy" valor={formatoCOP(actual.ventas_hoy.total)} detalle={`${actual.ventas_hoy.cantidad} completadas`} />
        <Kpi icono={CircleDollarSign} etiqueta="Por cobrar" valor={formatoCOP(actual.por_cobrar.total)} detalle={`${actual.por_cobrar.cantidad} cotizaciones aprobadas`} />
        <Kpi icono={ClipboardList} etiqueta="Pendientes" valor={actual.pedidos_pendientes.cantidad} detalle="En todas las tiendas" alerta={actual.pedidos_pendientes.cantidad > 0} />
        <Kpi icono={Store} etiqueta="Tiendas activas" valor={tiendas.length} detalle="Activas en el sistema" />
      </section>
      <section className="card dashboard-card" aria-label="Comparación por tienda">
        <header className="card-head">
          <span><small>Comparación</small><strong>Actividad por tienda</strong></span>
        </header>
        <DataTable
          columnas={[
            { clave: 'nombre', etiqueta: 'Tienda', render: (tienda) => <strong>{tienda.nombre}</strong> },
            { clave: 'cotizaciones', etiqueta: 'Cotizaciones', valor: (tienda) => tienda.cotizaciones.cantidad },
            { clave: 'ventas', etiqueta: 'Ventas completadas', valor: (tienda) => tienda.ventas_completadas.total, render: (tienda) => formatoCOP(tienda.ventas_completadas.total) },
          ]}
          filas={tiendas}
          claveFila="id_tienda"
          vacio="No hay tiendas activas para comparar."
          acciones={(tienda) => (
            <Link className="btn btn--outline btn--sm" to={`/admin/tiendas/${tienda.id_tienda}`}>Ver resumen</Link>
          )}
        />
      </section>
    </div>
  );
}

function PanelAdmin({ datos, nombre }) {
  const actual = datos.actual;
  const inventario = datos.inventario;
  if (!actual && !inventario) return <SinAcceso nombre={nombre} />;

  return (
    <div className="dashboard">
      <Encabezado
        nombre={nombre}
        descripcion="Sigue las ventas, la cartera y el inventario de tu tienda."
      />
      {actual && (
        <section className="dashboard-kpis dashboard-kpis--4" aria-label="Indicadores de la tienda">
          <Kpi icono={ArrowUpRight} etiqueta="Ventas de hoy" valor={formatoCOP(actual.ventas_hoy.total)} detalle={`${actual.ventas_hoy.cantidad} completadas`} />
          <Kpi icono={CircleDollarSign} etiqueta="Por cobrar" valor={formatoCOP(actual.por_cobrar.total)} detalle={`${actual.por_cobrar.cantidad} aprobadas`} />
          <Kpi icono={ClipboardList} etiqueta="Pendientes" valor={actual.pedidos_pendientes.cantidad} detalle="Cotizaciones por revisar" alerta={actual.pedidos_pendientes.cantidad > 0} />
          <Kpi icono={Package} etiqueta="Inventario" valor={inventario?.total ?? '—'} detalle={inventario ? `${inventario.bajo + inventario.agotado} requieren atención` : 'Sin permiso de inventario'} />
        </section>
      )}
      <section className="dashboard-grid" aria-label="Detalle de la tienda">
        {actual && <PanelEstados datos={datos} titulo="Estado de las cotizaciones" />}
        {inventario && <PanelInventario inventario={inventario} />}
      </section>
    </div>
  );
}

function PanelVendedor({ datos, nombre }) {
  const actual = datos.actual;
  if (!actual) return <SinAcceso nombre={nombre} />;
  const aprobadas = datos.estados.aprobada?.cantidad || 0;
  const totalRango = ESTADOS.reduce((suma, estado) => suma + (datos.estados[estado.clave]?.cantidad || 0), 0);
  const tasa = totalRango ? Math.round((aprobadas / totalRango) * 100) : 0;

  return (
    <div className="dashboard">
      <Encabezado
        nombre={nombre}
        descripcion="Prioriza las solicitudes pendientes y da seguimiento a las cotizaciones aprobadas."
        acciones={(
          <>
            <Link className="btn btn--primary btn--sm" to="/admin/cotizaciones">Revisar cotizaciones</Link>
          </>
        )}
      />
      <section className="dashboard-kpis dashboard-kpis--4" aria-label="Indicadores del vendedor">
        <Kpi icono={ClipboardList} etiqueta="Por revisar" valor={actual.pedidos_pendientes.cantidad} detalle="Tu cola de trabajo" alerta={actual.pedidos_pendientes.cantidad > 0} />
        <Kpi icono={Check} etiqueta="Aprobadas" valor={aprobadas} detalle="En el período" />
        <Kpi icono={ArrowUpRight} etiqueta="Ventas de hoy" valor={formatoCOP(actual.ventas_hoy.total)} detalle={`${actual.ventas_hoy.cantidad} completadas`} />
        <Kpi icono={Percent} etiqueta="Aprobación" valor={`${tasa}%`} detalle="Sobre el período" />
      </section>
      <section className="dashboard-grid" aria-label="Seguimiento comercial">
        <PanelEstados datos={datos} titulo="Tu embudo de cotizaciones" />
        <article className="card dashboard-card">
          <header className="card-head"><span><small>Siguiente paso</small><strong>Convierte las aprobadas</strong></span></header>
          <div className="dashboard-callout">
            <strong>{actual.por_cobrar.cantidad} cotización{actual.por_cobrar.cantidad === 1 ? '' : 'es'} por cobrar</strong>
            <p>El total aprobado pendiente de completar es {formatoCOP(actual.por_cobrar.total)}.</p>
            <Link className="btn btn--outline btn--sm" to="/admin/cotizaciones">Abrir seguimiento</Link>
          </div>
        </article>
      </section>
    </div>
  );
}

function PanelCliente({ datos, nombre }) {
  const actual = datos.actual;
  if (!actual) return <SinAcceso nombre={nombre} />;

  return (
    <div className="dashboard">
      <Encabezado
        nombre={nombre}
        descripcion="Consulta el avance de tus cotizaciones y tus compras completadas."
        acciones={(
          <>
            <Link className="btn btn--primary btn--sm" to="/configurador">Crear cotización</Link>
          </>
        )}
      />
      <section className="dashboard-kpis dashboard-kpis--4" aria-label="Indicadores personales">
        <Kpi icono={ClipboardList} etiqueta="Mis cotizaciones" valor={actual.cotizaciones.cantidad} detalle="Solicitudes enviadas" />
        <Kpi icono={Clock3} etiqueta="Pendientes" valor={actual.pedidos_pendientes.cantidad} detalle="Esperando revisión" alerta={actual.pedidos_pendientes.cantidad > 0} />
        <Kpi icono={Check} etiqueta="Completadas" valor={actual.ventas_completadas.cantidad} detalle="Cotizaciones finalizadas" />
        <Kpi icono={ArrowUpRight} etiqueta="Total completado" valor={formatoCOP(actual.ventas_completadas.total)} detalle="Compras finalizadas" />
      </section>
      <section className="dashboard-grid" aria-label="Detalle personal">
        <PanelEstados datos={datos} titulo="Estado de mis solicitudes" />
        <article className="card dashboard-card">
          <header className="card-head"><span><small>Tus cotizaciones</small><strong>Revisa cada detalle</strong></span></header>
          <div className="dashboard-callout">
            <strong>{actual.cotizaciones.cantidad} solicitud{actual.cotizaciones.cantidad === 1 ? '' : 'es'} en total</strong>
            <p>Encontrarás el desglose de accesorios, observaciones y estado de cada una.</p>
            <Link className="btn btn--outline btn--sm" to="/mis-cotizaciones">Ver mis cotizaciones</Link>
          </div>
        </article>
      </section>
    </div>
  );
}

function PanelPermisos({ datos, nombre }) {
  const inventario = datos.inventario;
  if (!inventario) return <SinAcceso nombre={nombre} />;
  return (
    <div className="dashboard">
      <Encabezado nombre={nombre} descripcion="Estos son los datos que tu cuenta tiene permiso para consultar." />
      <section className="dashboard-kpis" aria-label="Inventario disponible">
        <Kpi icono={Package} etiqueta="Inventario" valor={inventario.total} detalle="Productos registrados" />
        <Kpi icono={AlertTriangle} etiqueta="Stock bajo" valor={inventario.bajo} detalle="Requieren reposición" alerta={inventario.bajo > 0} />
        <Kpi icono={XCircle} etiqueta="Agotados" valor={inventario.agotado} detalle="Sin unidades disponibles" alerta={inventario.agotado > 0} />
      </section>
      <PanelInventario inventario={inventario} />
    </div>
  );
}

function PanelEstados({ datos, titulo }) {
  const total = ESTADOS.reduce((suma, estado) => suma + (datos.estados[estado.clave]?.cantidad || 0), 0);
  return (
    <article className="card dashboard-card">
      <header className="card-head"><span><small>Período</small><strong>{titulo}</strong></span></header>
      <div className="status-bars">
        {ESTADOS.map((estado) => (
          <StatusBar
            key={estado.clave}
            label={estado.etiqueta}
            value={datos.estados[estado.clave]?.cantidad || 0}
            max={total}
            color={estado.color}
          />
        ))}
      </div>
    </article>
  );
}

function PanelInventario({ inventario }) {
  return (
    <article className="card dashboard-card">
      <header className="card-head"><span><small>Atención requerida</small><strong>Stock bajo o agotado</strong></span></header>
      <div className="activity-list">
        {inventario.alertas.length ? inventario.alertas.map((item) => (
          <div key={item.id_inventario} className="activity-row activity-row--alert">
            <span className="activity-avatar activity-avatar--alert" aria-hidden="true">
              <AlertTriangle size={18} strokeWidth={1.8} />
            </span>
            <div className="activity-info">
              <strong>{item.producto__nombre || 'Producto'}</strong>
              <small>Quedan {item.stock_actual}; mínimo {item.stock_minimo}</small>
            </div>
          </div>
        )) : <p className="activity-row activity-row--empty">No hay productos con stock bajo.</p>}
      </div>
    </article>
  );
}

function SinAcceso({ nombre }) {
  return (
    <div className="dashboard">
      <Encabezado nombre={nombre} descripcion="Tu cuenta aún no tiene permisos sobre los datos de este resumen." />
      <section className="card dashboard-card dashboard-empty" role="status">
        <strong>No hay secciones disponibles</strong>
        <p>Pide a un administrador que revise los permisos de cotizaciones o inventario de tu cuenta.</p>
      </section>
    </div>
  );
}

function CargandoResumen() {
  return (
    <div className="dashboard" role="status" aria-live="polite">
      <div className="skeleton" style={{ height: '56px', width: '300px', marginBottom: 'var(--space-24)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-20)' }}>
        {[0, 1, 2, 3].map((item) => <div key={item} className="skeleton" style={{ height: '120px' }} />)}
      </div>
      <div className="skeleton" style={{ height: '260px' }} />
    </div>
  );
}

function ErrorResumen({ mensaje, onReintentar }) {
  return (
    <div className="dashboard" role="alert">
      <section className="card dashboard-card dashboard-empty">
        <strong>No se pudo abrir el resumen</strong>
        <p>{mensaje}</p>
        <button type="button" className="btn btn--primary btn--sm" onClick={onReintentar}>Reintentar</button>
      </section>
    </div>
  );
}

function StatusBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const colorClass = {
    mint: 'status-bar__value--mint',
    violet: 'status-bar__value--violet',
    pink: 'status-bar__value--pink',
    gray: 'status-bar__value--gray',
  }[color] || '';
  return (
    <div className="status-bar">
      <div className="status-bar__label"><span>{label}</span><b>{value}</b></div>
      <div className="status-bar__track"><div className={`status-bar__value ${colorClass}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
