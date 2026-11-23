import { useCallback, useEffect, useRef, useState } from 'react';
import { crearCrud, mensajeError } from '../services/crud';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import ModalConfirmacion from '../components/forms/ModalConfirmacion';
import './Marcas.css';

const crud = crearCrud('/marcas-producto');
const VACIO = { nombre: '', logo: '', activo: true };

export default function Marcas() {
  const [marcas, setMarcas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setMarcas(await crud.listar());
      setError('');
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cargar la lista de marcas.'));
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

  function abrirEdicion(m) {
    setEditandoId(m.id_marca);
    setFormulario({ nombre: m.nombre, logo: m.logo || '', activo: m.activo });
    setError('');
    setModalAbierto(true);
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const datos = { nombre: formulario.nombre, logo: formulario.logo || null, activo: formulario.activo };
      if (editandoId) await crud.actualizar(editandoId, datos);
      else await crud.crear(datos);
      await cargar();
      setModalAbierto(false);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar la marca.'));
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    if (!aEliminar) return;
    try {
      await crud.eliminar(aEliminar.id_marca);
      await cargar();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo eliminar la marca.'));
    } finally {
      setAEliminar(null);
    }
  }

  if (cargando) return <div className="admin-loading">Cargando marcas...</div>;

  return (
    <div className="marcas-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Marcas de producto</h1>
          <p className="page-subtitle">Gestión de marcas y sus logos.</p>
        </div>
        <button className="btn btn--primary" onClick={abrirNuevo}>
          <Plus size={16} aria-hidden="true" /> Nueva marca
        </button>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Logo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {marcas.map((m) => (
              <tr key={m.id_marca}>
                <td>{m.nombre}</td>
                <td>
                  {m.logo ? <img src={m.logo} alt={m.nombre} style={{ width: 32, height: 32, objectFit: 'contain' }} /> : <span className="text-muted">—</span>}
                </td>
                <td>
                  <span className={`badge badge--${m.activo ? 'mint' : 'gray'}`}>{m.activo ? 'Activa' : 'Inactiva'}</span>
                </td>
                <td className="acciones">
                  <button className="btn btn--ghost btn--sm" onClick={() => abrirEdicion(m)} aria-label="Editar">
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                  <button className="btn btn--danger btn--sm" onClick={() => setAEliminar(m)} aria-label="Eliminar">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            {marcas.length === 0 && (
              <tr><td colSpan={4} className="empty">No hay marcas registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <div className="modal-overlay" onClick={() => setModalAbierto(false)} role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 className="modal-title">{editandoId ? 'Editar marca' : 'Nueva marca'}</h2>
              <button className="modal-close" onClick={() => setModalAbierto(false)} aria-label="Cerrar"><X size={16} /></button>
            </header>
            <form onSubmit={manejarSubmit} className="modal-form">
              <div className="form-field">
                <label className="form-label">Nombre</label>
                <input className="form-input" value={formulario.nombre} onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })} required disabled={guardando} />
              </div>
              <div className="form-field">
                <label className="form-label">Logo (URL)</label>
                <input className="form-input" value={formulario.logo} onChange={(e) => setFormulario({ ...formulario, logo: e.target.value })} placeholder="https://..." disabled={guardando} />
              </div>
              <div className="form-field">
                <label className="form-label">Estado</label>
                <select className="form-input form-select" value={formulario.activo} onChange={(e) => setFormulario({ ...formulario, activo: e.target.value === 'true' })} disabled={guardando}>
                  <option value={true}>Activa</option>
                  <option value={false}>Inactiva</option>
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
        titulo="Eliminar marca"
        mensaje={`¿Seguro que quieres eliminar la marca "${aEliminar?.nombre}"?`}
        textoConfirmar="Sí, eliminar"
        peligroso
        onConfirmar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </div>
  );
}
