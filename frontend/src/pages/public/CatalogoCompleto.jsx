import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Shapes,
  Layers,
  ArrowUpDown,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  SearchX,
} from 'lucide-react';
import { obtenerProductos } from '../../services/productos';
import AccesorioCard from '../../components/buttons/AccesorioCard';
import FiltroCapa from '../../components/filters/FiltroCapa';
import { TODAS, agruparOpciones } from '../../utils/filtros';
import SiteHeader from '../../components/buttons/SiteHeader';
import Footer from '../../components/forms/Footer';
import './Catalogo.css';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const SIN_CATEGORIA = '__sin_categoria';

const ORDEN_OPCIONES = [
  { value: 'relevancia', label: 'Relevancia' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'nombre-asc', label: 'Nombre: A–Z' },
  { value: 'nombre-desc', label: 'Nombre: Z–A' },
];

const colador = new Intl.Collator('es', { sensitivity: 'base' });

function ordenarProductos(lista, orden) {
  const precio = (producto) => Number(producto.acc_precio) || 0;
  const nombre = (producto) => producto.acc_nombre || '';
  const comparadores = {
    'precio-asc': (a, b) => precio(a) - precio(b),
    'precio-desc': (a, b) => precio(b) - precio(a),
    'nombre-asc': (a, b) => colador.compare(nombre(a), nombre(b)),
    'nombre-desc': (a, b) => colador.compare(nombre(b), nombre(a)),
  };
  const comparador = comparadores[orden];
  return comparador ? [...lista].sort(comparador) : lista;
}

const categoriaDe = (producto) =>
  producto.categoria_producto?.id_categoria_producto || SIN_CATEGORIA;
const nombreCategoria = (producto) =>
  producto.categoria_producto?.nombre || 'Sin categoría';
const tipoDe = (producto) => (producto.es_accesorio ? producto.id_tipo : null);
const nombreTipo = (producto) => producto.tipo_accesorio?.nombre || '';

export default function CatalogoCompleto() {
  const [productos, setProductos] = useState([]);
  const [categoria, setCategoria] = useState(TODAS);
  const [tipo, setTipo] = useState(TODAS);
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
        setProductos(await obtenerProductos());
      } catch {
        setError('No se pudo cargar el catálogo. Verifica que el servidor esté disponible.');
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, []);

  // Calcula los límites de precio una vez cargados los productos.
  const limitesPrecio = useMemo(() => {
    if (productos.length === 0) return { min: 0, max: 0 };
    const precios = productos.map((p) => Number(p.acc_precio) || 0);
    return { min: Math.min(...precios), max: Math.max(...precios) };
  }, [productos]);

  // Inicializa el slider la primera vez que hay datos.
  useEffect(() => {
    if (productos.length > 0 && !rangoInicializado) {
      setPrecioMin(limitesPrecio.min);
      setPrecioMax(limitesPrecio.max);
      setRangoInicializado(true);
    }
  }, [productos, limitesPrecio, rangoInicializado]);

  const porTextoPrecio = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return productos.filter((producto) => {
      const precio = Number(producto.acc_precio) || 0;
      if (precio < precioMin || precio > precioMax) return false;
      if (!texto) return true;
      return [producto.acc_nombre, producto.acc_descripcion, producto.codigo_sku]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(texto));
    });
  }, [productos, busqueda, precioMin, precioMax]);

  const opcionesCategoria = useMemo(
    () => agruparOpciones(porTextoPrecio, categoriaDe, nombreCategoria),
    [porTextoPrecio]
  );

  const porCategoria = useMemo(
    () =>
      categoria === TODAS
        ? porTextoPrecio
        : porTextoPrecio.filter((producto) => categoriaDe(producto) === categoria),
    [porTextoPrecio, categoria]
  );

  const opcionesTipo = useMemo(
    () => agruparOpciones(porCategoria, tipoDe, nombreTipo),
    [porCategoria]
  );

  const productosFiltrados = useMemo(() => {
    const filtrados =
      tipo === TODAS
        ? porCategoria
        : porCategoria.filter((producto) => producto.id_tipo === tipo);
    return ordenarProductos(filtrados, orden);
  }, [porCategoria, tipo, orden]);

  // Un tipo solo tiene sentido dentro de su categoría: si la categoría nueva
  // no lo contiene, el filtro se suelta solo.
  useEffect(() => {
    if (tipo !== TODAS && !opcionesTipo.some((opcion) => opcion.valor === tipo)) {
      setTipo(TODAS);
    }
  }, [opcionesTipo, tipo]);

  const hayFiltrosActivos =
    categoria !== TODAS ||
    tipo !== TODAS ||
    busqueda.trim() !== '' ||
    precioMin !== limitesPrecio.min ||
    precioMax !== limitesPrecio.max;

  function limpiarFiltros() {
    setCategoria(TODAS);
    setTipo(TODAS);
    setBusqueda('');
    setPrecioMin(limitesPrecio.min);
    setPrecioMax(limitesPrecio.max);
  }

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / POR_PAGINA));
  const productosPagina = productosFiltrados.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA
  );

  // Reinicia a la página 1 cuando cambian los filtros o el orden.
  useEffect(() => {
    setPaginaActual(1);
  }, [categoria, tipo, busqueda, precioMin, precioMax, orden]);

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
                  aria-label="Buscar productos"
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
                  <ArrowUpDown size={14} aria-hidden="true" />
                  Ordenar
                </span>
                <select value={orden} onChange={(e) => setOrden(e.target.value)}>
                  {ORDEN_OPCIONES.map((opcion) => (
                    <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
                  ))}
                </select>
              </label>

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
            </div>

            <div className="catalog-filters-layers">
              <div className="catalog-filters-capas">
                <FiltroCapa
                  etiqueta="Categoría"
                  icono={<Layers size={12} aria-hidden="true" />}
                  opciones={opcionesCategoria}
                  valor={categoria}
                  onChange={setCategoria}
                  todasEtiqueta="Todas"
                  ariaLabel="Filtrar el catálogo por categoría de producto"
                />

                {opcionesTipo.length > 0 && (
                  <FiltroCapa
                    etiqueta="Tipo"
                    icono={<Shapes size={12} aria-hidden="true" />}
                    opciones={opcionesTipo}
                    valor={tipo}
                    onChange={setTipo}
                    todasEtiqueta="Todos los tipos"
                    ariaLabel="Filtrar el catálogo por tipo de accesorio"
                  />
                )}
              </div>

              <div className="catalog-filters-meta">
                <span>{productosFiltrados.length} de {productos.length} productos</span>
                {hayFiltrosActivos && (
                  <button type="button" className="catalog-filters-clear" onClick={limpiarFiltros}>
                    <RotateCcw size={13} aria-hidden="true" />
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          </div>

          {productosFiltrados.length === 0 ? (
            <div className="empty-state">
              <SearchX className="empty-icon" size={48} strokeWidth={1.5} aria-hidden="true" />
              <h3 className="empty-title">No encontramos ese producto</h3>
              <p className="empty-subtitle">Prueba con otra búsqueda, categoría o rango de precio.</p>
            </div>
          ) : (
            <>
              <div className="product-grid">
                {productosPagina.map((producto) => <AccesorioCard key={producto.id_accesorio} accesorio={producto} />)}
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
