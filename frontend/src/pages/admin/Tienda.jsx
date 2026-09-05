import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { obtenerTienda, actualizarTienda } from '../../services/tiendas';
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

  async function cargar() {
    setCargando(true);
    try {
      const datos = await obtenerTienda(usuario.id_tienda);
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
  }

  useEffect(() => {
    cargar();
  }, [usuario]);

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

  if (cargando) return <p>Cargando datos de la tienda...</p>;
  if (!tienda) return <p>No se pudo cargar la tienda.</p>;

  const precioFormateado = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(tienda.plan_subscripcion?.precio_mensual || 0);

  return (
    <div className="tienda-admin">
      <h1 className="tienda-admin__titulo">Datos de la tienda</h1>

      <div className="tienda-admin__plan">
        <div>
          <span className="tienda-admin__plan-etiqueta">Plan actual</span>
          <span className="tienda-admin__plan-nombre">{tienda.plan_subscripcion?.plan_nombre}</span>
        </div>
        <div>
          <span className="tienda-admin__plan-etiqueta">Precio mensual</span>
          <span className="tienda-admin__plan-valor">{precioFormateado}</span>
        </div>
        <div>
          <span className="tienda-admin__plan-etiqueta">Límite de productos</span>
          <span className="tienda-admin__plan-valor">{tienda.plan_subscripcion?.limite_productos ?? 'Sin límite'}</span>
        </div>
        <div>
          <span className="tienda-admin__plan-etiqueta">Límite de usuarios</span>
          <span className="tienda-admin__plan-valor">{tienda.plan_subscripcion?.limite_usuarios ?? 'Sin límite'}</span>
        </div>
      </div>

      <div className="tienda-admin__datos">
        <div className="tienda-admin__datos-header">
          <h2>Información general</h2>
          {!editando && (
            <button className="tienda-admin__boton-editar" onClick={() => setEditando(true)}>Editar</button>
          )}
        </div>

        {!editando ? (
          <div className="tienda-admin__lista-datos">
            <div><span>Nombre</span><strong>{tienda.nombre_tienda}</strong></div>
            <div><span>NIT</span><strong>{tienda.nit || '—'}</strong></div>
            <div><span>Dirección</span><strong>{tienda.direccion_tienda || '—'}</strong></div>
            <div><span>Teléfono</span><strong>{tienda.telefono_tienda || '—'}</strong></div>
            <div><span>Email</span><strong>{tienda.email_tienda || '—'}</strong></div>
            <div><span>Estado</span><strong>{tienda.estado_tienda}</strong></div>
          </div>
        ) : (
          <form onSubmit={manejarSubmit} className="tienda-admin__form">
            <label>Nombre de la tienda</label>
            <input
              value={formulario.nombre_tienda}
              onChange={(e) => setFormulario({ ...formulario, nombre_tienda: e.target.value })}
              required
            />

            <label>NIT</label>
            <input
              value={formulario.nit}
              onChange={(e) => setFormulario({ ...formulario, nit: e.target.value })}
            />

            <label>Dirección</label>
            <input
              value={formulario.direccion_tienda}
              onChange={(e) => setFormulario({ ...formulario, direccion_tienda: e.target.value })}
            />

            <label>Teléfono</label>
            <input
              value={formulario.telefono_tienda}
              onChange={(e) => setFormulario({ ...formulario, telefono_tienda: e.target.value })}
            />

            <label>Email</label>
            <input
              type="email"
              value={formulario.email_tienda}
              onChange={(e) => setFormulario({ ...formulario, email_tienda: e.target.value })}
            />

            {error && <p className="tienda-admin__error">{error}</p>}

            <div className="tienda-admin__form-botones">
              <button type="button" onClick={() => setEditando(false)} className="tienda-admin__boton-cancelar">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className="tienda-admin__boton-guardar">
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}

        {exito && <p className="tienda-admin__exito">Datos actualizados correctamente.</p>}
      </div>
    </div>
  );
}