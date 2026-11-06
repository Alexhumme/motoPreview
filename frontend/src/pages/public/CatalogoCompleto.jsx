import { useEffect, useState, useMemo } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, RotateCcw, X, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
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

const ORDEN_OPCIONES = [
  { value: 'relevancia', label: 'Relevancia' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'nombre-asc', label: 'Nombre: A–Z' },
  { value: 'nombre-desc', label: 'Nombre: Z–A' },
];

const colador = new Intl.Collator('es', { sensitivity: 'base' });

function ordenarAccesorios(lista, orden) {
  const precio = (accesorio) => Number(accesorio.acc_precio) || 0;
  const nombre = (accesorio) => accesorio.acc_nombre || '';
  const comparadores = {
    'precio-asc': (a, b) => precio(a) - precio(b),
    'precio-desc': (a, b) => precio(b) - precio(a),
    'nombre-asc': (a, b) => colador.compare(nombre(a), nombre(b)),
    'nombre-desc': (a, b) => colador.compare(nombre(b), nombre(a)),
  };
  const comparador = comparadores[orden];
  return comparador ? [...lista].sort(comparador) : lista;
}

export default function CatalogoCompleto() {
  const [accesorios, setAccesorios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('relevancia');
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

  const accesoriosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const filtrados = accesorios.filter((accesorio) => {
      if (categoriaSeleccionada !== 'todas' && accesorio.id_categoria !== categoriaSeleccionada) {
        return false;
      }
      const precio = Number(accesorio.acc_precio) || 0;
      if (precio < precioMin || precio > precioMax) return false;
      if (!texto) return true;
      return [accesorio.acc_nombre, accesorio.acc_descripcion, accesorio.codigo_sku]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(texto));
    });
    return ordenarAccesorios(filtrados, orden);
  }, [accesorios, categoriaSeleccionada, busqueda, precioMin, precioMax, orden]);

  const hayFiltrosActivos =
    categoriaSeleccionada !== 'todas' ||
    busqueda.trim() !== '' ||
    precioMin !== limitesPrecio.min ||
    precioMax !== limitesPrecio.max;

  function limpiarFiltros() {
    setCategoriaSeleccionada('todas');
    setBusqueda('');
    setPrecioMin(limitesPrecio.min);
    setPrecioMax(limitesPrecio.max);
  }

  const totalPaginas = Math.max(1, Math.ceil(accesoriosFiltrados.length / POR_PAGINA));
  const accesoriosPagina = accesoriosFiltrados.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA
  );

  // Reinicia a la página 1 cuando cambian los filtros o el orden.
  useEffect(() => {
    setPaginaActual(1);
  }, [categoriaSeleccionada, busqueda, precioMin, precioMax, orden]);

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
              <h2 className="section-title">Encuentra tu<br /><em>próxima mejora.</em></h2>
            </div>
          </div>

          <div className="catalog-filters">
            <div className="catalog-filters-main">
              <div className="catalog-search">
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, SKU o descripción…"
                  aria-label="Buscar accesorios"
                />
                {busqueda && (
                  <button
                    type="button"
                    className="catalog-search-clear"
                    onClick={() => setBusqueda('')}
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>

              <label className="catalog-control">
                <span className="catalog-control-label">
                  <SlidersHorizontal size={14} aria-hidden="true" />
                  Categoría
                </span>
                <select value={categoriaSeleccionada} onChange={(e) => setCategoriaSeleccionada(e.target.value)}>
                  <option value="todas">Todas las categorías</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id_categoria} value={categoria.id_categoria}>
                      {categoria.cat_nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="catalog-control">
                <span className="catalog-control-label">
                  <ArrowUpDown size={14} aria-hidden="true" />
                  Ordenar por
                </span>
                <select value={orden} onChange={(e) => setOrden(e.target.value)}>
                  {ORDEN_OPCIONES.map((opcion) => (
                    <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {accesorios.length > 0 && (
              <div className="catalog-filters-sub">
                <div className="price-range">
                  <span className="price-range-title">Precio</span>
                  <label className="price-range-field">
                    <span>{COP.format(precioMin)}</span>
                    <input
                      type="range"
                      min={limitesPrecio.min}
                      max={limitesPrecio.max}
                      step={1000}
                      value={precioMin}
                      onChange={(e) => setPrecioMin(Math.min(Number(e.target.value), precioMax))}
                      aria-label="Precio mínimo"
                    />
                  </label>
                  <span className="price-range-sep" aria-hidden="true">—</span>
                  <label className="price-range-field">
                    <span>{COP.format(precioMax)}</span>
                    <input
                      type="range"
                      min={limitesPrecio.min}
                      max={limitesPrecio.max}
                      step={1000}
                      value={precioMax}
                      onChange={(e) => setPrecioMax(Math.max(Number(e.target.value), precioMin))}
                      aria-label="Precio máximo"
                    />
                  </label>
                </div>

                <div className="catalog-filters-meta">
                  <span>{accesoriosFiltrados.length} de {accesorios.length} piezas</span>
                  {hayFiltrosActivos && (
                    <button type="button" className="catalog-filters-clear" onClick={limpiarFiltros}>
                      <RotateCcw size={13} aria-hidden="true" />
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {accesoriosFiltrados.length === 0 ? (
            <div className="empty-state">
              <SearchX className="empty-icon" size={48} strokeWidth={1.5} aria-hidden="true" />
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
                  <button disabled={paginaActual === 1} onClick={() => setPaginaActual((p) => p - 1)}>
                    <ChevronLeft size={15} aria-hidden="true" /> Anterior
                  </button>
                  <span className="pagination-current">Página {paginaActual} de {totalPaginas}</span>
                  <button disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual((p) => p + 1)}>
                    Siguiente <ChevronRight size={15} aria-hidden="true" />
                  </button>
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
