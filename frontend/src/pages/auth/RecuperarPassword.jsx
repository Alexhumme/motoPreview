import { useState } from 'react';
import { Link } from 'react-router-dom';
import { solicitarRecuperacion } from '../../services/auth';
import './Login.css';

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
    } catch (err) {
      setError('No se pudo procesar la solicitud, intenta de nuevo');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__panel">
        <Link to="/" className="auth__marca">MotoPreview</Link>
        <h1 className="auth__titulo">Recupera tu contraseña</h1>
        <p className="auth__subtitulo">Te enviaremos un enlace a tu correo para crear una nueva.</p>

        {enviado ? (
          <p className="auth__exito">
            Si ese correo está registrado, revisa tu bandeja de entrada (y spam) — te enviamos un enlace para restablecer tu contraseña.
          </p>
        ) : (
          <form onSubmit={manejarSubmit} className="auth__form">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              required
            />

            {error && <p className="auth__error">{error}</p>}

            <button type="submit" disabled={enviando} className="auth__boton">
              {enviando ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
        )}

        <p className="auth__pie">
          <Link to="/login">← Volver a iniciar sesión</Link>
        </p>
      </div>

      <div className="auth__lateral">
        <span className="auth__lateral-titulo">Tranquilo,<br />te ayudamos<br />a recuperarla</span>
      </div>
    </div>
  );
}