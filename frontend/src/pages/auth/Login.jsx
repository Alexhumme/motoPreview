import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROL_ADMIN, ROL_VENDEDOR } from '../../utils/constants/roles';
import './Login.css';

export default function Login() {
  const [usu_email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function manejarSubmit(event) {
    event.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const usuario = await login(usu_email, password);
      navigate(usuario.id_rol === ROL_ADMIN || usuario.id_rol === ROL_VENDEDOR ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciales inválidas');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-page">
      <header className="login-nav">
        <Link to="/" className="login-brand" aria-label="MotoPreview home">
          <span className="brand-mark">↗</span>
          <span className="brand-text">Moto<span>Preview</span></span>
        </Link>
        <nav className="login-nav__actions">
          <Link to="/registro" className="btn btn--ghost">Crear cuenta</Link>
        </nav>
      </header>

      <main className="login-main">
        <div className="login-card">
          <div className="login-header">
            <p className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span>Área personal</p>
            <h1 className="login-title">Bienvenido de vuelta.</h1>
            <p className="login-subtitle">Accede para ver tus configuraciones y cotizaciones.</p>
          </div>

          <form className="login-form" onSubmit={manejarSubmit} noValidate>
            <div className="form-field">
              <label htmlFor="email" className="form-label">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={usu_email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                autoComplete="email"
                disabled={enviando}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>

            <div className="form-field">
              <label htmlFor="password" className="form-label">Contraseña</label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={enviando}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" className="checkbox-input" />
                <span className="checkbox-text">Recordarme</span>
              </label>
              <Link to="/recuperar" className="link link--forgot">¿La olvidaste?</Link>
            </div>

            {error && (
              <p id="login-error" className="form-error" role="alert">{error}</p>
            )}

            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={enviando}
            >
              {enviando ? 'Ingresando...' : 'Iniciar sesión →'}
            </button>
          </form>

          <div className="login-divider" aria-hidden="true">
            <span>o</span>
          </div>

          <Link to="/registro" className="btn btn--outline btn--full">
            Crear una cuenta gratis
          </Link>

          <p className="login-note">✓ Tus datos están protegidos.</p>
        </div>
      </main>

      <footer className="login-footer">
        <span>MP / 2026</span>
        <span>Hecho para quienes siguen avanzando.</span>
      </footer>
    </div>
  );
}