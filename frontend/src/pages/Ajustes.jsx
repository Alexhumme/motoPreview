import { useCallback, useEffect, useState } from 'react';
import { MailCheck, Save } from 'lucide-react';
import { actualizarAjustesSitio, obtenerAjustesSitio } from '../services/auth';
import { mensajeError } from '../services/crud';
import './Ajustes.css';

export default function Ajustes() {
  const [requerida, setRequerida] = useState(true);
  const [guardada, setGuardada] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const ajustes = await obtenerAjustesSitio();
      setRequerida(ajustes.email_verification_required);
      setGuardada(true);
    } catch (err) {
      setError(mensajeError(err, 'No se pudieron cargar los ajustes del sitio.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardar(event) {
    event.preventDefault();
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      await actualizarAjustesSitio({ email_verification_required: requerida });
      setGuardada(true);
      setMensaje('Ajustes guardados correctamente.');
    } catch (err) {
      setError(mensajeError(err, 'No se pudieron guardar los ajustes.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="ajustes">
      <header className="ajustes-header">
        <div className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span>Panel / Ajustes</div>
        <h1 className="ajustes-title">Ajustes del sitio</h1>
        <p className="ajustes-help">Configura el comportamiento global de la plataforma.</p>
      </header>

      {cargando ? (
        <p className="ajustes-estado" role="status">Cargando ajustes...</p>
      ) : (
        <form className="card ajustes-form" onSubmit={guardar}>
          <div className="ajustes-opcion">
            <span className="ajustes-opcion-icon" aria-hidden="true"><MailCheck size={22} /></span>
            <div className="ajustes-opcion-texto">
              <label htmlFor="verificacion-correo">Exigir verificación de correo</label>
              <p id="verificacion-ayuda">
                Al activarlo, las cuentas nuevas no podrán iniciar sesión hasta verificar su correo.
                Al desactivarlo, podrán entrar sin SMTP y conservarán su estado de verificación pendiente.
              </p>
            </div>
            <input
              id="verificacion-correo"
              className="ajustes-switch"
              type="checkbox"
              role="switch"
              checked={requerida}
              onChange={(event) => {
                setRequerida(event.target.checked);
                setGuardada(false);
                setMensaje('');
              }}
              aria-describedby="verificacion-ayuda"
              disabled={guardando}
            />
          </div>

          {error && (
            <div className="ajustes-mensaje ajustes-mensaje--error" role="alert">
              <p>{error}</p>
              <button type="button" className="btn btn--outline btn--sm" onClick={cargar} disabled={guardando}>
                Reintentar
              </button>
            </div>
          )}
          {mensaje && <p className="ajustes-mensaje" role="status">{mensaje}</p>}

          <div className="ajustes-acciones">
            <button
              type="submit"
              className="btn btn--primary btn--sm"
              disabled={cargando || guardando || guardada || !!error}
            >
              <Save size={15} aria-hidden="true" />
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
