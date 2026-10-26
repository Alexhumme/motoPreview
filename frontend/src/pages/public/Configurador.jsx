import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerMotos } from '../../services/motos';
import { obtenerAccesoriosCompatibles } from '../../services/compatibilidad';
import { obtenerCategorias } from '../../services/accesorios';
import { useCart } from '../../context/CartContext';
import SiteHeader from '../../components/buttons/SiteHeader';
import ImagenProducto from '../../components/ImagenProducto';
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

  if (cargando) {
    return (
      <div className="configurador-page">
        <SiteHeader />
        <main className="configurator-main">
          <div className="cargando-estado">
            <div className="skeleton" style={{ height: '56px', width: '280px', marginBottom: 'var(--space-32)' }} />
            <div className="skeleton" style={{ height: '600px' }} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="configurador-page">
      <SiteHeader />
      <main className="configurator-main">
        <header className="configurator-header">
          <div className="configurator-copy">
            <div className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span>Estudio de compatibilidad</div>
            <h1 className="configurator-title">Diseña tu configuración.</h1>
            <p className="configurator-subtitle">Selecciona tu moto y encuentra accesorios que encajan sin complicaciones.</p>
          </div>
          <Link to="/carrito" className="btn btn--outline">
            Ver carrito <span className="btn-count">{totalItems}</span>
          </Link>
        </header>

        {error && <p className="configurator-error" role="alert">{error}</p>}

        <div className="configurator-layout">
          {/* Bike preview panel */}
          <section className="bike-preview-panel card">
            <div className="panel-topline">
              <span>Tu motocicleta</span>
              <span className="live-status"><span className="live-dot" aria-hidden="true"></span> Live preview</span>
            </div>
            <label className="select-label">Modelo seleccionado</label>
            <div className="select-wrap">
              <select value={idMotoSeleccionada} onChange={(e) => setIdMotoSeleccionada(e.target.value)}>
                {motos.map((moto) => (
                  <option key={moto.id_moto} value={moto.id_moto}>
                    {moto.modelo_moto?.marca_moto?.marca_nombre} {moto.modelo_moto?.modelo_nombre} · {moto.moto_anio}
                  </option>
                ))}
              </select>
              <span className="select-arrow">⌄</span>
            </div>
            <div className="bike-stage">
              <div className="stage-grid" />
              <span className="stage-tag">{motoActual?.moto_version || 'Compatible'}</span>
              <ImagenProducto src={motoActual?.moto_imagen} alt={motoNombre} className="bike-stage-img" />
              <div className="bike-stage-name">
                <strong>{motoNombre}</strong>
                <span>{motoActual?.modelo_moto?.cilindraje || '—'} · {motoActual?.moto_anio || '—'}</span>
              </div>
            </div>
            <div className="preview-details">
              <div>
                <small>Modelo</small>
                <strong>{motoActual?.modelo_moto?.modelo_nombre || '—'}</strong>
              </div>
              <div>
                <small>Cilindraje</small>
                <strong>{motoActual?.modelo_moto?.cilindraje || '—'}</strong>
              </div>
              <div>
                <small>Estado</small>
                <strong className="status-good">✓ Compatible</strong>
              </div>
            </div>
          </section>

          {/* Compatible accessories panel */}
          <section className="compatible-panel card">
            <div className="panel-topline">
              <span>Accesorios compatibles</span>
              <span className="result-count">{accesoriosFiltrados.length} resultados</span>
            </div>

            <div className="filter-scroll">
              <button className={`filter-chip${categoriaActiva === 'todas' ? ' filter-chip--active' : ''}`} onClick={() => setCategoriaActiva('todas')}>
                Todos
              </button>
              {categorias.map((categoria) => (
                <button
                  key={categoria.id_categoria}
                  className={`filter-chip${categoriaActiva === categoria.id_categoria ? ' filter-chip--active' : ''}`}
                  onClick={() => setCategoriaActiva(categoria.id_categoria)}
                >
                  {categoria.cat_nombre}
                </button>
              ))}
            </div>

            <div className="compatible-list">
              {cargandoAccesorios && (
                <div className="list-state" role="status">
                  <div className="skeleton" style={{ height: '16px', width: '200px', margin: '0 auto var(--space-12)' }} />
                  Buscando piezas compatibles...
                </div>
              )}
              {!cargandoAccesorios && accesoriosFiltrados.length === 0 && (
                <p className="list-state list-empty">No hay accesorios compatibles en esta categoría.</p>
              )}
              {!cargandoAccesorios && accesoriosFiltrados.map((item) => {
                const agregado = items.some((line) => line.accesorio.id_accesorio === item.id_accesorio);
                return (
                  <div className="compatible-item" key={item.id_accesorio}>
                    <div className="mini-art">
                      <ImagenProducto src={item.imagen} />
                    </div>
                    <div className="compatible-info">
                      <strong>{item.acc_nombre}</strong>
                      <span>{item.categoria_accesorio?.cat_nombre} · {money(item.acc_precio)}</span>
                      <small>✓ Compatible con {motoActual?.modelo_moto?.modelo_nombre || 'tu moto'}</small>
                    </div>
                    <button
                      className={`btn btn--sm ${agregado ? 'btn--primary' : 'btn--outline'}`}
                      onClick={() => (agregado ? eliminarItem(item.id_accesorio) : agregarItem(item))}
                      title={agregado ? 'Quitar del carrito' : 'Agregar al carrito'}
                      aria-label={`${agregado ? 'Quitar' : 'Agregar'} ${item.acc_nombre}`}
                    >
                      {agregado ? '✓' : '+'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Configuration bar */}
        <section className="configuration-bar card">
          <div className="configuration-items">
            <div className="configuration-title">
              <span>⚙</span>
              <span>
                <strong>Tu configuración</strong>
                <small>{totalItems ? `${totalItems} accesorios seleccionados` : 'Aún no has agregado accesorios'}</small>
              </span>
            </div>
            {items.slice(0, 3).map((line) => (
              <div className="configuration-pill" key={line.accesorio.id_accesorio}>
                <span>{line.accesorio.acc_nombre}</span>
                <button onClick={() => eliminarItem(line.accesorio.id_accesorio)} className="btn btn--danger btn--sm">×</button>
              </div>
            ))}
            {items.length > 3 && <span className="configuration-pill more-pill">+{items.length - 3} más</span>}
          </div>

          <div className="configuration-total">
            <span>
              <small>Total estimado</small>
              <strong>{money(totalPrecio)}</strong>
            </span>
            {items.length ? (
              <button className="btn btn--danger" onClick={vaciarCarrito}>Limpiar ×</button>
            ) : (
              <Link to="/" className="btn btn--brand">Explorar piezas →</Link>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}