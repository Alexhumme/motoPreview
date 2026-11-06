import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Layers, Plus, Shapes, Settings2, ShoppingCart, Trash2, X } from 'lucide-react';
import { obtenerMotos } from '../../services/motos';
import { obtenerAccesoriosCompatibles } from '../../services/compatibilidad';
import { useCart } from '../../context/CartContext';
import SiteHeader from '../../components/buttons/SiteHeader';
import ImagenProducto from '../../components/ImagenProducto';
import FiltroCapa from '../../components/filters/FiltroCapa';
import { TODAS, agruparOpciones } from '../../utils/filtros';
import { refrescarMovimiento } from '../../utils/motion';
import './Configurador.css';

const money = (value) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
}).format(value);

const categoriaDe = (accesorio) => accesorio.id_categoria;
const nombreCategoria = (accesorio) => accesorio.categoria_accesorio?.cat_nombre || 'Sin categoría';
const tipoDe = (accesorio) => accesorio.id_tipo;
const nombreTipo = (accesorio) => accesorio.tipo_accesorio?.nombre || 'Sin tipo';

export default function Configurador() {
  const { items, agregarItem, eliminarItem, vaciarCarrito, totalItems, totalPrecio } = useCart();
  const [motos, setMotos] = useState([]);
  const [idMotoSeleccionada, setIdMotoSeleccionada] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState(TODAS);
  const [tipoActivo, setTipoActivo] = useState(TODAS);
  const [accesoriosCompatibles, setAccesoriosCompatibles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoAccesorios, setCargandoAccesorios] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarInicial() {
      try {
        const datosMotos = await obtenerMotos();
        setMotos(datosMotos);
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

  // Capa 1: categorías de accesorio compatibles con la moto.
  const opcionesCategoria = useMemo(
    () => agruparOpciones(accesoriosCompatibles, categoriaDe, nombreCategoria),
    [accesoriosCompatibles]
  );
  const porCategoria = useMemo(
    () =>
      categoriaActiva === TODAS
        ? accesoriosCompatibles
        : accesoriosCompatibles.filter((accesorio) => accesorio.id_categoria === categoriaActiva),
    [accesoriosCompatibles, categoriaActiva]
  );
  // Capa 2: tipos disponibles dentro de la categoría activa.
  const opcionesTipo = useMemo(
    () => agruparOpciones(porCategoria, tipoDe, nombreTipo),
    [porCategoria]
  );
  const accesoriosFiltrados = useMemo(
    () =>
      tipoActivo === TODAS
        ? porCategoria
        : porCategoria.filter((accesorio) => accesorio.id_tipo === tipoActivo),
    [porCategoria, tipoActivo]
  );

  // La lista de compatibles cambia de altura al cargar y al filtrar: las posiciones
  // de ScrollTrigger deben recalcularse o los paneles inferiores entrarán tarde.
  useEffect(() => {
    const cuadro = requestAnimationFrame(() => refrescarMovimiento());
    return () => cancelAnimationFrame(cuadro);
  }, [cargando, cargandoAccesorios, accesoriosFiltrados]);

  // Al cambiar de moto, la selección anterior puede haber quedado sin resultados.
  useEffect(() => {
    if (categoriaActiva !== TODAS && !opcionesCategoria.some((opcion) => opcion.valor === categoriaActiva)) {
      setCategoriaActiva(TODAS);
    }
  }, [opcionesCategoria, categoriaActiva]);

  useEffect(() => {
    if (tipoActivo !== TODAS && !opcionesTipo.some((opcion) => opcion.valor === tipoActivo)) {
      setTipoActivo(TODAS);
    }
  }, [opcionesTipo, tipoActivo]);

  const hayFiltrosActivos = categoriaActiva !== TODAS || tipoActivo !== TODAS;

  const pasos = [
    { numero: '01', etiqueta: 'Moto', hecho: Boolean(motoActual) },
    { numero: '02', etiqueta: 'Capas', hecho: hayFiltrosActivos },
    { numero: '03', etiqueta: 'Piezas', hecho: items.length > 0 },
  ];
  const pasoActivo = pasos.findIndex((paso) => !paso.hecho);

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
            <div className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true"></span>
              <span data-scramble="Estudio de compatibilidad">Estudio de compatibilidad</span>
            </div>
            <h1 className="configurator-title" data-reveal="lineas">Diseña tu configuración.</h1>
            <p className="configurator-subtitle" data-reveal="up" data-reveal-delay="0.1">Selecciona tu moto y encuentra accesorios que encajan sin complicaciones.</p>
          </div>
          <Link to="/carrito" className="btn btn--outline">
            <ShoppingCart size={16} aria-hidden="true" />
            Ver carrito <span className="btn-count">{totalItems}</span>
          </Link>
        </header>

        {error && <p className="configurator-error" role="alert">{error}</p>}

        <ol className="config-pasos">
          {pasos.map((paso, indice) => {
            const clases = ['config-paso'];
            if (paso.hecho) clases.push('config-paso--hecha');
            if (indice === pasoActivo) clases.push('config-paso--activa');
            return (
              <li key={paso.numero} className={clases.join(' ')}>
                <span className="config-paso__num">{paso.numero}</span>
                <span className="config-paso__etq">{paso.etiqueta}</span>
              </li>
            );
          })}
        </ol>

        <div className="configurator-layout">
          {/* Bike preview panel */}
          <section className="bike-preview-panel card" data-reveal="up">
            <div className="panel-topline">
              <span data-scramble-hover>Tu motocicleta</span>
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
              <ChevronDown className="select-arrow" size={16} aria-hidden="true" />
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
                <strong className="status-good"><Check size={14} aria-hidden="true" /> Compatible</strong>
              </div>
            </div>
          </section>

          {/* Compatible accessories panel */}
          <section className="compatible-panel card" data-reveal="up" data-reveal-delay="0.08">
            <div className="panel-topline">
              <span data-scramble-hover>Accesorios compatibles</span>
              <span className="result-count">{accesoriosFiltrados.length} resultados</span>
            </div>

            <div className="compatible-filters">
              <FiltroCapa
                etiqueta="Categoría"
                icono={<Layers size={12} aria-hidden="true" />}
                opciones={opcionesCategoria}
                valor={categoriaActiva}
                onChange={setCategoriaActiva}
                todasEtiqueta="Todas"
                ariaLabel="Filtrar accesorios por categoría"
              />

              {opcionesTipo.length > 0 && (
                <FiltroCapa
                  etiqueta="Tipo"
                  icono={<Shapes size={12} aria-hidden="true" />}
                  opciones={opcionesTipo}
                  valor={tipoActivo}
                  onChange={setTipoActivo}
                  todasEtiqueta="Todos los tipos"
                  ariaLabel="Filtrar accesorios por tipo"
                />
              )}

              {hayFiltrosActivos && (
                <button
                  type="button"
                  className="compatible-filters-clear"
                  onClick={() => {
                    setCategoriaActiva(TODAS);
                    setTipoActivo(TODAS);
                  }}
                >
                  <X size={12} aria-hidden="true" />
                  Quitar filtros
                </button>
              )}
            </div>

            <div className="compatible-list">
              {cargandoAccesorios && (
                <div className="list-state" role="status">
                  <div className="skeleton" style={{ height: '16px', width: '200px', margin: '0 auto var(--space-12)' }} />
                  Buscando piezas compatibles...
                </div>
              )}
              {!cargandoAccesorios && accesoriosFiltrados.length === 0 && (
                <p className="list-state list-empty">No hay accesorios compatibles con esta selección.</p>
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
                      <span>
                        {[item.categoria_accesorio?.cat_nombre, item.tipo_accesorio?.nombre]
                          .filter(Boolean)
                          .join(' · ')}
                        {' · '}
                        {money(item.acc_precio)}
                      </span>
                    </div>
                    <button
                      className={`btn btn--sm ${agregado ? 'btn--primary' : 'btn--outline'}`}
                      onClick={() => (agregado ? eliminarItem(item.id_accesorio) : agregarItem(item))}
                      title={agregado ? 'Quitar del carrito' : 'Agregar al carrito'}
                      aria-label={`${agregado ? 'Quitar' : 'Agregar'} ${item.acc_nombre}`}
                    >
                      {agregado ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Configuration bar */}
        {/* Sin data-reveal: la barra es sticky y el transform inicial del reveal la despegaría de su hueco. */}
        <section className="configuration-bar card">
          <div className="configuration-items">
            <div className="configuration-title">
              <span><Settings2 size={18} aria-hidden="true" /></span>
              <span>
                <strong data-scramble-hover>Tu configuración</strong>
                <small>{totalItems ? `${totalItems} accesorios seleccionados` : 'Aún no has agregado accesorios'}</small>
              </span>
            </div>
            {items.slice(0, 3).map((line) => (
              <div className="configuration-pill" key={line.accesorio.id_accesorio}>
                <span>{line.accesorio.acc_nombre}</span>
                <button onClick={() => eliminarItem(line.accesorio.id_accesorio)} className="btn btn--danger btn--sm" aria-label={`Quitar ${line.accesorio.acc_nombre}`}>
                  <X size={13} aria-hidden="true" />
                </button>
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
              <button className="btn btn--danger" onClick={vaciarCarrito}>
                <Trash2 size={15} aria-hidden="true" /> Limpiar
              </button>
            ) : (
              <Link to="/" className="btn btn--brand">Explorar piezas <ArrowRight size={16} aria-hidden="true" /></Link>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}