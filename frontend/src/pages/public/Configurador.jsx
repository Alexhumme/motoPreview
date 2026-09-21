import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerMotos } from '../../services/motos';
import { obtenerAccesoriosCompatibles } from '../../services/compatibilidad';
import { obtenerCategorias } from '../../services/accesorios';
import { useCart } from '../../context/CartContext';
import SiteHeader from '../../components/SiteHeader';
import './Configurador.css';

const money = (value) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
}).format(value);

export default function Configurador() {
  const { items, agregarItem, eliminarItem, vaciarCarrito, totalItems, totalPrecio } = useCart();
  const [motos, setMotos] = useState([]);
  const [idMotoSeleccionada, setIdMotoSeleccionada] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [accesoriosCompatibles, setAccesoriosCompatibles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoAccesorios, setCargandoAccesorios] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarInicial() {
      try {
        const [datosMotos, datosCategorias] = await Promise.all([obtenerMotos(), obtenerCategorias()]);
        setMotos(datosMotos);
        setCategorias(datosCategorias);
        if (datosMotos.length) setIdMotoSeleccionada(datosMotos[0].id_moto);
      } catch {
        setError('No se pudieron cargar las opciones del configurador.');
      } finally {
        setCargando(false);
      }
    }
    cargarInicial();
  }, []);

  useEffect(() => {
    const moto = motos.find((entry) => entry.id_moto === idMotoSeleccionada);
    const modeloId = moto?.id_modelo_moto || moto?.modelo_moto?.id_modelo_moto;
    if (!modeloId) return;
    async function cargarCompatibles() {
      setCargandoAccesorios(true);
      try {
        setAccesoriosCompatibles(await obtenerAccesoriosCompatibles(modeloId));
      } catch {
        setAccesoriosCompatibles([]);
      } finally {
        setCargandoAccesorios(false);
      }
    }
    cargarCompatibles();
  }, [idMotoSeleccionada, motos]);

  const motoActual = motos.find((moto) => moto.id_moto === idMotoSeleccionada);
  const accesoriosFiltrados = useMemo(
    () => categoriaActiva === 'todas'
      ? accesoriosCompatibles
      : accesoriosCompatibles.filter((item) => item.id_categoria === categoriaActiva),
    [accesoriosCompatibles, categoriaActiva]
  );
  const motoNombre = motoActual
    ? `${motoActual.modelo_moto?.marca_moto?.marca_nombre || ''} ${motoActual.modelo_moto?.modelo_nombre || ''}`.trim()
    : 'Selecciona una motocicleta';

  if (cargando) return <div className="configurador__estado">Preparando tu estudio de compatibilidad...</div>;

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="configurator-page">
        <div className="configurator-top">
          <div><div className="eyebrow"><span className="eyebrow-dot" /> Estudio de compatibilidad</div><h1>Diseña tu configuración.</h1><p>Selecciona tu moto y encuentra accesorios que encajan sin complicaciones.</p></div>
          <Link to="/carrito" className="button button--outline">Ver carrito <span className="button-count">{totalItems}</span></Link>
        </div>
        {error && <p className="configurator-error">{error}</p>}

        <div className="configurator-layout">
          <section className="bike-preview-panel">
            <div className="panel-topline"><span>Tu motocicleta</span><span className="live-status"><i /> Live preview</span></div>
            <label className="select-label">Modelo seleccionado</label>
            <div className="select-wrap">
              <select value={idMotoSeleccionada} onChange={(e) => setIdMotoSeleccionada(e.target.value)}>
                {motos.map((moto) => <option key={moto.id_moto} value={moto.id_moto}>{moto.modelo_moto?.marca_moto?.marca_nombre} {moto.modelo_moto?.modelo_nombre} · {moto.moto_anio}</option>)}
              </select>
              <span>⌄</span>
            </div>
            <div className="bike-stage">
              <div className="stage-grid" />
              <span className="stage-tag">{motoActual?.moto_version || 'Compatible'}</span>
              {motoActual?.moto_imagen ? <img src={motoActual.moto_imagen} alt={motoNombre} /> : <div className="bike-stage__mark">MP</div>}
              <div className="bike-stage__name"><strong>{motoNombre}</strong><span>{motoActual?.modelo_moto?.cilindraje || '—'} · {motoActual?.moto_anio || '—'}</span></div>
            </div>
            <div className="preview-details"><div><small>Modelo</small><strong>{motoActual?.modelo_moto?.modelo_nombre || '—'}</strong></div><div><small>Cilindraje</small><strong>{motoActual?.modelo_moto?.cilindraje || '—'}</strong></div><div><small>Estado</small><strong className="status-good">✓ Compatible</strong></div></div>
          </section>

          <section className="compatible-panel">
            <div className="panel-topline"><span>Accesorios compatibles</span><span className="result-count">{accesoriosFiltrados.length} resultados</span></div>
            <div className="filter-scroll">
              <button className={categoriaActiva === 'todas' ? 'filter-chip filter-chip--active' : 'filter-chip'} onClick={() => setCategoriaActiva('todas')}>Todos</button>
              {categorias.map((categoria) => <button key={categoria.id_categoria} className={categoriaActiva === categoria.id_categoria ? 'filter-chip filter-chip--active' : 'filter-chip'} onClick={() => setCategoriaActiva(categoria.id_categoria)}>{categoria.cat_nombre}</button>)}
            </div>
            <div className="compatible-list">
              {cargandoAccesorios && <p className="list-state">Buscando piezas compatibles...</p>}
              {!cargandoAccesorios && accesoriosFiltrados.length === 0 && <p className="list-state">No hay accesorios compatibles en esta categoría.</p>}
              {!cargandoAccesorios && accesoriosFiltrados.map((item) => {
                const agregado = items.some((line) => line.accesorio.id_accesorio === item.id_accesorio);
                return (
                  <div className="compatible-item" key={item.id_accesorio}>
                    <div className="mini-art">{item.imagen ? <img src={item.imagen} alt="" /> : <span>MP</span>}</div>
                    <div className="compatible-info"><strong>{item.acc_nombre}</strong><span>{item.categoria_accesorio?.cat_nombre} · {money(item.acc_precio)}</span><small>✓ Compatible con {motoActual?.modelo_moto?.modelo_nombre || 'tu moto'}</small></div>
                    <button className={agregado ? 'add-control add-control--added' : 'add-control'} onClick={() => agregarItem(item)}>{agregado ? '✓' : '+'}</button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="configuration-bar">
          <div className="configuration-items"><div className="configuration-title"><span>⚙</span><span><strong>Tu configuración</strong><small>{totalItems ? `${totalItems} accesorios seleccionados` : 'Aún no has agregado accesorios'}</small></span></div>{items.slice(0, 3).map((line) => <div className="configuration-pill" key={line.accesorio.id_accesorio}><span>{line.accesorio.acc_nombre}</span><button onClick={() => eliminarItem(line.accesorio.id_accesorio)}>×</button></div>)}{items.length > 3 && <span className="more-pill">+{items.length - 3} más</span>}</div>
          <div className="configuration-total"><span><small>Total estimado</small><strong>{money(totalPrecio)}</strong></span>{items.length ? <button className="button button--accent" onClick={vaciarCarrito}>Limpiar ×</button> : <Link to="/" className="button button--dark">Explorar piezas →</Link>}</div>
        </section>
      </main>
    </div>
  );
}