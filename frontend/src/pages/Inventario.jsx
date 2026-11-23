import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/authContexto';
import { obtenerInventario, registrarMovimiento } from '../services/inventario';
import { TIPOS_MOVIMIENTO } from '../utils/constants/tiposMovimiento';
import { ConPermiso } from '../components/menus/ConPermiso';
import DataTable from '../components/tables/DataTable';
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

  const cargarInventarioRef = useRef();
  useEffect(() => {
    if (cargarInventarioRef.current === cargarInventario) return;
    cargarInventarioRef.current = cargarInventario;
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

  const columnas = [
    {
      clave: 'accesorio',
      etiqueta: 'Accesorio',
      valor: (item) => item.accesorio?.acc_nombre || 'Sin nombre',
      render: (item) => <strong>{item.accesorio?.acc_nombre || 'Sin nombre'}</strong>,
    },
    {
      clave: 'sku',
      etiqueta: 'SKU',
      valor: (item) => item.accesorio?.codigo_sku || '',
      render: (item) => <code className="item-sku">{item.accesorio?.codigo_sku || '—'}</code>,
    },
    {
      clave: 'stock_actual',
      etiqueta: 'Stock actual',
      render: (item) => <span className="stock-value">{item.stock_actual}</span>,
    },
    {
      clave: 'stock_minimo',
      etiqueta: 'Stock mínimo',
      render: (item) => <span className="stock-min">{item.stock_minimo}</span>,
    },
    {
      clave: 'estado_inventario',
      etiqueta: 'Estado',
      filtrable: true,
      valor: (item) => estadoLabels[item.estado_inventario] || item.estado_inventario,
      render: (item) => (
        <span className={`badge badge--${item.estado_inventario === 'normal' ? 'mint' : item.estado_inventario === 'bajo' ? 'violet' : 'pink'}`}>
          {estadoLabels[item.estado_inventario] || item.estado_inventario}
        </span>
      ),
    },
  ];

  return (
    <div className="inventario">
      {/* Header */}
      <header className="inventario-header">
        <h1 className="inventario-title">Inventario</h1>
      </header>

      <DataTable
        columnas={columnas}
        filas={inventario}
        claveFila="id_inventario"
        cargando={cargando}
        vacio="No hay productos en inventario."
        acciones={(item) => (
          <ConPermiso recurso="inventario" accion="actualizar" fallback={null}>
            <button className="btn btn--outline btn--sm" onClick={() => abrirFormulario(item)}>
              Movimiento
            </button>
          </ConPermiso>
        )}
      />

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