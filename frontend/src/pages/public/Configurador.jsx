import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Plus, Search, Shapes, Settings2, ShoppingCart, X } from 'lucide-react';
import { obtenerMotos } from '../../services/motos';
import { obtenerAccesorios, obtenerTiposProducto } from '../../services/accesorios';
import { useCart } from '../../context/CartContext';
import SiteHeader from '../../components/buttons/SiteHeader';
import ImagenProducto from '../../components/ImagenProducto';
import { refrescarMovimiento } from '../../utils/motion';
import './Configurador.css';

const money = (value) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
}).format(value);

export default function Configurador() {
  const { items, agregarItem, eliminarItem, totalItems, totalPrecio } = useCart();
  const navigate = useNavigate();
  const [motos, setMotos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [accesorios, setAccesorios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoAccesorios] = useState(false);
  const [error, setError] = useState('');

  // Selectores en cascada de moto
  const [marcaMoto, setMarcaMoto] = useState('');
  const [modeloMoto, setModeloMoto] = useState('');
  const [anioMoto, setAnioMoto] = useState('');
  const [busquedaMoto, setBusquedaMoto] = useState('');

  // Tipos seleccionados (multi-select)
  const [tiposSeleccionados, setTiposSeleccionados] = useState(new Set());

  useEffect(() => {
    async function cargarInicial() {
      try {
        const [datosMotos, datosTipos, datosAccesorios] = await Promise.all([
          obtenerMotos(),
          obtenerTiposProducto(),
          obtenerAccesorios(),
        ]);
        setMotos(datosMotos);
        setTipos(datosTipos.filter((t) => t.accesorio));
        setAccesorios(datosAccesorios);
      } catch {
        setError('No se pudieron cargar las opciones del configurador.');
      } finally {
        setCargando(false);
      }
    }
    cargarInicial();
  }, []);

  // Marcas disponibles (a partir de las motos)
  const marcasMoto = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const m of motos) {
      const id = m.modelo_moto?.marca_moto?.id_marca || m.modelo_moto?.id_marca;
      const nombre = m.modelo_moto?.marca_moto?.marca_nombre || '';
      if (id && !seen.has(id)) { seen.add(id); out.push({ id, nombre }); }
    }
    return out.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [motos]);

  // Modelos filtrados por marca
  const modelosMoto = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const m of motos) {
      const idMarca = m.modelo_moto?.marca_moto?.id_marca || m.modelo_moto?.id_marca;
      if (marcaMoto && idMarca !== marcaMoto) continue;
      const id = m.modelo_moto?.id_modelo_moto;
      const nombre = m.modelo_moto?.modelo_nombre;
      if (id && !seen.has(id)) { seen.add(id); out.push({ id, nombre, cilindraje: m.modelo_moto?.cilindraje }); }
    }
    return out.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [motos, marcaMoto]);

  // Años filtrados por modelo
  const aniosMoto = useMemo(() => {
    const out = [];
    for (const m of motos) {
      const idModelo = m.modelo_moto?.id_modelo_moto;
      if (modeloMoto && idModelo !== modeloMoto) continue;
      const idMarca = m.modelo_moto?.marca_moto?.id_marca || m.modelo_moto?.id_marca;
      if (marcaMoto && idMarca !== marcaMoto) continue;
      if (!out.includes(m.moto_anio)) out.push(m.moto_anio);
    }
    return out.sort((a, b) => b - a);
  }, [motos, marcaMoto, modeloMoto]);

  // Moto seleccionada (por marca+modelo+año, o la primera que coincida)
  const motoActual = useMemo(() => {
    return motos.find((m) => {
      const idMarca = m.modelo_moto?.marca_moto?.id_marca || m.modelo_moto?.id_marca;
      const idModelo = m.modelo_moto?.id_modelo_moto;
      if (marcaMoto && idMarca !== marcaMoto) return false;
      if (modeloMoto && idModelo !== modeloMoto) return false;
      if (anioMoto && String(m.moto_anio) !== String(anioMoto)) return false;
      return true;
    }) || motos.find((m) => {
      // fallback: search by text
      if (!busquedaMoto.trim()) return false;
      const texto = busquedaMoto.toLowerCase();
      const nombre = `${m.modelo_moto?.marca_moto?.marca_nombre || ''} ${m.modelo_moto?.modelo_nombre || ''} ${m.moto_anio}`.toLowerCase();
      return nombre.includes(texto);
    }) || (motos.length ? motos[0] : null);
  }, [motos, marcaMoto, modeloMoto, anioMoto, busquedaMoto]);


  // Reset modelo/año cuando cambia marca
  useEffect(() => { setModeloMoto(''); setAnioMoto(''); }, [marcaMoto]);
  useEffect(() => { setAnioMoto(''); }, [modeloMoto]);

  const motoNombre = motoActual
    ? `${motoActual.modelo_moto?.marca_moto?.marca_nombre || ''} ${motoActual.modelo_moto?.modelo_nombre || ''}`.trim()
    : 'Selecciona una motocicleta';

  // Accesorios filtrados por tipos seleccionados
  const accesoriosFiltrados = useMemo(() => {
    let lista = accesorios;
    if (tiposSeleccionados.size > 0) {
      lista = lista.filter((a) => (a.tipos || []).some((t) => tiposSeleccionados.has(t.id_tipo_producto)));
    }
    return lista;
  }, [accesorios, tiposSeleccionados]);

  const hayFiltrosActivos = tiposSeleccionados.size > 0;

  const pasos = [
    { numero: '01', etiqueta: 'Moto', hecho: Boolean(motoActual) },
    { numero: '02', etiqueta: 'Tipos', hecho: hayFiltrosActivos },
    { numero: '03', etiqueta: 'Piezas', hecho: items.length > 0 },
  ];
  const pasoActivo = pasos.findIndex((paso) => !paso.hecho);

  // La lista cambia de altura al cargar y al filtrar.
  useEffect(() => {
    const cuadro = requestAnimationFrame(() => refrescarMovimiento());
    return () => cancelAnimationFrame(cuadro);
  }, [cargando, accesoriosFiltrados]);

  function toggleTipo(id) {
    setTiposSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
              <span>Tu motocicleta</span>
              <span className="live-status"><span className="live-dot" aria-hidden="true"></span> Live preview</span>
            </div>

            {/* Selectores en cascada + búsqueda */}
            <div className="moto-selectors">
              <label className="select-label">Buscar moto</label>
              <div className="select-wrap">
                <Search size={14} className="select-search-icon" aria-hidden="true" />
                <input
                  type="text"
                  className="select-wrap__input"
                  value={busquedaMoto}
                  onChange={(e) => setBusquedaMoto(e.target.value)}
                  placeholder="Marca, modelo o año..."
                />
              </div>

              <label className="select-label">Marca</label>
              <div className="select-wrap">
                <select value={marcaMoto} onChange={(e) => setMarcaMoto(e.target.value)}>
                  <option value="">Todas las marcas</option>
                  {marcasMoto.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
                <ChevronDown className="select-arrow" size={16} aria-hidden="true" />
              </div>

              <label className="select-label">Modelo</label>
              <div className="select-wrap">
                <select value={modeloMoto} onChange={(e) => setModeloMoto(e.target.value)} disabled={!marcaMoto && marcasMoto.length > 0}>
                  <option value="">Todos los modelos</option>
                  {modelosMoto.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre} · {m.cilindraje}</option>
                  ))}
                </select>
                <ChevronDown className="select-arrow" size={16} aria-hidden="true" />
              </div>

              <label className="select-label">Año</label>
              <div className="select-wrap">
                <select value={anioMoto} onChange={(e) => setAnioMoto(e.target.value)} disabled={!modeloMoto && modelosMoto.length > 0}>
                  <option value="">Todos los años</option>
                  {aniosMoto.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <ChevronDown className="select-arrow" size={16} aria-hidden="true" />
              </div>
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
              <span data-scramble-hover>Accesorios disponibles</span>
              <span className="result-count">{accesoriosFiltrados.length} resultados</span>
            </div>

            {/* Filtro por tipo (multi-select) */}
            {tipos.length > 0 && (
              <div className="compatible-filters">
                <div className="filtro-capa">
                  <span className="filtro-capa__label"><Shapes size={12} aria-hidden="true" /> Tipo</span>
                  <div className="filtro-capa__chips" role="group" aria-label="Filtrar accesorios por tipo">
                    {tipos.map((t) => (
                      <button
                        key={t.id_tipo_producto}
                        type="button"
                        className={`filtro-chip${tiposSeleccionados.has(t.id_tipo_producto) ? ' filtro-chip--activa' : ''}`}
                        onClick={() => toggleTipo(t.id_tipo_producto)}
                        aria-pressed={tiposSeleccionados.has(t.id_tipo_producto)}
                      >
                        {t.nombre}
                      </button>
                    ))}
                    {tiposSeleccionados.size > 0 && (
                      <button type="button" className="compatible-filters-clear" onClick={() => setTiposSeleccionados(new Set())}>
                        <X size={12} aria-hidden="true" /> Quitar filtros
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="compatible-list">
              {cargandoAccesorios && (
                <div className="list-state" role="status">
                  <div className="skeleton" style={{ height: '16px', width: '200px', margin: '0 auto var(--space-12)' }} />
                  Buscando piezas compatibles...
                </div>
              )}
              {!cargandoAccesorios && accesoriosFiltrados.length === 0 && (
                <p className="list-state list-empty">No hay accesorios con los tipos seleccionados.</p>
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
                        {[item.marca?.nombre, ...(item.tipos || []).map((t) => t.nombre)]
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
                <button onClick={() => eliminarItem(line.accesorio.id_accesorio)} className="btn btn--danger btn--sm">×</button>
              </div>
            ))}
            {items.length > 3 && (
              <span className="configuration-more">+{items.length - 3} más</span>
            )}
          </div>
          <div className="configuration-total">
            <small>Total estimado</small>
            <strong>{money(totalPrecio)}</strong>
            <button className="btn btn--primary" onClick={() => navigate('/carrito')}>Ir al carrito <ArrowRight size={14} aria-hidden="true" /></button>
          </div>
        </section>
      </main>
    </div>
  );
}
