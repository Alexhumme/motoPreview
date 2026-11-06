import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, ClipboardList, Rotate3d, Sparkles } from 'lucide-react';
import SiteHeader from '../../components/buttons/SiteHeader';
import Footer from '../../components/forms/Footer';
import motoristaHero from '../../assets/motorista_hero.png';
import './Catalogo.css';

export default function Catalogo() {
  return (
    <div className="catalog-page">
      <SiteHeader />
      <main>
        <section className="catalog-hero">
          <div className="catalog-hero-fondo" aria-hidden="true" />
          {/* El motorista sale por detrás del tajo: vive bajo la forma oscura. */}
          <img
            className="catalog-hero-motorista"
            src={motoristaHero}
            width={880}
            height={822}
            alt=""
            fetchPriority="high"
            decoding="async"
            data-parallax="-0.05"
          />

          <div className="catalog-hero-tajo" aria-hidden="true" />
          <div className="catalog-hero-linea" aria-hidden="true">
            <span className="catalog-hero-haz" />
            <span className="catalog-hero-haz catalog-hero-haz--fino" />
            <span className="catalog-hero-regla" />
            <span className="catalog-hero-nodo" />
            <span className="catalog-hero-cota">tajo · 3.3°</span>
            <span className="catalog-hero-dientes" />
          </div>

          <div className="catalog-hero-grid">
            <div className="catalog-hero-copy">
              <div className="eyebrow eyebrow--light">
                <span className="eyebrow-dot" aria-hidden="true"></span>
                <span data-scramble="Accesorios con propósito">Accesorios con propósito</span>
              </div>
              <h1 className="catalog-hero-title" data-reveal="fade">
                Tu moto.<br /><em data-glitch={"Tu firma."}>Tu firma.</em>
              </h1>
              <p className="catalog-hero-subtitle" data-reveal="up" data-reveal-delay="0.25">
                Descubre piezas que encajan con tu máquina y con la forma en que quieres vivir la carretera.
              </p>
              <div className="catalog-hero-actions" data-reveal="up" data-reveal-delay="0.35">
                <Link to="/configurador" className="btn btn--primary">Configurar mi moto <ArrowRight size={16} aria-hidden="true" /></Link>
                <a href="#catalogo" className="btn btn--ghost catalog-hero-ghost">Explorar accesorios</a>
              </div>
              <div className="catalog-hero-proof" data-reveal="fade" data-reveal-delay="0.5">
                <span>JR</span><span>MG</span><span>DV</span><b>+</b><small>Más de 1.200 motociclistas ya configuraron la suya</small>
              </div>
            </div>
          </div>

          {/* Segunda pasada del título, en tinta de la zona oscura y recortada por
              el mismo polígono: así "Tu firma." parece partido por el corte. */}
          <div className="catalog-hero-eco" aria-hidden="true">
            <div className="catalog-hero-grid">
              <div className="catalog-hero-copy">
                <div className="eyebrow eyebrow--light catalog-hero-ciego">
                  <span className="eyebrow-dot" aria-hidden="true"></span>
                  <span>Accesorios con propósito</span>
                </div>
                <div className="catalog-hero-title" data-reveal="fade">
                  <span className="catalog-hero-ciego">Tu moto.</span><br /><em>Tu firma.</em>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="intro-section" id="acerca-de">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--light"><span className="eyebrow-dot" aria-hidden="true"></span>¿Qué es MotoPreview?</div>
              <h2 className="section-title" data-reveal="lineas">La tienda de tu moto,<br /><em>antes de gastar un peso.</em></h2>
            </div>
            <p className="section-subtitle" data-reveal="up">
              MotoPreview conecta motociclistas con tiendas de accesorios: exploras piezas,
              confirmas que encajan con tu modelo exacto, las miras en 3D y envías una cotización.
              Sin pagos en línea, sin compras a ciegas.
            </p>
          </div>
          <div className="intro-grid" data-reveal="grupo">
            <article className="intro-card fx-marcas">
              <span className="intro-icon" aria-hidden="true"><BadgeCheck size={20} /></span>
              <h3 className="intro-title" data-glitch="Compatibilidad real">Compatibilidad real</h3>
              <p className="intro-text">Cada accesorio se valida contra la marca, modelo y año de tu motocicleta. Solo ves lo que sí encaja.</p>
            </article>
            <article className="intro-card fx-marcas">
              <span className="intro-icon" aria-hidden="true"><Rotate3d size={20} /></span>
              <h3 className="intro-title" data-glitch="Visualización 3D">Visualización 3D</h3>
              <p className="intro-text">Gira la pieza desde todos los ángulos antes de decidir, directo en tu navegador y sin instalar nada.</p>
            </article>
            <article className="intro-card fx-marcas">
              <span className="intro-icon" aria-hidden="true"><ClipboardList size={20} /></span>
              <h3 className="intro-title" data-glitch="Cotización sin fricción">Cotización sin fricción</h3>
              <p className="intro-text">Arma tu pedido con tu moto asociada y la tienda responde con precio y disponibilidad. Tú decides cuándo comprar.</p>
            </article>
          </div>
        </section>

        <section className="stats-row" data-reveal="up">
          <div className="stat-item" >
            <strong>+<span data-contado="240" data-scramble-hover>0</span></strong><span>piezas verificadas</span>
          </div>
          <div className="stat-item">
            <strong><span data-contado="98" data-scramble-hover>0</span>%</strong><span>compatibilidad real</span>
          </div>
          <div className="stat-item">
            <strong><span data-contado="24" data-scramble-hover>0</span>h</strong><span>respuesta de tienda</span>
          </div>
          <div className="stat-item">
            <strong>4.9/5</strong><span>experiencia promedio</span>
          </div>
        </section>

        <section className="catalog-cta" id="catalogo">
          <div className="catalog-cta-copy">
            <div className="eyebrow eyebrow--light"><span className="eyebrow-dot" aria-hidden="true"></span>Curaduría MotoPreview</div>
            <h2 className="section-title" data-reveal="lineas">Encuentra tu<br /><em>próxima mejora.</em></h2>
            <p className="section-subtitle" data-reveal="up">Explora el catálogo completo de productos y accesorios verificados, filtrados por categoría y compatibilidad con tu moto.</p>
            <div className="catalog-hero-actions">
              <Link to="/catalogo" className="btn btn--primary">Ver catálogo completo <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link to="/configurador" className="btn btn--ghost catalog-hero-ghost">Configurar mi moto</Link>
            </div>
          </div>
          <div className="catalog-cta-visual">
            <div className="catalog-cta-card fx-marcas" data-reveal="scale">
              <span className="catalog-cta-icon" aria-hidden="true"><Sparkles size={28} /></span>
              <strong><span data-contado="240">0</span> piezas verificadas</strong>
              <small>Escapes, iluminación, protección y estética</small>
            </div>
          </div>
        </section>

        <section className="how-section" id="como-funciona">
          <div className="how-intro">
            <div className="eyebrow eyebrow--light"><span className="eyebrow-dot" aria-hidden="true"></span>Sin adivinar</div>
            <h2 className="section-title" data-reveal="lineas">Arma algo<br /><em>que sí encaje.</em></h2>
            <p className="section-subtitle" data-reveal="up">La tecnología de MotoPreview conecta tu modelo con accesorios que realmente son compatibles.</p>
            <Link to="/configurador" className="btn btn--outline">Empezar ahora <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="steps" data-reveal="grupo">
            <div className="step fx-marcas">
              <span className="step-number">01</span>
              <h3 className="step-title" data-glitch="Elige tu moto">Elige tu moto</h3>
              <p className="step-desc">Selecciona marca, modelo y año para partir de una base exacta.</p>
            </div>
            <div className="step fx-marcas">
              <span className="step-number">02</span>
              <h3 className="step-title" data-glitch="Explora opciones">Explora opciones</h3>
              <p className="step-desc">Ve solo las piezas que fueron hechas para tu motocicleta.</p>
            </div>
            <div className="step fx-marcas">
              <span className="step-number">03</span>
              <h3 className="step-title" data-glitch="Pide tu cotización">Pide tu cotización</h3>
              <p className="step-desc">Guarda tu configuración y déjala en manos de la tienda.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}