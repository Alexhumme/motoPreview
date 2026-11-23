import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/authContexto';
import { registrarCliente } from '../../services/auth';
import { ROL_CLIENTE, TIENDA_PRINCIPAL } from '../../utils/constants/roles';
import './Auth.css';
import SiteHeader from '../../components/buttons/SiteHeader';

export default function Registro() {
  const [usu_nombre, setNombre] = useState('');
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
      await registrarCliente({ usu_nombre, usu_email, password, id_rol: ROL_CLIENTE, id_tienda: TIENDA_PRINCIPAL });
      await login(usu_email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear la cuenta');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-page">
      <SiteHeader />

      <main className="auth-main">
        <div className="auth-card" data-reveal="fade">
          <header className="auth-header">
            <p className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span>Área personal</p>
            <h1 className="auth-title" data-reveal="lineas">Crea tu cuenta.</h1>
            <p className="auth-subtitle">Guarda tus ideas y vuelve a ellas cuando quieras.</p>
          </header>

          <form className="auth-form" onSubmit={manejarSubmit} noValidate data-reveal="grupo" data-reveal-delay="0.1">
            <div className="form-field">
              <label htmlFor="nombre" className="form-label">Nombre completo</label>
              <input
                id="nombre"
                type="text"
                className="form-input"
                value={usu_nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="¿Cómo te llamamos?"
                required
                autoComplete="name"
                disabled={enviando}
                aria-describedby={error ? 'auth-error' : undefined}
              />
            </div>

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
                placeholder="Mínimo 6 caracteres"
                minLength={6}
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
                ? 'Creando cuenta...'
                : <><UserPlus size={16} aria-hidden="true" /> Crear cuenta</>}
            </button>
          </form>

          <div className="auth-divider" aria-hidden="true">
            <span>o</span>
          </div>

          <Link to="/login" className="btn btn--outline btn--full">
            Ya tengo una cuenta
          </Link>

          <p className="auth-note">
            <ShieldCheck size={14} aria-hidden="true" /> Tus datos están protegidos.
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