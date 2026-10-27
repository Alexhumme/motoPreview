import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/authContexto';
import ModalConfirmacion from '../components/forms/ModalConfirmacion';
import { obtenerUsuarios, registrarUsuario, actualizarUsuario, desactivarUsuario } from '../services/usuarios';
import { ROL_ADMIN, ROL_VENDEDOR } from '../utils/constants/roles';
import { ConPermiso } from '../components/menus/ConPermiso';
import './Usuarios.css';

const VACIO = { usu_nombre: '', usu_email: '', password: '', id_rol: ROL_VENDEDOR, estado_usuario: 'activo' };

const rolLabels = {
  [ROL_ADMIN]: 'Admin',
  [ROL_VENDEDOR]: 'Vendedor'
};

const estadoLabels = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  bloqueado: 'Bloqueado'
};

const estadoBadge = {
  activo: 'mint',
  inactivo: 'gray',
  bloqueado: 'pink'
};

export default function Usuarios() {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioADesactivar, setUsuarioADesactivar] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const idTienda = usuario.id_tienda;

  const cargar = useCallback(async () => {
    try {
      const datos = await obtenerUsuarios(idTienda);
      setUsuarios(datos);
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

  function abrirNuevo() {
    setEditandoId(null);
    setFormulario(VACIO);
    setError('');
    setModalAbierto(true);
  }

  function abrirEdicion(u) {
    setEditandoId(u.id_usuario);
    setFormulario({ usu_nombre: u.usu_nombre, usu_email: u.usu_email, password: '', id_rol: u.id_rol, estado_usuario: u.estado_usuario });
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
        const datos = { usu_nombre: formulario.usu_nombre, id_rol: formulario.id_rol, estado_usuario: formulario.estado_usuario };
        if (formulario.password) datos.password = formulario.password;
        await actualizarUsuario(editandoId, datos);
      } else {
        await registrarUsuario({
          usu_nombre: formulario.usu_nombre,
          usu_email: formulario.usu_email,
          password: formulario.password,
          id_rol: formulario.id_rol,
          id_tienda: usuario.id_tienda,
        });
      }
      await cargar();
      cerrarModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el usuario');
    } finally {
      setGuardando(false);
    }
  }

  function pedirConfirmacionDesactivar(u) {
    setUsuarioADesactivar(u);
  }

  async function confirmarDesactivar() {
    await desactivarUsuario(usuarioADesactivar.id_usuario);
    setUsuarioADesactivar(null);
    await cargar();
  }

  if (cargando) {
    return (
      <div className="usuarios" role="status" aria-live="polite">
        <div className="skeleton" style={{ height: '56px', width: '280px', marginBottom: 'var(--space-32)' }} />
        <div className="skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  return (
    <div className="usuarios">
      <header className="usuarios-header">
        <h1 className="usuarios-title">Usuarios de la tienda</h1>
        <ConPermiso recurso="usuarios" accion="crear" fallback={null}>
          <button className="btn btn--primary" onClick={abrirNuevo}>
            <span aria-hidden="true">+</span> Nuevo usuario
          </button>
        </ConPermiso>
      </header>

      <section className="table-wrap" aria-label="Listado de usuarios">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th style={{ width: '200px' }}></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-64)', color: 'var(--color-mist-gray)' }}>
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td>
                    <strong>{u.usu_nombre}</strong>
                  </td>
                  <td>{u.usu_email}</td>
                  <td>
                    <span className="badge badge--violet">{rolLabels[u.id_rol] || u.id_rol}</span>
                  </td>
                  <td>
                    <span className={`badge badge--${estadoBadge[u.estado_usuario] || 'gray'}`}>
                      {estadoLabels[u.estado_usuario] || u.estado_usuario}
                    </span>
                  </td>
                  <td>
                    <div className="acciones">
                      <ConPermiso recurso="usuarios" accion="actualizar" fallback={null}>
                        <button className="btn btn--ghost btn--sm" onClick={() => abrirEdicion(u)}>Editar</button>
                      </ConPermiso>
                      {u.estado_usuario !== 'bloqueado' && u.id_usuario !== usuario.id_usuario && (
                        <ConPermiso recurso="usuarios" accion="eliminar" fallback={null}>
                          <button className="btn btn--danger btn--sm" onClick={() => pedirConfirmacionDesactivar(u)}>
                            Desactivar
                          </button>
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
        <div className="modal-overlay" onClick={cerrarModal} role="dialog" aria-modal="true" aria-labelledby="usuario-modal-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="usuario-modal-title" className="modal-title">{editandoId ? 'Editar usuario' : 'Nuevo usuario'}</h2>
              <button className="modal-close" onClick={cerrarModal} aria-label="Cerrar">✕</button>
            </header>

            <form onSubmit={manejarSubmit} className="modal-form">
              <div className="form-field">
                <label htmlFor="nombre" className="form-label">Nombre</label>
                <input
                  id="nombre"
                  type="text"
                  className="form-input"
                  value={formulario.usu_nombre}
                  onChange={(e) => setFormulario({ ...formulario, usu_nombre: e.target.value })}
                  required
                  disabled={guardando}
                />
              </div>

              <div className="form-field">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  value={formulario.usu_email}
                  onChange={(e) => setFormulario({ ...formulario, usu_email: e.target.value })}
                  required
                  disabled={!!editandoId || guardando}
                />
              </div>

              <div className="form-field">
                <label htmlFor="password" className="form-label">
                  {editandoId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  value={formulario.password}
                  onChange={(e) => setFormulario({ ...formulario, password: e.target.value })}
                  required={!editandoId}
                  disabled={guardando}
                />
              </div>

              <div className="form-field">
                <label htmlFor="rol" className="form-label">Rol</label>
                <select
                  id="rol"
                  className="form-input form-select"
                  value={formulario.id_rol}
                  onChange={(e) => setFormulario({ ...formulario, id_rol: e.target.value })}
                  disabled={guardando}
                >
                  <option value={ROL_VENDEDOR}>Vendedor</option>
                  <option value={ROL_ADMIN}>Admin</option>
                </select>
              </div>

              {editandoId && (
                <div className="form-field">
                  <label htmlFor="estado" className="form-label">Estado</label>
                  <select
                    id="estado"
                    className="form-input form-select"
                    value={formulario.estado_usuario}
                    onChange={(e) => setFormulario({ ...formulario, estado_usuario: e.target.value })}
                    disabled={guardando}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </div>
              )}

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
        abierto={!!usuarioADesactivar}
        titulo="Desactivar usuario"
        mensaje={`¿Seguro que quieres desactivar a ${usuarioADesactivar?.usu_nombre}? No podrá iniciar sesión hasta que lo reactives, pero conserva su historial.`}
        textoConfirmar="Sí, desactivar"
        peligroso
        onConfirmar={confirmarDesactivar}
        onCancelar={() => setUsuarioADesactivar(null)}
      />
    </div>
  );
}