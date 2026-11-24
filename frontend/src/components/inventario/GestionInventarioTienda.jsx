import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, History, Pencil, X } from 'lucide-react';
import DataTable from '../tables/DataTable';
import { usePermiso } from '../../context/usePermiso';
import { actualizarInventario, obtenerInventario, obtenerMovimientos, registrarMovimiento } from '../../services/inventario';
import { mensajeError } from '../../services/crud';
import { TIPOS_MOVIMIENTO } from '../../utils/constants/tiposMovimiento';
import '../../pages/Inventario.css';

const formatoCOP = (valor) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(Number(valor) || 0);

function nombreProducto(item) {
  return item.producto?.nombre || item.accesorio?.acc_nombre || 'Sin nombre';
}

export default function GestionInventarioTienda({ idTienda }) {
  const { tienePermiso } = usePermiso();
  const puedeLeer = tienePermiso('inventario', 'leer');
  const puedeEditar = tienePermiso('inventario', 'actualizar');
  const puedeMover = tienePermiso('inventario', 'crear');
  const [filas, setFilas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [error, setError] = useState('');
  const [errorHistorial, setErrorHistorial] = useState('');
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState({ stock_minimo: 0, precio: '' });
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState('');
  const [movimiento, setMovimiento] = useState(null);
  const [formularioMovimiento, setFormularioMovimiento] = useState({ id_tipomov: '', mov_cantidad: '', observaciones: '' });

  const cargar = useCallback(async () => {
    if (!puedeLeer) {
      setCargando(false);
      return;
    }
    setCargando(true);
    setError('');
    try {
      setFilas(await obtenerInventario(idTienda));
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cargar el inventario de la tienda.'));
    } finally {
      setCargando(false);
    }
  }, [idTienda, puedeLeer]);

  useEffect(() => { cargar(); }, [cargar]);

  const columnas = useMemo(() => [
    { clave: 'producto', etiqueta: 'Producto', valor: nombreProducto },
    { clave: 'stock_actual', etiqueta: 'Stock', valor: (item) => item.stock_actual },
    { clave: 'stock_minimo', etiqueta: 'Mínimo', valor: (item) => item.stock_minimo },
    { clave: 'estado', etiqueta: 'Estado', valor: (item) => item.estado_inventario, filtrable: true },
    { clave: 'precio', etiqueta: 'Precio', valor: (item) => formatoCOP(item.precio) },
  ], []);

  const columnasMovimientos = useMemo(() => [
    { clave: 'fecha', etiqueta: 'Fecha', valor: (item) => new Date(item.fecha_movimiento).toLocaleString('es-CO') },
    { clave: 'producto', etiqueta: 'Producto', valor: (item) => nombreProducto(item) },
    { clave: 'tipo', etiqueta: 'Tipo', valor: (item) => item.tipo?.tipomov_nombre || '—', filtrable: true },
    { clave: 'cantidad', etiqueta: 'Cantidad', valor: (item) => item.mov_cantidad },
    { clave: 'usuario', etiqueta: 'Usuario', valor: (item) => item.usuario?.usu_nombre || 'Sistema' },
    { clave: 'observaciones', etiqueta: 'Observaciones', valor: (item) => item.observaciones || '' },
  ], []);

  function abrirEdicion(item) {
    setEditando(item);
    setFormulario({ stock_minimo: item.stock_minimo, precio: item.precio ?? '' });
    setErrorFormulario('');
  }

  async function guardarEdicion(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrorFormulario('');
    try {
      const actualizado = await actualizarInventario(editando.id_inventario, {
        stock_minimo: Number(formulario.stock_minimo),
        precio: formulario.precio === '' ? null : Number(formulario.precio),
      });
      setFilas((previas) => previas.map((item) => item.id_inventario === actualizado.id_inventario ? actualizado : item));
      setEditando(null);
    } catch (err) {
      setErrorFormulario(mensajeError(err, 'No se pudo actualizar el inventario.'));
    } finally {
      setGuardando(false);
    }
  }

  function abrirMovimiento(item) {
    setMovimiento(item);
    setFormularioMovimiento({ id_tipomov: '', mov_cantidad: '', observaciones: '' });
    setErrorFormulario('');
  }

  async function guardarMovimiento(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrorFormulario('');
    try {
      const respuesta = await registrarMovimiento({
        id_inventario: movimiento.id_inventario,
        id_tipomov: formularioMovimiento.id_tipomov,
        mov_cantidad: Number(formularioMovimiento.mov_cantidad),
        observaciones: formularioMovimiento.observaciones || null,
      });
      setFilas((previas) => previas.map((item) => item.id_inventario === movimiento.id_inventario ? respuesta.inventarioActualizado : item));
      setMovimiento(null);
      if (historialAbierto) await cargarHistorial();
    } catch (err) {
      setErrorFormulario(mensajeError(err, 'No se pudo registrar el movimiento.'));
    } finally {
      setGuardando(false);
    }
  }

  async function cargarHistorial() {
    setHistorialAbierto(true);
    setCargandoHistorial(true);
    setErrorHistorial('');
    try {
      setMovimientos(await obtenerMovimientos(null, idTienda));
    } catch (err) {
      setErrorHistorial(mensajeError(err, 'No se pudo cargar el historial de movimientos.'));
    } finally {
      setCargandoHistorial(false);
    }
  }

  if (!puedeLeer) return null;

  return (
    <section className="card tienda-inventario" aria-label="Inventario de la tienda">
      <header className="card-head">
        <span><small>Existencias</small><strong>Inventario de la tienda</strong></span>
        {puedeLeer && <button type="button" className="btn btn--outline btn--sm" onClick={cargarHistorial}><History size={15} /> Ver movimientos</button>}
      </header>
      <p className="tiendas-help">El stock se modifica mediante movimientos para conservar su trazabilidad.</p>
      <DataTable
        columnas={columnas}
        filas={filas}
        claveFila="id_inventario"
        cargando={cargando}
        error={error}
        onReintentar={cargar}
        vacio="Esta tienda todavía no tiene productos en inventario."
        acciones={(item) => (
          <div className="inventario-acciones">
            {puedeEditar && <button type="button" className="btn btn--ghost btn--sm" onClick={() => abrirEdicion(item)}><Pencil size={14} /> Editar</button>}
            {puedeMover && <button type="button" className="btn btn--outline btn--sm" onClick={() => abrirMovimiento(item)}><ArrowRightLeft size={14} /> Movimiento</button>}
          </div>
        )}
      />

      {historialAbierto && (
        <div className="tienda-historial">
          <header className="card-head">
            <span><small>Trazabilidad</small><strong>Movimientos de inventario</strong></span>
            <button type="button" className="modal-close" aria-label="Cerrar historial" onClick={() => setHistorialAbierto(false)}><X size={18} /></button>
          </header>
          <DataTable
            columnas={columnasMovimientos}
            filas={movimientos}
            claveFila="id_movimiento"
            cargando={cargandoHistorial}
            error={errorHistorial}
            onReintentar={cargarHistorial}
            vacio="Todavía no hay movimientos registrados."
          />
        </div>
      )}

      {editando && (
        <div className="modal-overlay" onClick={() => setEditando(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="editar-inventario-title" onClick={(evento) => evento.stopPropagation()}>
            <header className="modal-header">
              <h2 id="editar-inventario-title" className="modal-title">Editar inventario — {nombreProducto(editando)}</h2>
              <button type="button" className="modal-close" aria-label="Cerrar" onClick={() => setEditando(null)}><X size={18} /></button>
            </header>
            <form className="modal-form" onSubmit={guardarEdicion}>
              <p className="stock-actual">Stock actual: <strong>{editando.stock_actual}</strong>. Usa un movimiento para cambiarlo.</p>
              <div className="inventario-fila">
                <div className="form-field">
                  <label className="form-label" htmlFor="stock-minimo-tienda">Stock mínimo</label>
                  <input id="stock-minimo-tienda" className="form-input" type="number" min="0" required value={formulario.stock_minimo} onChange={(evento) => setFormulario({ ...formulario, stock_minimo: evento.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="precio-inventario-tienda">Precio (COP)</label>
                  <input id="precio-inventario-tienda" className="form-input" type="number" min="0" step="0.01" value={formulario.precio} onChange={(evento) => setFormulario({ ...formulario, precio: evento.target.value })} />
                </div>
              </div>
              {errorFormulario && <p className="form-error" role="alert">{errorFormulario}</p>}
              <footer className="modal-footer">
                <button type="button" className="btn btn--ghost" disabled={guardando} onClick={() => setEditando(null)}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {movimiento && (
        <div className="modal-overlay" onClick={() => setMovimiento(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="movimiento-tienda-title" onClick={(evento) => evento.stopPropagation()}>
            <header className="modal-header">
              <h2 id="movimiento-tienda-title" className="modal-title">Movimiento — {nombreProducto(movimiento)}</h2>
              <button type="button" className="modal-close" aria-label="Cerrar" onClick={() => setMovimiento(null)}><X size={18} /></button>
            </header>
            <form className="modal-form" onSubmit={guardarMovimiento}>
              <p className="stock-actual">Stock actual: <strong>{movimiento.stock_actual}</strong></p>
              <div className="form-field">
                <label className="form-label" htmlFor="tipo-movimiento-tienda">Tipo de movimiento</label>
                <select id="tipo-movimiento-tienda" className="form-input" required value={formularioMovimiento.id_tipomov} onChange={(evento) => setFormularioMovimiento({ ...formularioMovimiento, id_tipomov: evento.target.value })}>
                  <option value="">Selecciona...</option>
                  {TIPOS_MOVIMIENTO.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="cantidad-movimiento-tienda">Cantidad</label>
                <input id="cantidad-movimiento-tienda" className="form-input" type="number" min="1" required value={formularioMovimiento.mov_cantidad} onChange={(evento) => setFormularioMovimiento({ ...formularioMovimiento, mov_cantidad: evento.target.value })} />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="observaciones-movimiento-tienda">Observaciones</label>
                <textarea id="observaciones-movimiento-tienda" className="form-input" rows={3} value={formularioMovimiento.observaciones} onChange={(evento) => setFormularioMovimiento({ ...formularioMovimiento, observaciones: evento.target.value })} />
              </div>
              {errorFormulario && <p className="form-error" role="alert">{errorFormulario}</p>}
              <footer className="modal-footer">
                <button type="button" className="btn btn--ghost" disabled={guardando} onClick={() => setMovimiento(null)}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Confirmar'}</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
