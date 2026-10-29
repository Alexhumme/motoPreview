import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../components/tables/DataTable';
import { obtenerTiendas } from '../services/tiendas';
import { mensajeError } from '../services/crud';
import './Tiendas.css';

const COLUMNAS = [
  { clave: 'nombre_tienda', etiqueta: 'Tienda' },
  {
    clave: 'estado_tienda',
    etiqueta: 'Estado',
    filtrable: true,
    render: (t) => <span className={`badge badge--${t.estado_tienda === 'activa' ? 'mint' : 'gray'}`}>{t.estado_tienda}</span>,
    valor: (t) => t.estado_tienda,
  },
  { clave: 'plan', etiqueta: 'Plan', valor: (t) => t.plan_subscripcion?.plan_nombre, render: (t) => t.plan_subscripcion?.plan_nombre || '—' },
  { clave: 'email_tienda', etiqueta: 'Contacto', valor: (t) => t.email_tienda || t.telefono_tienda },
  {
    clave: 'acciones',
    etiqueta: '',
    ordenable: false,
    render: (t) => (
      <Link className="btn btn--outline btn--sm" to={`/admin/tiendas/${t.id_tienda}`}>Ver resumen</Link>
    ),
    valor: () => '',
  },
];

/**
 * Inventario de tiendas (solo superadmin). El resumen de una tienda específica
 * se abre desde aquí, no desde el panel propio de cada tienda.
 */
export default function Tiendas() {
  const [tiendas, setTiendas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setTiendas(await obtenerTiendas());
      setError('');
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cargar la lista de tiendas.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    async function init() { await cargar(); }
    init();
  }, [cargar]);

  function reintentar() {
    setCargando(true);
    cargar();
  }

  return (
    <section className="tiendas">
      <header className="tiendas-header">
        <div>
          <h1 className="tiendas-title">Inventario de tiendas</h1>
          <p className="tiendas-help">Abre una tienda para ver su resumen del día.</p>
        </div>
      </header>
      <DataTable
        columnas={COLUMNAS}
        filas={tiendas}
        claveFila="id_tienda"
        cargando={cargando}
        error={error}
        onReintentar={reintentar}
        vacio="No hay tiendas registradas."
      />
    </section>
  );
}
