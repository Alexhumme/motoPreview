import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { obtenerAccesorios, obtenerCategorias } from '../../services/accesorios';
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
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const POR_PAGINA = 12;

  // Rango de precios (slider)
  const [precioMin, setPrecioMin] = useState(0);
  const [precioMax, setPrecioMax] = useState(0);
  const [rangoInicializado, setRangoInicializado] = useState(false);

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [datosAccesorios, datosCategorias] = await Promise.all([
          obtenerAccesorios(),
          obtenerCategorias(),
        ]);
        setAccesorios(datosAccesorios);
        setCategorias(datosCategorias);
      } catch {
        setError('No se pudo cargar el catálogo. Verifica que el servidor esté disponible.');
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, []);

  // Calcula los límites de precio una vez cargados los accesorios.
  const limitesPrecio = useMemo(() => {
    if (accesorios.length === 0) return { min: 0, max: 0 };
    const precios = accesorios.map((a) => Number(a.acc_precio) || 0);
    return { min: Math.min(...precios), max: Math.max(...precios) };
  }, [accesorios]);

  // Inicializa el slider la primera vez que hay datos.
  useEffect(() => {
    if (accesorios.length > 0 && !rangoInicializado) {
      setPrecioMin(limitesPrecio.min);
      setPrecioMax(limitesPrecio.max);
      setRangoInicializado(true);
    }
  }, [accesorios, limitesPrecio, rangoInicializado]);

  const accesoriosFiltrados = accesorios
    .filter((a) => categoriaSeleccionada === 'todas' || a.id_categoria === categoriaSeleccionada)
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

  // Reinicia a la página 1 cuando cambian los filtros.
  useEffect(() => {
    setPaginaActual(1);
  }, [categoriaSeleccionada, busqueda, precioMin, precioMax]);

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
        <section className="catalog-hero catalog-hero--compact">
          <div className="catalog-hero-grid" />
          <div className="catalog-hero-copy">
            <div className="eyebrow eyebrow--light"><span className="eyebrow-dot" aria-hidden="true"></span>Catálogo completo</div>
            <h1 className="catalog-hero-title">Todas las piezas<br /><em>para tu moto.</em></h1>
            <p className="catalog-hero-subtitle">Explora el catálogo completo, filtra por categoría y busca la pieza exacta para tu máquina.</p>
            <div className="catalog-hero-actions">
              <Link to="/configurador" className="btn btn--primary">Configurar mi moto <span>→</span></Link>
              <Link to="/" className="btn btn--ghost catalog-hero-ghost">← Volver al inicio</Link>
            </div>
          </div>
        </section>

        <section className="catalog-section" id="catalogo">
          <div className="section-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span>Curaduría MotoPreview</div>
              <h2 className="section-title">Encuentra tu<br /><em>próxima mejora.</em></h2>
            </div>
            <p className="section-subtitle">
              {accesoriosFiltrados.length} piezas disponibles
              {categoriaSeleccionada !== 'todas' && ' en esta categoría'}
              {busqueda.trim() && ` para "${busqueda.trim()}"`}.
            </p>
          </div>

          <div className="catalog-toolbar">
            <div className="category-tabs">
              <button className={`category-tab${categoriaSeleccionada === 'todas' ? ' category-tab--active' : ''}`} onClick={() => setCategoriaSeleccionada('todas')}>
                Todos
              </button>
              {categorias.map((categoria) => (
                <button
                  key={categoria.id_categoria}
                  className={`category-tab${categoriaSeleccionada === categoria.id_categoria ? ' category-tab--active' : ''}`}
                  onClick={() => setCategoriaSeleccionada(categoria.id_categoria)}
                >
                  {categoria.cat_nombre}
                </button>
              ))}
            </div>
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
              <p className="empty-subtitle">Prueba con otra búsqueda, categoría o rango de precio.</p>
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
