import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ModalConfirmacion from '../../components/ModalConfirmacion';
import { obtenerRoles, crearRol, actualizarRol, desactivarRol } from '../../services/roles';
import { ROL_ADMIN, ROL_VENDEDOR, ROL_CLIENTE } from '../../constants/roles';
import { useNavigate } from 'react-router-dom';
import './Roles.css';

const VACIO = { nombre_rol: '', activo: true };

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
    async function refrescar() {
      await cargar();
    }
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

  const esRolSistema = (id) => [ROL_ADMIN, ROL_VENDEDOR, ROL_CLIENTE].includes(id);

  if (cargando) return <p>Cargando roles...</p>;

  return (
    <div className="roles-admin">
      <div className="roles-admin__header">
        <h1 className="roles-admin__titulo">Roles y Permisos</h1>
        <button className="roles-admin__boton-nuevo" onClick={abrirNuevo}>
          + Nuevo rol
        </button>
      </div>

      <table className="roles-admin__tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Estado</th>
            <th>Es sistema</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.id_rol}>
              <td>{r.nombre_rol}</td>
              <td>
                <span className={`roles-admin__estado roles-admin__estado--${r.activo ? 'activo' : 'inactivo'}`}>
                  {r.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td>
                <span className={`roles-admin__badge ${esRolSistema(r.id_rol) ? 'roles-admin__badge--sistema' : ''}`}>
                  {esRolSistema(r.id_rol) ? 'Sistema' : 'Personalizado'}
                </span>
              </td>
              <td className="roles-admin__acciones">
                <button 
                  className="roles-admin__boton-permisos" 
                  onClick={() => irAPermisos(r.id_rol)}
                  title="Gestionar permisos"
                >
                  🔐 Permisos
                </button>
                {!esRolSistema(r.id_rol) && (
                  <>
                    <button 
                      className="roles-admin__boton-editar" 
                      onClick={() => abrirEdicion(r)}
                    >
                      Editar
                    </button>
                    <button 
                      className="roles-admin__boton-eliminar" 
                      onClick={() => pedirConfirmacionEliminar(r)}
                    >
                      Eliminar
                    </button>
                  </>
                )}
                {esRolSistema(r.id_rol) && (
                  <button 
                    className="roles-admin__boton-editar" 
                    onClick={() => abrirEdicion(r)}
                  >
                    Editar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalAbierto && (
        <div className="roles-admin__overlay" onClick={cerrarModal}>
          <div className="roles-admin__modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editandoId ? 'Editar rol' : 'Nuevo rol'}</h2>
            <form onSubmit={manejarSubmit}>
              <label>Nombre del rol</label>
              <input
                value={formulario.nombre_rol}
                onChange={(e) => setFormulario({ ...formulario, nombre_rol: e.target.value })}
                required
                disabled={!!editandoId}
              />

              <label>Estado</label>
              <select
                value={formulario.activo}
                onChange={(e) => setFormulario({ ...formulario, activo: e.target.value })}
              >
                <option value={true}>Activo</option>
                <option value={false}>Inactivo</option>
              </select>

              {error && <p className="roles-admin__error">{error}</p>}

              <div className="roles-admin__modal-botones">
                <button type="button" onClick={cerrarModal} className="roles-admin__boton-cancelar">Cancelar</button>
                <button type="submit" disabled={guardando} className="roles-admin__boton-guardar">
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
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

