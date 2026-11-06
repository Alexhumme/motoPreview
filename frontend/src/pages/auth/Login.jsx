import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/authContexto';
import { ROL_ADMIN, ROL_SUPERADMIN, ROL_VENDEDOR } from '../../utils/constants/roles';
import './Auth.css';
import SiteHeader from '../../components/buttons/SiteHeader';

function generarCaptcha() {
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * 9) + 1;
  let b = Math.floor(Math.random() * 9) + 1;
  if (op === '-' && b > a) [a, b] = [b, a]; // evitar negativos
  const resultado = op === '+' ? a + b : op === '-' ? a - b : a * b;
  return { a, b, op, resultado };
}

export default function Login() {
  const [usu_email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [captcha, setCaptcha] = useState(generarCaptcha);
  const [captchaInput, setCaptchaInput] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const refrescarCaptcha = useCallback(() => {
    setCaptcha(generarCaptcha());
    setCaptchaInput('');
  }, []);

  async function manejarSubmit(event) {
    event.preventDefault();
    setError('');
    if (parseInt(captchaInput, 10) !== captcha.resultado) {
      setError('La verificación (captcha) es incorrecta.');
      refrescarCaptcha();
      return;
    }
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
      refrescarCaptcha();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-page">
      <SiteHeader/>

      <main className="auth-main">
        <div className="auth-card" data-reveal="fade">
          <header className="auth-header">
            <p className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span>Área personal</p>
            <h1 className="auth-title" data-reveal="lineas">Bienvenido de vuelta.</h1>
            <p className="auth-subtitle">Accede para ver tus configuraciones y cotizaciones.</p>
          </header>

          <form className="auth-form" onSubmit={manejarSubmit} noValidate data-reveal="grupo" data-reveal-delay="0.1">
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
              <Link to="/recuperar" className="link link--forgot" data-scramble-hover>¿La olvidaste?</Link>
            </div>

            <div className="form-field">
              <label htmlFor="captcha" className="form-label">
                Verificación: ¿cuánto es {captcha.a} {captcha.op} {captcha.b}?
              </label>
              <input
                id="captcha"
                type="text"
                inputMode="numeric"
                className="form-input"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                placeholder="Resultado"
                required
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
                ? 'Ingresando...'
                : <><LogIn size={16} aria-hidden="true" /> Iniciar sesión</>}
            </button>
          </form>

          <div className="auth-divider" aria-hidden="true">
            <span>o</span>
          </div>

          <Link to="/registro" className="btn btn--outline btn--full">
            Crear una cuenta gratis
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
