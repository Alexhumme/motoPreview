import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { verificarCorreo } from '../../services/auth';
import './Login.css';

export default function VerificarCorreo() {
  const { token } = useParams();
  const [estado, setEstado] = useState('verificando'); // verificando | exito | error

  useEffect(() => {
    verificarCorreo(token)
      .then(() => setEstado('exito'))
      .catch(() => setEstado('error'));
  }, [token]);

  return (
    <div className="auth">
      <div className="auth__panel">
        <Link to="/" className="auth__marca">MotoPreview</Link>
        <h1 className="auth__titulo">Verificación de correo</h1>

        {estado === 'verificando' && <p className="auth__subtitulo">Confirmando tu correo...</p>}
        {estado === 'exito' && (
          <p className="auth__exito">¡Tu correo quedó verificado! Ya puedes iniciar sesión con normalidad.</p>
        )}
        {estado === 'error' && (
          <p className="auth__error">Este enlace no es válido o ya fue usado.</p>
        )}

        <p className="auth__pie">
          <Link to="/login">Ir a iniciar sesión</Link>
        </p>
      </div>

      <div className="auth__lateral">
        <span className="auth__lateral-titulo">Un paso más</span>
      </div>
    </div>
  );
}