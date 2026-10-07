import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROL_ADMIN, ROL_VENDEDOR } from '../../constants/roles';
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
    <div className="auth-page">
      <div className="auth-side">
        <Link to="/" className="brand brand--light"><span className="brand-mark">↗</span><span>Moto<span>Preview</span></span></Link>
        <div className="auth-side__copy"><div className="eyebrow eyebrow--light"><span className="eyebrow-dot" /> Tu próxima ruta empieza aquí</div><h1>Hazla tuya<br /><em>desde el primer giro.</em></h1><p>Guarda configuraciones, recibe cotizaciones y encuentra piezas que hablan el mismo idioma que tu moto.</p></div>
        <div className="auth-side__footer"><span>MP / 2026</span><span>Hecho para quienes siguen avanzando.</span></div>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-form">
          <div className="eyebrow"><span className="eyebrow-dot" /> Área personal</div>
          <h2>Bienvenido de vuelta.</h2><p>Accede para ver tus configuraciones y cotizaciones.</p>
          <form onSubmit={manejarSubmit}>
            <label>Correo electrónico<input type="email" value={usu_email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required /></label>
            <label>Contraseña<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /></label>
            <div className="form-options"><label className="check-label"><input type="checkbox" /> Recordarme</label><Link to="/recuperar">¿La olvidaste?</Link></div>
            {error && <p className="auth-error">{error}</p>}
            <button className="button button--accent button--full" type="submit" disabled={enviando}>{enviando ? 'Ingresando...' : 'Iniciar sesión →'}</button>
          </form>
          <div className="auth-divider"><span>o</span></div>
          <Link to="/registro" className="button button--outline button--full">Crear una cuenta gratis</Link>
          <p className="auth-note">✓ Tus datos están protegidos.</p>
        </div>
      </div>
    </div>
  );
}