import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { obtenerTienda, actualizarTienda } from '../services/tiendas';
import './Tienda.css';

export default function Tienda() {
  const { usuario } = useAuth();
  const [tienda, setTienda] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [formulario, setFormulario] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  const idTienda = usuario.id_tienda;

  const cargar = useCallback(async () => {
    try {
      const datos = await obtenerTienda(idTienda);
      setTienda(datos);
      setFormulario({
        nombre_tienda: datos.nombre_tienda,
        nit: datos.nit || '',
        direccion_tienda: datos.direccion_tienda || '',
        telefono_tienda: datos.telefono_tienda || '',
        email_tienda: datos.email_tienda || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, [idTienda]);

  useEffect(() => {
    async function refrescar() { await cargar(); }
    refrescar();
  }, [cargar]);

  async function manejarSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    setExito(false);
    try {
      await actualizarTienda(usuario.id_tienda, formulario);
      await cargar();
      setEditando(false);
      setExito(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar los datos de la tienda');
    } finally {
      setGuardando(false);
    }
  }

  const precioFormateado = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(tienda.plan_subscripcion?.precio_mensual || 0);

  if (cargando) {
    return (
      <div className="tienda" role="status" aria-live="polite">
        <div className="skeleton" style={{ height: '56px', width: '280px', marginBottom: 'var(--space-32)' }} />
        <div className="skeleton" style={{ height: '200px' }} />
        <div className="skeleton" style={{ height: '300px' }} />
      </div>
    );
  }
  if (!tienda) return <div className="tienda"><p style={{ color: 'var(--color-mist-gray)' }}>No se pudo cargar la tienda.</p></div>;

  return (
    <div className="tienda">
      <header className="tienda-header">
        <h1 className="tienda-title">Datos de la tienda</h1>
      </header>

      {/* Plan */}
      <section className="card tienda-plan" aria-labelledby="plan-title">
        <h2 id="plan-title" className="tienda-section-title">Plan de suscripción</h2>
        <div className="tienda-plan-grid">
          <div className="plan-item">
            <span className="plan-label">Plan actual</span>
            <strong className="plan-value">{tienda.plan_subscripcion?.plan_nombre || '—'}</strong>
          </div>
          <div className="plan-item">
            <span className="plan-label">Precio mensual</span>
            <strong className="plan-value">{precioFormateado}</strong>
          </div>
          <div className="plan-item">
            <span className="plan-label">Límite de productos</span>
            <strong className="plan-value">{tienda.plan_subscripcion?.limite_productos ?? 'Sin límite'}</strong>
          </div>
          <div className="plan-item">
            <span className="plan-label">Límite de usuarios</span>
            <strong className="plan-value">{tienda.plan_subscripcion?.limite_usuarios ?? 'Sin límite'}</strong>
          </div>
        </div>
      </section>

      {/* Datos generales */}
      <section className="card tienda-datos" aria-labelledby="datos-title">
        <header className="tienda-datos-header">
          <h2 id="datos-title" className="tienda-section-title">Información general</h2>
          {!editando && (
            <button className="btn btn--outline btn--sm" onClick={() => setEditando(true)}>Editar</button>
          )}
        </header>

        {!editando ? (
          <dl className="tienda-data-list">
            <div><dt>Nombre</dt><dd>{tienda.nombre_tienda}</dd></div>
            <div><dt>NIT</dt><dd>{tienda.nit || '—'}</dd></div>
            <div><dt>Dirección</dt><dd>{tienda.direccion_tienda || '—'}</dd></div>
            <div><dt>Teléfono</dt><dd>{tienda.telefono_tienda || '—'}</dd></div>
            <div><dt>Email</dt><dd>{tienda.email_tienda || '—'}</dd></div>
            <div>
              <dt>Estado</dt>
              <dd><span className="badge badge--mint">{tienda.estado_tienda}</span></dd>
            </div>
          </dl>
        ) : (
          <form onSubmit={manejarSubmit} className="tienda-form">
            <div className="form-field">
              <label htmlFor="nombre-tienda" className="form-label">Nombre de la tienda</label>
              <input
                id="nombre-tienda"
                type="text"
                className="form-input"
                value={formulario.nombre_tienda}
                onChange={(e) => setFormulario({ ...formulario, nombre_tienda: e.target.value })}
                required
                disabled={guardando}
              />
            </div>

            <div className="form-field">
              <label htmlFor="nit" className="form-label">NIT</label>
              <input
                id="nit"
                type="text"
                className="form-input"
                value={formulario.nit}
                onChange={(e) => setFormulario({ ...formulario, nit: e.target.value })}
                disabled={guardando}
              />
            </div>

            <div className="form-field">
              <label htmlFor="direccion" className="form-label">Dirección</label>
              <input
                id="direccion"
                type="text"
                className="form-input"
                value={formulario.direccion_tienda}
                onChange={(e) => setFormulario({ ...formulario, direccion_tienda: e.target.value })}
                disabled={guardando}
              />
            </div>

            <div className="form-field">
              <label htmlFor="telefono" className="form-label">Teléfono</label>
              <input
                id="telefono"
                type="tel"
                className="form-input"
                value={formulario.telefono_tienda}
                onChange={(e) => setFormulario({ ...formulario, telefono_tienda: e.target.value })}
                disabled={guardando}
              />
            </div>

            <div className="form-field">
              <label htmlFor="email-tienda" className="form-label">Email</label>
              <input
                id="email-tienda"
                type="email"
                className="form-input"
                value={formulario.email_tienda}
                onChange={(e) => setFormulario({ ...formulario, email_tienda: e.target.value })}
                disabled={guardando}
              />
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <footer className="modal-footer">
              <button type="button" className="btn btn--ghost" onClick={() => setEditando(false)} disabled={guardando}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </footer>
          </form>
        )}

        {exito && <p className="mensaje mensaje-exito" role="status">Datos actualizados correctamente.</p>}
      </section>
    </div>
  );
}