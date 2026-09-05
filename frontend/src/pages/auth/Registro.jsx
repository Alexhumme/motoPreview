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

  async function manejarSubmit(e) {
    e.preventDefault();
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
    <div className="auth">
      <div className="auth__panel">
        <Link to="/" className="auth__marca">MotoPreview</Link>
        <h1 className="auth__titulo">Crea tu cuenta</h1>
        <p className="auth__subtitulo">Regístrate para guardar tus cotizaciones y hacerles seguimiento.</p>

        <form onSubmit={manejarSubmit} className="auth__form">
          <label>Nombre completo</label>
          <input
            value={usu_nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            required
          />

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
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
          />

          {error && <p className="auth__error">{error}</p>}

          <button type="submit" disabled={enviando} className="auth__boton">
            {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth__pie">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>

      <div className="auth__lateral">
        <span className="auth__lateral-titulo">Encuentra los<br />accesorios ideales<br />para tu moto</span>
        <span className="auth__lateral-texto">
          Filtra por modelo, compara precios y arma tu cotización en minutos.
        </span>
      </div>
    </div>
  );
}