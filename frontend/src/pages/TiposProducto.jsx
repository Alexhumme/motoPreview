import { useCallback, useEffect, useRef, useState } from 'react';
import { crearCrud, mensajeError } from '../services/crud';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import ModalConfirmacion from '../components/forms/ModalConfirmacion';
import './TiposProducto.css';

const crud = crearCrud('/tipos-producto');
const VACIO = { nombre: '', descripcion: '', accesorio: false, activo: true };

export default function TiposProducto() {
  const [tipos, setTipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setTipos(await crud.listar());
      setError('');
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cargar la lista de tipos.'));
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarRef = useRef();
  useEffect(() => {
    if (cargarRef.current === cargar) return;
    cargarRef.current = cargar;
    cargar();
  }, [cargar]);

  function abrirNuevo() {
    setEditandoId(null);
    setFormulario(VACIO);
    setError('');
    setModalAbierto(true);
  }

  function abrirEdicion(t) {
    setEditandoId(t.id_tipo_producto);
    setFormulario({ nombre: t.nombre, descripcion: t.descripcion || '', accesorio: t.accesorio, activo: t.activo });
    setError('');
    setModalAbierto(true);
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const datos = { nombre: formulario.nombre, descripcion: formulario.descripcion || null, accesorio: formulario.accesorio, activo: formulario.activo };
      if (editandoId) await crud.actualizar(editandoId, datos);
      else await crud.crear(datos);
      await cargar();
      setModalAbierto(false);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar el tipo.'));
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    if (!aEliminar) return;
    try {
      await crud.eliminar(aEliminar.id_tipo_producto);
      await cargar();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo eliminar el tipo.'));
    } finally {
      setAEliminar(null);
    }
  }

  if (cargando) return <div className="admin-loading">Cargando tipos...</div>;

  return (
    <div className="tipos-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Tipos de producto</h1>
          <p className="page-subtitle">Gestión de tipos. Marca "accesorio" para que aparezcan en el Configurador.</p>
        </div>
        <button className="btn btn--primary" onClick={abrirNuevo}>
          <Plus size={16} aria-hidden="true" /> Nuevo tipo
        </button>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Accesorio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tipos.map((t) => (
              <tr key={t.id_tipo_producto}>
                <td>{t.nombre}</td>
                <td>{t.descripcion || '—'}</td>
                <td>
                  <span className={`badge badge--${t.accesorio ? 'mint' : 'gray'}`}>{t.accesorio ? 'Sí' : 'No'}</span>
                </td>
                <td>
                  <span className={`badge badge--${t.activo ? 'mint' : 'gray'}`}>{t.activo ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td className="acciones">
                  <button className="btn btn--ghost btn--sm" onClick={() => abrirEdicion(t)} aria-label="Editar">
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                  <button className="btn btn--danger btn--sm" onClick={() => setAEliminar(t)} aria-label="Eliminar">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            {tipos.length === 0 && (
              <tr><td colSpan={5} className="empty">No hay tipos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <div className="modal-overlay" onClick={() => setModalAbierto(false)} role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 className="modal-title">{editandoId ? 'Editar tipo' : 'Nuevo tipo'}</h2>
              <button className="modal-close" onClick={() => setModalAbierto(false)} aria-label="Cerrar"><X size={16} /></button>
            </header>
            <form onSubmit={manejarSubmit} className="modal-form">
              <div className="form-field">
                <label className="form-label">Nombre</label>
                <input className="form-input" value={formulario.nombre} onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })} required disabled={guardando} />
              </div>
              <div className="form-field">
                <label className="form-label">Descripción</label>
                <textarea className="form-input" value={formulario.descripcion} onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })} rows={3} disabled={guardando} />
              </div>
              <div className="form-field">
                <label className="form-label">¿Es accesorio?</label>
                <select className="form-input form-select" value={formulario.accesorio} onChange={(e) => setFormulario({ ...formulario, accesorio: e.target.value === 'true' })} disabled={guardando}>
                  <option value={true}>Sí (aparece en Configurador)</option>
                  <option value={false}>No</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Estado</label>
                <select className="form-input form-select" value={formulario.activo} onChange={(e) => setFormulario({ ...formulario, activo: e.target.value === 'true' })} disabled={guardando}>
                  <option value={true}>Activo</option>
                  <option value={false}>Inactivo</option>
                </select>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <footer className="modal-footer">
                <button type="button" className="btn btn--ghost" onClick={() => setModalAbierto(false)} disabled={guardando}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
              </footer>
            </form>
          </div>
        </div>
      )}

      <ModalConfirmacion
        abierto={!!aEliminar}
        titulo="Eliminar tipo"
        mensaje={`¿Seguro que quieres eliminar el tipo "${aEliminar?.nombre}"?`}
        textoConfirmar="Sí, eliminar"
        peligroso
        onConfirmar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </div>
  );
}
