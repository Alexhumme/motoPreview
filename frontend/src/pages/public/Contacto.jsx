import { useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../../components/buttons/SiteHeader';
import Footer from '../../components/forms/Footer';
import './Contacto.css';

export default function Contacto() {
  const [form, setForm] = useState({ nombre: '', email: '', mensaje: '' });
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  function actualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function enviar(e) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim() || !form.mensaje.trim()) {
      setError('Completa todos los campos para enviar tu mensaje.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    setError('');
    setEnviado(true);
  }

  return (
    <div className="contacto-page">
      <SiteHeader />
      <main className="contacto-main">
        <section className="contacto-hero">
          <div className="eyebrow eyebrow--light"><span className="eyebrow-dot" aria-hidden="true"></span>Estamos para ayudarte</div>
          <h1 className="contacto-title">Contacto</h1>
          <p className="contacto-subtitle">
            ¿Tienes dudas sobre compatibilidad, cotizaciones o tu pedido? Escríbenos y te respondemos en menos de 24 horas.
          </p>
        </section>

        <section className="contacto-grid">
          <article className="card contacto-info">
            <h2 className="contacto-info-title">Hablemos</h2>
            <ul className="contacto-lista">
              <li>
                <span className="contacto-icono" aria-hidden="true">✉</span>
                <div>
                  <strong>Correo</strong>
                  <a href="mailto:contacto@motopreview.com">contacto@motopreview.com</a>
                </div>
              </li>
              <li>
                <span className="contacto-icono" aria-hidden="true">☎</span>
                <div>
                  <strong>Teléfono / WhatsApp</strong>
                  <a href="tel:+573000000000">+57 300 000 0000</a>
                </div>
              </li>
              <li>
                <span className="contacto-icono" aria-hidden="true">⌂</span>
                <div>
                  <strong>Horario</strong>
                  <span>Lunes a sábado, 8:00 a.m. – 6:00 p.m.</span>
                </div>
              </li>
              <li>
                <span className="contacto-icono" aria-hidden="true">⌂</span>
                <div>
                  <strong>Cobertura</strong>
                  <span>Envíos a toda Colombia. Tiendas asociadas en Medellín, Bogotá y Cali.</span>
                </div>
              </li>
            </ul>
            <div className="contacto-ayuda">
              <p>¿Buscas una pieza específica?</p>
              <Link to="/catalogo" className="btn btn--primary">Explorar el catálogo →</Link>
            </div>
          </article>

          <article className="card contacto-form-card">
            {enviado ? (
              <div className="contacto-exito">
                <span className="contacto-exito-icono" aria-hidden="true">✓</span>
                <h2>¡Mensaje enviado!</h2>
                <p>Gracias por escribirnos, {form.nombre}. Te responderemos pronto a {form.email}.</p>
                <button className="btn btn--ghost" onClick={() => { setEnviado(false); setForm({ nombre: '', email: '', mensaje: '' }); }}>
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form className="contacto-form" onSubmit={enviar} noValidate>
                <h2 className="contacto-form-title">Envíanos un mensaje</h2>
                {error && <p className="contacto-error" role="alert">{error}</p>}
                <label className="contacto-label">
                  Nombre
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => actualizar('nombre', e.target.value)}
                    placeholder="Tu nombre"
                    required
                  />
                </label>
                <label className="contacto-label">
                  Correo electrónico
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => actualizar('email', e.target.value)}
                    placeholder="tu@correo.com"
                    required
                  />
                </label>
                <label className="contacto-label">
                  Mensaje
                  <textarea
                    value={form.mensaje}
                    onChange={(e) => actualizar('mensaje', e.target.value)}
                    placeholder="Cuéntanos en qué podemos ayudarte..."
                    rows={5}
                    required
                  />
                </label>
                <button type="submit" className="btn btn--primary btn--full">Enviar mensaje</button>
              </form>
            )}
          </article>
        </section>
      </main>
      <Footer />
    </div>
  );
}
