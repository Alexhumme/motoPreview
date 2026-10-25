import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { obtenerInventario, registrarMovimiento } from '../services/inventario';
import { TIPOS_MOVIMIENTO } from '../utils/constants/tiposMovimiento';
import { ConPermiso } from '../components/menus/ConPermiso';
import './Inventario.css';

export default function Inventario() {
  const { usuario } = useAuth();
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [formulario, setFormulario] = useState({ id_tipomov: '', mov_cantidad: '', observaciones: '' });
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const idTienda = usuario.id_tienda;

  const cargarInventario = useCallback(async () => {
    try {
      const datos = await obtenerInventario(idTienda);
      setInventario(datos);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, [idTienda]);

  useEffect(() => {
    async function refrescar() { await cargarInventario(); }
    refrescar();
  }, [cargarInventario]);

  function abrirFormulario(item) {
    setItemSeleccionado(item);
    setFormulario({ id_tipomov: '', mov_cantidad: '', observaciones: '' });
    setMensaje('');
  }

  function cerrarFormulario() {
    setItemSeleccionado(null);
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    setMensaje('');
    try {
      await registrarMovimiento({
        id_inventario: itemSeleccionado.id_inventario,
        id_tipomov: formulario.id_tipomov,
        mov_cantidad: Number(formulario.mov_cantidad),
        observaciones: formulario.observaciones,
      });
      await cargarInventario();
      cerrarFormulario();
    } catch (err) {
      setMensaje(err.response?.data?.error || 'Error al registrar el movimiento');
    } finally {
      setEnviando(false);
    }
  }

  const estadoLabels = {
    normal: 'Normal',
    bajo: 'Stock bajo',
    agotado: 'Agotado'
  };

  if (cargando) {
    return (
      <div className="inventario" role="status" aria-live="polite">
        <div className="skeleton" style={{ height: '56px', width: '200px', marginBottom: 'var(--space-32)' }} />
        <div className="table-wrap"><div className="skeleton" style={{ height: '400px' }} /></div>
      </div>
    );
  }

  return (
    <div className="inventario">
      {/* Header */}
      <header className="inventario-header">
        <h1 className="inventario-title">Inventario</h1>
      </header>

      {/* Table */}
      <section className="table-wrap" aria-label="Listado de inventario">
        <table className="table">
          <thead>
            <tr>
              <th>Accesorio</th>
              <th>SKU</th>
              <th>Stock actual</th>
              <th>Stock mínimo</th>
              <th>Estado</th>
              <th style={{ width: '120px' }}></th>
            </tr>
          </thead>
          <tbody>
            {inventario.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-64)', color: 'var(--color-mist-gray)' }}>
                  No hay productos en inventario.
                </td>
              </tr>
            ) : (
              inventario.map((item) => (
                <tr key={item.id_inventario}>
                  <td>
                    <div className="item-name">
                      <strong>{item.accesorio?.acc_nombre || 'Sin nombre'}</strong>
                    </div>
                  </td>
                  <td>
                    <code className="item-sku">{item.accesorio?.codigo_sku || '—'}</code>
                  </td>
                  <td>
                    <span className="stock-value">{item.stock_actual}</span>
                  </td>
                  <td>
                    <span className="stock-min">{item.stock_minimo}</span>
                  </td>
                  <td>
                    <span className={`badge badge--${item.estado_inventario === 'normal' ? 'mint' : item.estado_inventario === 'bajo' ? 'violet' : 'pink'}`}>
                      {estadoLabels[item.estado_inventario] || item.estado_inventario}
                    </span>
                  </td>
                  <td>
                    <ConPermiso recurso="inventario" accion="actualizar" fallback={null}>
                      <button className="btn btn--outline btn--sm" onClick={() => abrirFormulario(item)}>
                        Movimiento
                      </button>
                    </ConPermiso>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Modal */}
      {itemSeleccionado && (
        <div className="modal-overlay" onClick={cerrarFormulario} role="dialog" aria-modal="true" aria-labelledby="movimiento-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="movimiento-title" className="modal-title">Movimiento — {itemSeleccionado.accesorio?.acc_nombre}</h2>
              <button className="modal-close" onClick={cerrarFormulario} aria-label="Cerrar">✕</button>
            </header>

            <form onSubmit={manejarSubmit} className="modal-form">
              <p className="stock-actual">Stock actual: <strong>{itemSeleccionado.stock_actual}</strong></p>

              <div className="form-field">
                <label htmlFor="tipo-mov" className="form-label">Tipo de movimiento</label>
                <select
                  id="tipo-mov"
                  className="form-input form-select"
                  value={formulario.id_tipomov}
                  onChange={(e) => setFormulario({ ...formulario, id_tipomov: e.target.value })}
                  required
                  disabled={enviando}
                >
                  <option value="">Selecciona...</option>
                  {TIPOS_MOVIMIENTO.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="cantidad" className="form-label">Cantidad</label>
                <input
                  id="cantidad"
                  type="number"
                  min="1"
                  className="form-input"
                  value={formulario.mov_cantidad}
                  onChange={(e) => setFormulario({ ...formulario, mov_cantidad: e.target.value })}
                  required
                  disabled={enviando}
                />
              </div>

              <div className="form-field">
                <label htmlFor="observaciones" className="form-label">Observaciones</label>
                <textarea
                  id="observaciones"
                  className="form-input"
                  value={formulario.observaciones}
                  onChange={(e) => setFormulario({ ...formulario, observaciones: e.target.value })}
                  rows={3}
                  disabled={enviando}
                />
              </div>

              {mensaje && <p className="form-error" role="alert">{mensaje}</p>}

              <footer className="modal-footer">
                <button type="button" className="btn btn--ghost" onClick={cerrarFormulario} disabled={enviando}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={enviando}>
                  {enviando ? 'Guardando...' : 'Confirmar'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}