import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { obtenerAccesorios, obtenerMarcasProducto, obtenerTiposProducto } from '../../services/accesorios';
import AccesorioCard from '../../components/buttons/AccesorioCard';
import SiteHeader from '../../components/buttons/SiteHeader';
import Footer from '../../components/forms/Footer';
import './Catalogo.css';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export default function CatalogoCompleto() {
  const [accesorios, setAccesorios] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState('todas');
  const [tiposSeleccionados, setTiposSeleccionados] = useState(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const POR_PAGINA = 12;

  const [precioMin, setPrecioMin] = useState(0);
  const [precioMax, setPrecioMax] = useState(0);
  const [rangoInicializado, setRangoInicializado] = useState(false);

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [datosAccesorios, datosMarcas, datosTipos] = await Promise.all([
          obtenerAccesorios(),
          obtenerMarcasProducto(),
          obtenerTiposProducto(),
        ]);
        setAccesorios(datosAccesorios);
        setMarcas(datosMarcas);
        setTipos(datosTipos);
      } catch {
        setError('No se pudo cargar el catálogo. Verifica que el servidor esté disponible.');
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, []);

  const limitesPrecio = useMemo(() => {
    if (accesorios.length === 0) return { min: 0, max: 0 };
    const precios = accesorios.map((a) => Number(a.acc_precio) || 0);
    return { min: Math.min(...precios), max: Math.max(...precios) };
  }, [accesorios]);

  useEffect(() => {
    if (accesorios.length > 0 && !rangoInicializado) {
      setPrecioMin(limitesPrecio.min);
      setPrecioMax(limitesPrecio.max);
      setRangoInicializado(true);
    }
  }, [accesorios, limitesPrecio, rangoInicializado]);

  function toggleTipo(id) {
    setTiposSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const accesoriosFiltrados = accesorios
    .filter((a) => marcaSeleccionada === 'todas' || a.id_marca === marcaSeleccionada || a.marca?.id_marca === marcaSeleccionada)
    .filter((a) => {
      if (tiposSeleccionados.size === 0) return true;
      const ids = (a.tipos || []).map((t) => t.id_tipo_producto);
      return ids.some((id) => tiposSeleccionados.has(id));
    })
    .filter((a) => {
      const precio = Number(a.acc_precio) || 0;
      return precio >= precioMin && precio <= precioMax;
    })
    .filter((a) => {
      const texto = busqueda.trim().toLowerCase();
      if (!texto) return true;
      return [a.acc_nombre, a.acc_descripcion, a.codigo_sku]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(texto));
    });

  const totalPaginas = Math.max(1, Math.ceil(accesoriosFiltrados.length / POR_PAGINA));
  const accesoriosPagina = accesoriosFiltrados.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA
  );

  useEffect(() => {
    setPaginaActual(1);
  }, [marcaSeleccionada, tiposSeleccionados, busqueda, precioMin, precioMax]);

  if (cargando) {
    return (
      <div className="catalog-page">
        <SiteHeader />
        <main>
          <div className="catalogo-estado">
            <div className="skeleton" style={{ height: '56px', width: '200px' }} />
            <div className="skeleton" style={{ height: '400px' }} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  if (error) {
    return (
      <div className="catalog-page">
        <SiteHeader />
        <main>
          <div className="catalogo-estado catalogo-estado--error">{error}</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="catalog-page">
      <SiteHeader />
      <main>
        <section className="catalog-section" id="catalogo">
          <div className="section-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span>Curaduría MotoPreview</div>
              <h2 className="section-title">Encuentra tu<br /><em>próxima mejora.</em></h2>
            </div>
            <p className="section-subtitle">
              {accesoriosFiltrados.length} piezas disponibles
              {marcaSeleccionada !== 'todas' && ' de esta marca'}
              {busqueda.trim() && ` para "${busqueda.trim()}"`}.
            </p>
          </div>

          {/* Fila de marcas (con logo o placeholder) */}
          <div className="filtro-capa">
            <span className="filtro-capa__label">Marca</span>
            <div className="filtro-capa__chips" role="group" aria-label="Filtrar por marca">
              <button
                type="button"
                className={`filtro-chip${marcaSeleccionada === 'todas' ? ' filtro-chip--activa' : ''}`}
                onClick={() => setMarcaSeleccionada('todas')}
                aria-pressed={marcaSeleccionada === 'todas'}
              >
                Todas
              </button>
              {marcas.map((m) => (
                <button
                  key={m.id_marca}
                  type="button"
                  className={`filtro-chip${marcaSeleccionada === m.id_marca ? ' filtro-chip--activa' : ''}`}
                  onClick={() => setMarcaSeleccionada(m.id_marca)}
                  title={m.nombre}
                  aria-pressed={marcaSeleccionada === m.id_marca}
                >
                  {m.logo ? (
                    <img src={m.logo} alt={m.nombre} className="filtro-chip__logo" />
                  ) : (
                    <span className="filtro-chip__inicial">{m.nombre.charAt(0)}</span>
                  )}
                  <span>{m.nombre}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fila de tipos (selección múltiple) */}
          <div className="filtro-capa">
            <span className="filtro-capa__label">Tipo</span>
            <div className="filtro-capa__chips" role="group" aria-label="Filtrar por tipo">
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
                <button type="button" className="filtro-chip" onClick={() => setTiposSeleccionados(new Set())}>
                  Limpiar tipos
                </button>
              )}
            </div>
          </div>

          <div className="catalog-toolbar">
            <label className="search-field">
              <span>⌕</span>
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar accesorio..." />
            </label>
          </div>

          {/* Slider de rango de precios */}
          {accesorios.length > 0 && (
            <div className="price-slider">
              <div className="price-slider-head">
                <span className="price-slider-label">Rango de precio</span>
                <span className="price-slider-value">{COP.format(precioMin)} — {COP.format(precioMax)}</span>
              </div>
              <div className="price-slider-tracks">
                <label className="price-slider-field">
                  <span>Mínimo</span>
                  <input
                    type="range"
                    min={limitesPrecio.min}
                    max={limitesPrecio.max}
                    step={1000}
                    value={precioMin}
                    onChange={(e) => setPrecioMin(Math.min(Number(e.target.value), precioMax))}
                  />
                </label>
                <label className="price-slider-field">
                  <span>Máximo</span>
                  <input
                    type="range"
                    min={limitesPrecio.min}
                    max={limitesPrecio.max}
                    step={1000}
                    value={precioMax}
                    onChange={(e) => setPrecioMax(Math.max(Number(e.target.value), precioMin))}
                  />
                </label>
              </div>
              {(precioMin !== limitesPrecio.min || precioMax !== limitesPrecio.max) && (
                <button
                  className="price-slider-reset"
                  onClick={() => { setPrecioMin(limitesPrecio.min); setPrecioMax(limitesPrecio.max); }}
                >
                  Limpiar filtro de precio
                </button>
              )}
            </div>
          )}

          {accesoriosFiltrados.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">⌕</span>
              <h3 className="empty-title">No encontramos esa pieza</h3>
              <p className="empty-subtitle">Prueba con otra búsqueda, marca, tipo o rango de precio.</p>
            </div>
          ) : (
            <>
              <div className="product-grid">
                {accesoriosPagina.map((accesorio) => <AccesorioCard key={accesorio.id_accesorio} accesorio={accesorio} />)}
              </div>
              {totalPaginas > 1 && (
                <div className="catalog-pagination">
                  <button disabled={paginaActual === 1} onClick={() => setPaginaActual((p) => p - 1)}>← Anterior</button>
                  <span className="pagination-current">Página {paginaActual} de {totalPaginas}</span>
                  <button disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual((p) => p + 1)}>Siguiente →</button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
