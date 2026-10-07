import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { restablecerPassword } from '../../services/auth';
import './Login.css';

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
    <div className="auth">
      <div className="auth__panel">
        <Link to="/" className="auth__marca">MotoPreview</Link>
        <h1 className="auth__titulo">Crea una nueva contraseña</h1>

        {exito ? (
          <p className="auth__exito">¡Listo! Tu contraseña fue actualizada. Redirigiendo al inicio de sesión...</p>
        ) : (
          <form onSubmit={manejarSubmit} className="auth__form">
            <label>Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />

            <label>Confirma la contraseña</label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
            />

            {error && <p className="auth__error">{error}</p>}

            <button type="submit" disabled={enviando} className="auth__boton">
              {enviando ? 'Guardando...' : 'Restablecer contraseña'}
            </button>
          </form>
        )}
      </div>

      <div className="auth__lateral">
        <span className="auth__lateral-titulo">Casi listo</span>
      </div>
    </div>
  );
}