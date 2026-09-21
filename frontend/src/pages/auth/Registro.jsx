import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { registrarCliente } from '../../services/auth';
import { ROL_CLIENTE, TIENDA_PRINCIPAL } from '../../constants/roles';
import './Login.css';

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
      <div className="auth-side">
        <Link to="/" className="brand brand--light"><span className="brand-mark">↗</span><span>Moto<span>Preview</span></span></Link>
        <div className="auth-side__copy"><div className="eyebrow eyebrow--light"><span className="eyebrow-dot" /> Tu próxima ruta empieza aquí</div><h1>Hazla tuya<br /><em>desde el primer giro.</em></h1><p>Guarda configuraciones, recibe cotizaciones y encuentra piezas que hablan el mismo idioma que tu moto.</p></div>
        <div className="auth-side__footer"><span>MP / 2026</span><span>Hecho para quienes siguen avanzando.</span></div>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-form">
          <div className="eyebrow"><span className="eyebrow-dot" /> Área personal</div>
          <h2>Crea tu cuenta.</h2><p>Guarda tus ideas y vuelve a ellas cuando quieras.</p>
          <form onSubmit={manejarSubmit}>
            <label>Nombre completo<input type="text" value={usu_nombre} onChange={(e) => setNombre(e.target.value)} placeholder="¿Cómo te llamamos?" required /></label>
            <label>Correo electrónico<input type="email" value={usu_email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required /></label>
            <label>Contraseña<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required /></label>
            {error && <p className="auth-error">{error}</p>}
            <button className="button button--accent button--full" type="submit" disabled={enviando}>{enviando ? 'Creando cuenta...' : 'Crear cuenta →'}</button>
          </form>
          <div className="auth-divider"><span>o</span></div>
          <Link to="/login" className="button button--outline button--full">Ya tengo una cuenta</Link>
          <p className="auth-note">✓ Tus datos están protegidos.</p>
        </div>
      </div>
    </div>
  );
}