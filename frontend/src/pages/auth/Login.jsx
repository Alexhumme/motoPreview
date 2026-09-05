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

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const usuarioLogueado = await login(usu_email, password);
      if (usuarioLogueado.id_rol === ROL_ADMIN || usuarioLogueado.id_rol === ROL_VENDEDOR) {
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
    <div className="auth">
      <div className="auth__panel">
        <Link to="/" className="auth__marca">MotoPreview</Link>
        <h1 className="auth__titulo">Bienvenido de nuevo</h1>
        <p className="auth__subtitulo">Inicia sesión para ver tus cotizaciones o gestionar tu tienda.</p>

        <form onSubmit={manejarSubmit} className="auth__form">
          <label>Correo electrónico</label>
          <input
            type="email"
            value={usu_email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            required
          />

          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <p className="auth__error">{error}</p>}

          <button type="submit" disabled={enviando} className="auth__boton">
            {enviando ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
       <p className="auth__olvide">
            <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
           </p>

        <p className="auth__pie">
          ¿No tienes cuenta? <Link to="/registro">Crea una gratis</Link>
        </p>
      </div>

      <div className="auth__lateral">
        <span className="auth__lateral-titulo">Personaliza tu moto,<br />sin salir de casa</span>
        <span className="auth__lateral-texto">
          Explora accesorios compatibles con tu modelo, arma tu configuración ideal y envía tu cotización directo a la tienda.
        </span>
      </div>
    </div>
  );
}