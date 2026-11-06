import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { verificarCorreo } from '../../services/auth';
import './Auth.css';
import SiteHeader from '../../components/buttons/SiteHeader';

export default function VerificarCorreo() {
  const { token } = useParams();
  const [estado, setEstado] = useState('verificando');

  useEffect(() => {
    verificarCorreo(token)
      .then(() => setEstado('exito'))
      .catch(() => setEstado('error'));
  }, [token]);

  return (
    <div className="auth-page">
      <SiteHeader />

      <main className="auth-main">
        <div className="auth-card">
          <header className="auth-header">
            <h1 className="auth-title">Verificación de correo</h1>
          </header>

          {estado === 'verificando' && (
            <div className="auth-loading" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true"></div>
              <p>Confirmando tu correo...</p>
            </div>
          )}

          {estado === 'exito' && (
            <div className="auth-success">
              <span className="success-icon" aria-hidden="true"><CheckCircle2 size={26} /></span>
              <p>¡Tu correo quedó verificado! Ya puedes iniciar sesión con normalidad.</p>
            </div>
          )}

          {estado === 'error' && (
            <div className="auth-error-state">
              <span className="error-icon" aria-hidden="true"><XCircle size={26} /></span>
              <p>Este enlace no es válido o ya fue usado.</p>
            </div>
          )}

          <p className="auth-footer-link">
            <Link to="/login" className="btn btn--outline btn--full">Ir a iniciar sesión</Link>
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