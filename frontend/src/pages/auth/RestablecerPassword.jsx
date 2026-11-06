import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { restablecerPassword } from '../../services/auth';
import './Auth.css';
import SiteHeader from '../../components/buttons/SiteHeader';

export default function RestablecerPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setEnviando(true);
    try {
      await restablecerPassword(token, password);
      setExito(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo restablecer la contraseña');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-page">
      <SiteHeader />

      <main className="auth-main">
        <div className="auth-card">
          <header className="auth-header">
            <h1 className="auth-title">Crea una nueva contraseña</h1>
          </header>

          {exito ? (
            <div className="auth-success">
              <span className="success-icon" aria-hidden="true"><CheckCircle2 size={26} /></span>
              <p>¡Listo! Tu contraseña fue actualizada. Redirigiendo al inicio de sesión...</p>
            </div>
          ) : (
            <form className="auth-form" onSubmit={manejarSubmit} noValidate>
              <div className="form-field">
                <label htmlFor="password" className="form-label">Nueva contraseña</label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoComplete="new-password"
                  disabled={enviando}
                  aria-describedby={error ? 'auth-error' : undefined}
                />
              </div>

              <div className="form-field">
                <label htmlFor="confirmar" className="form-label">Confirma la contraseña</label>
                <input
                  id="confirmar"
                  type="password"
                  className="form-input"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  required
                  autoComplete="new-password"
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
                {enviando
                  ? 'Guardando...'
                  : <><KeyRound size={16} aria-hidden="true" /> Restablecer contraseña</>}
              </button>
            </form>
          )}

          <p className="auth-footer-link">
            <Link to="/login" className="link link--muted">
              <ArrowLeft size={14} aria-hidden="true" /> Volver a iniciar sesión
            </Link>
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