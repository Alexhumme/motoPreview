import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerAccesorios, obtenerCategorias } from '../../services/accesorios';
import AccesorioCard from '../../components/buttons/AccesorioCard';
import SiteHeader from '../../components/buttons/SiteHeader';
import Footer from '../../components/forms/Footer';
import './Catalogo.css';

export default function CatalogoCompleto() {
  const [accesorios, setAccesorios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const POR_PAGINA = 12;

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

  const accesoriosFiltrados = accesorios
    .filter((a) => categoriaSeleccionada === 'todas' || a.id_categoria === categoriaSeleccionada)
    .filter((a) => !(a.codigo_sku || '').startsWith('DEMO-'))
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
            <p className="section-subtitle">Todo lo que necesitas para transformar tu motocicleta, filtrado por calidad, compatibilidad y propósito.</p>
          </div>

          <div className="catalog-toolbar">
            <div className="category-tabs">
              <button className={`category-tab${categoriaSeleccionada === 'todas' ? ' category-tab--active' : ''}`} onClick={() => { setCategoriaSeleccionada('todas'); setPaginaActual(1); }}>
                Todos
              </button>
              {categorias.map((categoria) => (
                <button
                  key={categoria.id_categoria}
                  className={`category-tab${categoriaSeleccionada === categoria.id_categoria ? ' category-tab--active' : ''}`}
                  onClick={() => { setCategoriaSeleccionada(categoria.id_categoria); setPaginaActual(1); }}
                >
                  {categoria.cat_nombre}
                </button>
              ))}
            </div>
            <label className="search-field">
              <span>⌕</span>
              <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }} placeholder="Buscar accesorio..." />
            </label>
          </div>

          {accesoriosFiltrados.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">⌕</span>
              <h3 className="empty-title">No encontramos esa pieza</h3>
              <p className="empty-subtitle">Prueba con otra búsqueda o categoría.</p>
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
