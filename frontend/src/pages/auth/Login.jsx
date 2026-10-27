import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContexto';
import { ROL_ADMIN, ROL_SUPERADMIN, ROL_VENDEDOR } from '../../utils/constants/roles';
import './Auth.css';

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
      // Superadmin → consola de seguridad; personal → panel; cliente → inicio
      if (usuario.id_rol === ROL_SUPERADMIN) {
        navigate('/admin/permisos');
      } else if (usuario.id_rol === ROL_ADMIN || usuario.id_rol === ROL_VENDEDOR) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciales inválidas');
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
            <p className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span>Área personal</p>
            <h1 className="auth-title">Bienvenido de vuelta.</h1>
            <p className="auth-subtitle">Accede para ver tus configuraciones y cotizaciones.</p>
          </header>

          <form className="auth-form" onSubmit={manejarSubmit} noValidate>
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
                aria-describedby={error ? 'auth-error' : undefined}
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
                aria-describedby={error ? 'auth-error' : undefined}
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
              <p id="auth-error" className="form-error" role="alert">{error}</p>
            )}

            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={enviando}
            >
              {enviando ? 'Ingresando...' : 'Iniciar sesión →'}
            </button>
          </form>

          <div className="auth-divider" aria-hidden="true">
            <span>o</span>
          </div>

          <Link to="/registro" className="btn btn--outline btn--full">
            Crear una cuenta gratis
          </Link>

          <p className="auth-note">✓ Tus datos están protegidos.</p>
        </div>
      </main>

      <footer className="auth-footer">
        <span>MP / 2026</span>
        <span>Hecho para quienes siguen avanzando.</span>
      </footer>
    </div>
  );
}
