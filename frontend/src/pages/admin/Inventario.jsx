import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { obtenerInventario, registrarMovimiento } from '../../services/inventario';
import { TIPOS_MOVIMIENTO } from '../../constants/tiposMovimiento';
import './Inventario.css';

export default function Inventario() {
  const { usuario } = useAuth();
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [formulario, setFormulario] = useState({ id_tipomov: '', mov_cantidad: '', observaciones: '' });
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');

async function cargarInventario() {
  setCargando(true);
  try {
    const datos = await obtenerInventario();
    setInventario(datos.filter((i) => i.id_tienda === usuario.id_tienda));
  } catch (err) {
    console.error(err);
  } finally {
    setCargando(false);
  }
}

  useEffect(() => {
    cargarInventario();
  }, [usuario]);

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

  if (cargando) return <p>Cargando inventario...</p>;

  return (
    <div>
      <h1 className="inventario__titulo">Inventario</h1>

      <table className="inventario__tabla">
        <thead>
          <tr>
            <th>Accesorio</th>
            <th>SKU</th>
            <th>Stock actual</th>
            <th>Stock mínimo</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {inventario.map((item) => (
            <tr key={item.id_inventario}>
              <td>{item.accesorio?.acc_nombre}</td>
              <td>{item.accesorio?.codigo_sku}</td>
              <td>{item.stock_actual}</td>
              <td>{item.stock_minimo}</td>
              <td>
                <span className={`inventario__estado inventario__estado--${item.estado_inventario}`}>
                  {item.estado_inventario}
                </span>
              </td>
              <td>
                <button className="inventario__boton" onClick={() => abrirFormulario(item)}>
                  Registrar movimiento
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {itemSeleccionado && (
        <div className="inventario__overlay" onClick={cerrarFormulario}>
          <div className="inventario__modal" onClick={(e) => e.stopPropagation()}>
            <h2>Movimiento — {itemSeleccionado.accesorio?.acc_nombre}</h2>
            <p className="inventario__stock-actual">Stock actual: {itemSeleccionado.stock_actual}</p>
            <form onSubmit={manejarSubmit}>
              <label>Tipo de movimiento</label>
              <select
                value={formulario.id_tipomov}
                onChange={(e) => setFormulario({ ...formulario, id_tipomov: e.target.value })}
                required
              >
                <option value="">Selecciona...</option>
                {TIPOS_MOVIMIENTO.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>

              <label>Cantidad</label>
              <input
                type="number"
                min="1"
                value={formulario.mov_cantidad}
                onChange={(e) => setFormulario({ ...formulario, mov_cantidad: e.target.value })}
                required
              />

              <label>Observaciones</label>
              <textarea
                value={formulario.observaciones}
                onChange={(e) => setFormulario({ ...formulario, observaciones: e.target.value })}
                rows={2}
              />

              {mensaje && <p className="inventario__mensaje-error">{mensaje}</p>}

              <div className="inventario__modal-botones">
                <button type="button" onClick={cerrarFormulario} className="inventario__boton-cancelar">Cancelar</button>
                <button type="submit" disabled={enviando} className="inventario__boton-confirmar">
                  {enviando ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}