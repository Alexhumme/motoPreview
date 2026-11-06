import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/authContexto';
import ModalConfirmacion from '../components/forms/ModalConfirmacion';
import DataTable from '../components/tables/DataTable';
import { obtenerUsuarios, registrarUsuario, actualizarUsuario, desactivarUsuario } from '../services/usuarios';
import { obtenerRoles } from '../services/roles';
import { obtenerTiendas } from '../services/tiendas';
import { ConPermiso } from '../components/menus/ConPermiso';
import './Usuarios.css';

const VACIO = { usu_nombre: '', usu_email: '', password: '', id_rol: '', id_tienda: '', estado_usuario: 'activo' };

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
  const [roles, setRoles] = useState([]);
  const [tiendas, setTiendas] = useState([]);
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
      const [datos, datosRoles, datosTiendas] = await Promise.all([
        obtenerUsuarios(idTienda),
        obtenerRoles(),
        obtenerTiendas(),
      ]);
      setUsuarios(datos);
      setRoles(datosRoles);
      setTiendas(datosTiendas);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, [idTienda]);

  const cargarRef = useRef();
  useEffect(() => {
    if (cargarRef.current === cargar) return;
    cargarRef.current = cargar;
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
    setFormulario({ usu_nombre: u.usu_nombre, usu_email: u.usu_email, password: '', id_rol: u.id_rol, id_tienda: u.id_tienda || '', estado_usuario: u.estado_usuario });
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
          id_tienda: formulario.id_tienda || null,
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

  function nombreRol(u) {
    return roles.find((r) => r.id_rol === u.id_rol)?.nombre_rol || String(u.id_rol);
  }

  const columnas = [
    { clave: 'usu_nombre', etiqueta: 'Nombre', render: (u) => <strong>{u.usu_nombre}</strong> },
    { clave: 'usu_email', etiqueta: 'Email' },
    {
      clave: 'rol',
      etiqueta: 'Rol',
      filtrable: true,
      valor: nombreRol,
      render: (u) => <span className="badge badge--violet">{nombreRol(u)}</span>,
    },
    {
      clave: 'estado_usuario',
      etiqueta: 'Estado',
      filtrable: true,
      valor: (u) => estadoLabels[u.estado_usuario] || u.estado_usuario,
      render: (u) => (
        <span className={`badge badge--${estadoBadge[u.estado_usuario] || 'gray'}`}>
          {estadoLabels[u.estado_usuario] || u.estado_usuario}
        </span>
      ),
    },
  ];

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

      <DataTable
        columnas={columnas}
        filas={usuarios}
        claveFila="id_usuario"
        cargando={cargando}
        vacio="No hay usuarios registrados."
        acciones={(u) => (
          <>
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
          </>
        )}
      />

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
                  {roles.map((r) => (
                    <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>
                  ))}
                </select>
              </div>

              {!editandoId && (
                <div className="form-field">
                  <label htmlFor="tienda" className="form-label">Tienda (opcional)</label>
                  <select
                    id="tienda"
                    className="form-input form-select"
                    value={formulario.id_tienda}
                    onChange={(e) => setFormulario({ ...formulario, id_tienda: e.target.value })}
                    disabled={guardando}
                  >
                    <option value="">Sin tienda (global)</option>
                    {tiendas.map((t) => (
                      <option key={t.id_tienda} value={t.id_tienda}>{t.tienda_nombre || t.nombre_tienda || t.id_tienda}</option>
                    ))}
                  </select>
                  <small className="form-hint">Solo asigna una tienda si el usuario pertenece a una sede. Deja "Sin tienda" para usuarios globales (ej. Superadmin).</small>
                </div>
              )}

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