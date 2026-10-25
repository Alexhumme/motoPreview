import { useState } from 'react';
import { Link } from 'react-router-dom';
import { solicitarRecuperacion } from '../../services/auth';
import './Auth.css';

export default function RecuperarPassword() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function manejarSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await solicitarRecuperacion(email);
      setEnviado(true);
    } catch {
      setError('No se pudo procesar la solicitud, intenta de nuevo');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-nav">
        <Link to="/" className="brand" aria-label="MotoPreview home">
          <span className="brand-mark">↗</span>
          <span className="brand-text">Moto<span>Preview</span></span>
        </Link>
      </header>

      <main className="auth-main">
        <div className="auth-card">
          <header className="auth-header">
            <h1 className="auth-title">Recupera tu contraseña</h1>
            <p className="auth-subtitle">Te enviaremos un enlace a tu correo para crear una nueva.</p>
          </header>

          {enviado ? (
            <div className="auth-success">
              <span className="success-icon" aria-hidden="true">✓</span>
              <p>
                Si ese correo está registrado, revisa tu bandeja de entrada (y spam) —
                te enviamos un enlace para restablecer tu contraseña.
              </p>
            </div>
          ) : (
            <form className="auth-form" onSubmit={manejarSubmit} noValidate>
              <div className="form-field">
                <label htmlFor="email" className="form-label">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  required
                  autoComplete="email"
                  disabled={enviando}
                  aria-describedby={error ? 'auth-error' : undefined}
                />
              </div>

              {error && (
                <p id="auth-error" className="form-error" role="alert">{error}</p>
              )}

              <button
                type="submit"
                className="btn btn--primary btn--full"
                disabled={enviando}
              >
                {enviando ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>
          )}

          <p className="auth-footer-link">
            <Link to="/login" className="link link--muted">← Volver a iniciar sesión</Link>
          </p>
        </div>
      </main>

      <footer className="auth-footer">
        <span>MP / 2026</span>
        <span>Hecho para quienes siguen avanzando.</span>
      </footer>
    </div>
  );
}