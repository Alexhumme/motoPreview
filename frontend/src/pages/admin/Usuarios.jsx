import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ModalConfirmacion from '../../components/ModalConfirmacion';
import { obtenerUsuarios, registrarUsuario, actualizarUsuario, desactivarUsuario } from '../../services/usuarios';
import { ROL_ADMIN, ROL_VENDEDOR } from '../../constants/roles';
import './Usuarios.css';

const VACIO = { usu_nombre: '', usu_email: '', password: '', id_rol: ROL_VENDEDOR, estado_usuario: 'activo' };

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

  async function cargar() {
    setCargando(true);
    try {
      const datos = await obtenerUsuarios(usuario.id_tienda);
      setUsuarios(datos);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, [usuario]);

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

  const nombreRol = (id_rol) => (id_rol === ROL_ADMIN ? 'Admin' : id_rol === ROL_VENDEDOR ? 'Vendedor' : 'Cliente');

  if (cargando) return <p>Cargando usuarios...</p>;

  return (
    <div>
      <div className="usuarios-admin__header">
        <h1 className="usuarios-admin__titulo">Usuarios de la tienda</h1>
        <button className="usuarios-admin__boton-nuevo" onClick={abrirNuevo}>+ Nuevo usuario</button>
      </div>

      <table className="usuarios-admin__tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id_usuario}>
              <td>{u.usu_nombre}</td>
              <td>{u.usu_email}</td>
              <td>{nombreRol(u.id_rol)}</td>
              <td>
                <span className={`usuarios-admin__estado usuarios-admin__estado--${u.estado_usuario}`}>
                  {u.estado_usuario}
                </span>
              </td>
              <td className="usuarios-admin__acciones">
                <button className="usuarios-admin__boton-editar" onClick={() => abrirEdicion(u)}>Editar</button>
                {u.estado_usuario !== 'bloqueado' && u.id_usuario !== usuario.id_usuario && (
                  <button className="usuarios-admin__boton-desactivar" onClick={() => pedirConfirmacionDesactivar(u)}>
                    Desactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalAbierto && (
        <div className="usuarios-admin__overlay" onClick={cerrarModal}>
          <div className="usuarios-admin__modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editandoId ? 'Editar usuario' : 'Nuevo usuario'}</h2>
            <form onSubmit={manejarSubmit}>
              <label>Nombre</label>
              <input
                value={formulario.usu_nombre}
                onChange={(e) => setFormulario({ ...formulario, usu_nombre: e.target.value })}
                required
              />

              <label>Email</label>
              <input
                type="email"
                value={formulario.usu_email}
                onChange={(e) => setFormulario({ ...formulario, usu_email: e.target.value })}
                required
                disabled={!!editandoId}
              />

              <label>{editandoId ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
              <input
                type="password"
                value={formulario.password}
                onChange={(e) => setFormulario({ ...formulario, password: e.target.value })}
                required={!editandoId}
              />

              <label>Rol</label>
              <select
                value={formulario.id_rol}
                onChange={(e) => setFormulario({ ...formulario, id_rol: e.target.value })}
              >
                <option value={ROL_VENDEDOR}>Vendedor</option>
                <option value={ROL_ADMIN}>Admin</option>
              </select>

              {editandoId && (
                <>
                  <label>Estado</label>
                  <select
                    value={formulario.estado_usuario}
                    onChange={(e) => setFormulario({ ...formulario, estado_usuario: e.target.value })}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </>
              )}

              {error && <p className="usuarios-admin__error">{error}</p>}

              <div className="usuarios-admin__modal-botones">
                <button type="button" onClick={cerrarModal} className="usuarios-admin__boton-cancelar">Cancelar</button>
                <button type="submit" disabled={guardando} className="usuarios-admin__boton-guardar">
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
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