import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerAccesorios, obtenerCategorias } from '../../services/accesorios';
import AccesorioCard from '../../components/buttons/AccesorioCard';
import SiteHeader from '../../components/buttons/SiteHeader';
import Footer from '../../components/forms/Footer';
import heroImage from '../../assets/hero.png';
import './Catalogo.css';

export default function Catalogo() {
  const [accesorios, setAccesorios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const POR_PAGINA = 8;

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
        <section className="catalog-hero">
          <div className="catalog-hero-grid" />
          <div className="catalog-hero-copy">
            <div className="eyebrow eyebrow--light"><span className="eyebrow-dot" aria-hidden="true"></span>Accesorios con propósito</div>
            <h1 className="catalog-hero-title">Tu moto.<br /><em>Tu firma.</em></h1>
            <p className="catalog-hero-subtitle">Descubre piezas que encajan con tu máquina y con la forma en que quieres vivir la carretera.</p>
            <div className="catalog-hero-actions">
              <Link to="/configurador" className="btn btn--primary">Configurar mi moto <span>→</span></Link>
              <a href="#catalogo" className="btn btn--ghost catalog-hero-ghost">Explorar accesorios</a>
            </div>
            <div className="catalog-hero-proof">
              <span>JR</span><span>MG</span><span>DV</span><b>+</b><small>Más de 1.200 motociclistas ya configuraron la suya</small>
            </div>
          </div>
          <div className="catalog-hero-visual">
            <div className="catalog-hero-orbit catalog-hero-orbit--one" />
            <div className="catalog-hero-orbit catalog-hero-orbit--two" />
            <img src={heroImage} alt="Motocicleta MotoPreview" className="catalog-hero-image" />
            <div className="catalog-hero-fallback">MP</div>
            <div className="catalog-hero-label catalog-hero-label--top">◈ Precisión<br /><b>compatible</b></div>
            <div className="catalog-hero-label catalog-hero-label--bottom">↯ Diseñado para<br /><b>la ruta</b></div>
          </div>
        </section>

        <section className="stats-row">
          <div className="stat-item">
            <strong>+240</strong><span>piezas verificadas</span>
          </div>
          <div className="stat-item">
            <strong>98%</strong><span>compatibilidad real</span>
          </div>
          <div className="stat-item">
            <strong>24h</strong><span>respuesta de tienda</span>
          </div>
          <div className="stat-item">
            <strong>4.9/5</strong><span>experiencia promedio</span>
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
              <kbd>⌘ K</kbd>
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

        <section className="how-section" id="como-funciona">
          <div className="how-intro">
            <div className="eyebrow eyebrow--light"><span className="eyebrow-dot" aria-hidden="true"></span>Sin adivinar</div>
            <h2 className="section-title">Arma algo<br /><em>que sí encaje.</em></h2>
            <p className="section-subtitle">La tecnología de MotoPreview conecta tu modelo con accesorios que realmente son compatibles.</p>
            <Link to="/configurador" className="btn btn--outline">Empezar ahora →</Link>
          </div>
          <div className="steps">
            <div className="step">
              <span className="step-number">01</span>
              <h3 className="step-title">Elige tu moto</h3>
              <p className="step-desc">Selecciona marca, modelo y año para partir de una base exacta.</p>
            </div>
            <div className="step">
              <span className="step-number">02</span>
              <h3 className="step-title">Explora opciones</h3>
              <p className="step-desc">Ve solo las piezas que fueron hechas para tu motocicleta.</p>
            </div>
            <div className="step">
              <span className="step-number">03</span>
              <h3 className="step-title">Pide tu cotización</h3>
              <p className="step-desc">Guarda tu configuración y déjala en manos de la tienda.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}