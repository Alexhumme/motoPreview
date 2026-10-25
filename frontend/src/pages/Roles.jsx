import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ModalConfirmacion from '../components/forms/ModalConfirmacion';
import { obtenerRoles, crearRol, actualizarRol, desactivarRol } from '../services/roles';
import { ROL_ADMIN, ROL_VENDEDOR, ROL_CLIENTE } from '../utils/constants/roles';
import { useNavigate } from 'react-router-dom';
import { ConPermiso } from '../components/menus/ConPermiso';
import './Roles.css';

const VACIO = { nombre_rol: '', activo: true };

const esRolSistema = (id) => [ROL_ADMIN, ROL_VENDEDOR, ROL_CLIENTE].includes(id);

export default function Roles() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [rolAEliminar, setRolAEliminar] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function cargar() {
    try {
      const datos = await obtenerRoles();
      setRoles(datos);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    async function refrescar() { await cargar(); }
    refrescar();
  }, [usuario]);

  function abrirNuevo() {
    setEditandoId(null);
    setFormulario(VACIO);
    setError('');
    setModalAbierto(true);
  }

  function abrirEdicion(r) {
    setEditandoId(r.id_rol);
    setFormulario({ nombre_rol: r.nombre_rol, activo: r.activo });
    setError('');
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      if (editandoId) {
        await actualizarRol(editandoId, formulario);
      } else {
        await crearRol(formulario);
      }
      await cargar();
      cerrarModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el rol');
    } finally {
      setGuardando(false);
    }
  }

  function pedirConfirmacionEliminar(r) {
    setRolAEliminar(r);
  }

  async function confirmarEliminar() {
    if (!rolAEliminar) return;
    await desactivarRol(rolAEliminar.id_rol);
    setRolAEliminar(null);
    await cargar();
  }

  function irAPermisos(idRol) {
    navigate(`/admin/permisos?rol_id=${idRol}`);
  }

  if (cargando) {
    return (
      <div className="roles" role="status" aria-live="polite">
        <div className="skeleton" style={{ height: '56px', width: '280px', marginBottom: 'var(--space-32)' }} />
        <div className="skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  return (
    <div className="roles">
      <header className="roles-header">
        <h1 className="roles-title">Roles y Permisos</h1>
        <ConPermiso recurso="roles" accion="crear" fallback={null}>
          <button className="btn btn--primary" onClick={abrirNuevo}>
            <span aria-hidden="true">+</span> Nuevo rol
          </button>
        </ConPermiso>
      </header>

      <section className="table-wrap" aria-label="Listado de roles">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Tipo</th>
              <th style={{ width: '240px' }}></th>
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-64)', color: 'var(--color-mist-gray)' }}>
                  No hay roles definidos.
                </td>
              </tr>
            ) : (
              roles.map((r) => (
                <tr key={r.id_rol}>
                  <td>
                    <strong>{r.nombre_rol}</strong>
                  </td>
                  <td>
                    <span className={`badge badge--${r.activo ? 'mint' : 'gray'}`}>
                      {r.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge--${esRolSistema(r.id_rol) ? 'violet' : 'gray'}`}>
                      {esRolSistema(r.id_rol) ? 'Sistema' : 'Personalizado'}
                    </span>
                  </td>
                  <td>
                    <div className="acciones">
                      <ConPermiso recurso="roles" accion="actualizar" fallback={null}>
                        <button className="btn btn--outline btn--sm" onClick={() => irAPermisos(r.id_rol)}>
                          🔐 Permisos
                        </button>
                      </ConPermiso>
                      {!esRolSistema(r.id_rol) && (
                        <>
                          <ConPermiso recurso="roles" accion="actualizar" fallback={null}>
                            <button className="btn btn--ghost btn--sm" onClick={() => abrirEdicion(r)}>Editar</button>
                          </ConPermiso>
                          <ConPermiso recurso="roles" accion="eliminar" fallback={null}>
                            <button className="btn btn--danger btn--sm" onClick={() => pedirConfirmacionEliminar(r)}>Eliminar</button>
                          </ConPermiso>
                        </>
                      )}
                      {esRolSistema(r.id_rol) && (
                        <ConPermiso recurso="roles" accion="actualizar" fallback={null}>
                          <button className="btn btn--ghost btn--sm" onClick={() => abrirEdicion(r)}>Editar</button>
                        </ConPermiso>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Modal */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal} role="dialog" aria-modal="true" aria-labelledby="rol-modal-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="rol-modal-title" className="modal-title">{editandoId ? 'Editar rol' : 'Nuevo rol'}</h2>
              <button className="modal-close" onClick={cerrarModal} aria-label="Cerrar">✕</button>
            </header>

            <form onSubmit={manejarSubmit} className="modal-form">
              <div className="form-field">
                <label htmlFor="nombre-rol" className="form-label">Nombre del rol</label>
                <input
                  id="nombre-rol"
                  type="text"
                  className="form-input"
                  value={formulario.nombre_rol}
                  onChange={(e) => setFormulario({ ...formulario, nombre_rol: e.target.value })}
                  required
                  disabled={!!editandoId || guardando}
                />
              </div>

              <div className="form-field">
                <label htmlFor="activo" className="form-label">Estado</label>
                <select
                  id="activo"
                  className="form-input form-select"
                  value={formulario.activo}
                  onChange={(e) => setFormulario({ ...formulario, activo: e.target.value })}
                  disabled={guardando}
                >
                  <option value={true}>Activo</option>
                  <option value={false}>Inactivo</option>
                </select>
              </div>

              {error && <p className="form-error" role="alert">{error}</p>}

              <footer className="modal-footer">
                <button type="button" className="btn btn--ghost" onClick={cerrarModal} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      <ModalConfirmacion
        abierto={!!rolAEliminar}
        titulo="Eliminar rol"
        mensaje={`¿Seguro que quieres eliminar el rol "${rolAEliminar?.nombre_rol}"? Esta acción no se puede deshacer y los usuarios con este rol perderán sus permisos.`}
        textoConfirmar="Sí, eliminar"
        peligroso
        onConfirmar={confirmarEliminar}
        onCancelar={() => setRolAEliminar(null)}
      />
    </div>
  );
}