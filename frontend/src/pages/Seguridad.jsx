import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePermiso } from '../context/usePermiso';
import ModalConfirmacion from '../components/forms/ModalConfirmacion';
import { ConPermiso } from '../components/menus/ConPermiso';
import {
  obtenerRoles,
  crearRol,
  actualizarRol,
  desactivarRol,
  obtenerPermisosRol,
  actualizarPermisosRol,
} from '../services/roles';
import { ROL_SUPERADMIN, ROL_ADMIN, ROL_VENDEDOR, ROL_CLIENTE } from '../utils/constants/roles';
import './Roles.css';
import './PermisosRBAC.css';

const VACIO = { nombre_rol: '', activo: true };

// Roles del sistema: no se pueden eliminar (el Superadmin tampoco)
const esRolSistema = (id) =>
  [ROL_SUPERADMIN, ROL_ADMIN, ROL_VENDEDOR, ROL_CLIENTE].includes(id);

/**
 * Consola de seguridad: gestión de roles (crear/editar/eliminar) y matriz
 * de permisos RBAC (recurso × acción × scope) en una sola página.
 * La matriz solo es editable por el Superadmin; el Admin de tienda gestiona
 * los roles. Acepta ?rol_id= para seleccionar un rol al entrar.
 */
export default function Seguridad() {
  const { esSuperAdmin } = usePermiso();
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- Roles ----
  const [roles, setRoles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [rolAEliminar, setRolAEliminar] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // ---- Matriz de permisos ----
  const [rolSeleccionado, setRolSeleccionado] = useState('');
  const [recursos, setRecursos] = useState([]);
  const [permisosRol, setPermisosRol] = useState({});
  const [cargandoMatriz, setCargandoMatriz] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const puedeEditarMatriz = esSuperAdmin();
  const scopeLabels = { global: 'Global', tienda: 'Tienda', propio: 'Propio' };

  async function cargar() {
    try {
      setRoles(await obtenerRoles());
    } catch (err) {
      console.error('Error cargando roles:', err);
    } finally {
      setCargando(false);
    }
  }

  // Cargar roles al montar (inline para evitar warning de setState en effect)
  useEffect(() => {
    async function init() {
      try {
        setRoles(await obtenerRoles());
      } catch (err) {
        console.error('Error cargando roles:', err);
      } finally {
        setCargando(false);
      }
    }
    init();
  }, []);

  // Auto-selección desde ?rol_id= (p. ej. un enlace guardado)
  useEffect(() => {
    const rolId = searchParams.get('rol_id');
    if (rolId && puedeEditarMatriz) seleccionarRol(rolId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeEditarMatriz]);

  // ------------------------------------------------------------------
  // Matriz de permisos
  // ------------------------------------------------------------------
  async function seleccionarRol(rolId) {
    // IMPORTANTE: el id llega por parámetro (no leer el state, que aún no
    // se ha actualizado si la llamada viene de onChange del selector).
    setRolSeleccionado(rolId);
    setPermisosRol({});
    setRecursos([]);
    setMensaje(null);
    setSearchParams(rolId ? { rol_id: rolId } : {}, { replace: true });
    if (!rolId || !puedeEditarMatriz) return;

    setCargandoMatriz(true);
    try {
      // obtenerPermisosRol ya devuelve la lista de recursos (no envolver
      // de nuevo con .data: ese era el bug que dejaba la matriz vacía)
      const datos = await obtenerPermisosRol(rolId);
      const lista = Array.isArray(datos) ? datos : [];
      setRecursos(lista);

      const inicial = {};
      lista.forEach((recurso) =>
        (recurso.acciones || []).forEach((accion) => {
          if (accion.scope) inicial[accion.id_recurso_accion] = accion.scope;
        })
      );
      setPermisosRol(inicial);
    } catch (err) {
      console.error('Error cargando la matriz de permisos:', err);
      setMensaje({ tipo: 'error', texto: 'No se pudo cargar la matriz de permisos' });
    } finally {
      setCargandoMatriz(false);
    }
  }

  function irAMatriz(rolId) {
    seleccionarRol(rolId);
    document.getElementById('matriz-permisos')?.scrollIntoView({ behavior: 'smooth' });
  }

  function togglePermiso(id) {
    setPermisosRol((prev) => {
      const nuevo = { ...prev };
      if (nuevo[id]) {
        delete nuevo[id];
      } else {
        nuevo[id] = 'global';
      }
      return nuevo;
    });
  }

  const isChecked = (id) => !!permisosRol[id];
  const getScopeValue = (id) => permisosRol[id] || '';

  function manejarScope(id, e) {
    const scope = e.target.value;
    setPermisosRol((prev) => {
      const nuevo = { ...prev };
      if (scope) {
        nuevo[id] = scope;
      } else {
        delete nuevo[id];
      }
      return nuevo;
    });
  }

  async function guardarPermisos() {
    if (!rolSeleccionado) return;
    setCargandoMatriz(true);
    setMensaje(null);
    try {
      const permisos = Object.entries(permisosRol).map(([id_recurso_accion, scope]) => ({
        id_recurso_accion,
        scope,
      }));
      await actualizarPermisosRol(rolSeleccionado, permisos);
      await seleccionarRol(rolSeleccionado); // recargar con los scopes guardados
      setMensaje({ tipo: 'exito', texto: 'Permisos actualizados correctamente' });
    } catch (err) {
      console.error('Error guardando permisos:', err);
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al guardar permisos',
      });
    } finally {
      setCargandoMatriz(false);
    }
  }

  // Columnas compartidas de la matriz: unión de ACCIONES (crear, leer,
  // actualizar...). La clave de deduplicación es accion_codigo (el id de
  // recurso-accion es único por combinación y daría una columna por celda).
  const accionesUnion = [];
  recursos.forEach((recurso) =>
    (recurso.acciones || []).forEach((accion) => {
      if (!accionesUnion.some((x) => x.accion_codigo === accion.accion_codigo)) {
        accionesUnion.push(accion);
      }
    })
  );

  // ------------------------------------------------------------------
  // CRUD de roles
  // ------------------------------------------------------------------
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

  async function confirmarEliminar() {
    if (!rolAEliminar) return;
    try {
      await desactivarRol(rolAEliminar.id_rol);
      if (rolSeleccionado === rolAEliminar.id_rol) seleccionarRol('');
      await cargar();
    } catch (err) {
      console.error(err);
    } finally {
      setRolAEliminar(null);
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="permisos-rbac">
      <header className="permisos-header">
        <div>
          <h1 className="permisos-title">Seguridad</h1>
          <p className="permisos-help">
            Crea roles y define qué puede hacer cada uno: recursos, acciones y alcance.
          </p>
        </div>
      </header>

      {mensaje && (
        <div className={`mensaje mensaje-${mensaje.tipo}`} role="alert">
          {mensaje.texto}
        </div>
      )}

      {/* ============================ ROLES ============================ */}
      <section className="roles" aria-label="Gestión de roles">
        <div className="seguridad-seccion-header">
          <h2 className="seguridad-subtitulo">Roles</h2>
          <ConPermiso recurso="roles" accion="crear" fallback={null}>
            <button className="btn btn--primary" onClick={abrirNuevo}>
              <span aria-hidden="true">+</span> Nuevo rol
            </button>
          </ConPermiso>
        </div>

        <div className="table-wrap">
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
                    {cargando ? 'Cargando roles...' : 'No hay roles definidos.'}
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
                        {puedeEditarMatriz && (
                          <button
                            className="btn btn--outline btn--sm"
                            onClick={() => irAMatriz(r.id_rol)}
                          >
                            🔐 Permisos
                          </button>
                        )}
                        <ConPermiso recurso="roles" accion="actualizar" fallback={null}>
                          <button className="btn btn--ghost btn--sm" onClick={() => abrirEdicion(r)}>
                            Editar
                          </button>
                        </ConPermiso>
                        {!esRolSistema(r.id_rol) && (
                          <ConPermiso recurso="roles" accion="eliminar" fallback={null}>
                            <button className="btn btn--danger btn--sm" onClick={() => setRolAEliminar(r)}>
                              Eliminar
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
        </div>
      </section>

      {/* ====================== MATRIZ DE PERMISOS ====================== */}
      {puedeEditarMatriz ? (
        <section id="matriz-permisos" aria-label="Matriz de permisos">
          <div className="seguridad-seccion-header">
            <h2 className="seguridad-subtitulo">Permisos del rol</h2>
            <div className="permisos-selector">
              <label htmlFor="rol-select" className="form-label">Rol</label>
              <select
                id="rol-select"
                className="form-input form-select"
                value={rolSeleccionado}
                onChange={(e) => seleccionarRol(e.target.value)}
              >
                <option value="">-- Seleccionar rol --</option>
                {roles.map((rol) => (
                  <option key={rol.id_rol} value={rol.id_rol}>
                    {rol.nombre_rol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {rolSeleccionado === ROL_SUPERADMIN && (
            <p className="permisos-help" style={{ margin: 0 }}>
              El Superadmin tiene acceso total al sistema por diseño: la matriz
              se muestra completa solo como referencia.
            </p>
          )}

          {cargandoMatriz && (
            <div className="cargando" role="status" aria-live="polite">
              <div className="skeleton" style={{ width: '200px', height: '20px' }} />
            </div>
          )}

          {!cargandoMatriz && !rolSeleccionado && (
            <p className="permisos-help">Selecciona un rol para editar sus permisos.</p>
          )}

          {recursos.length > 0 && (
            <div className="tabla-permisos-wrapper">
              <table className="table tabla-permisos">
                <thead>
                  <tr>
                    <th style={{ minWidth: '260px' }}>Recurso</th>
                    {accionesUnion.map((accion) => (
                      <th key={accion.accion_codigo} className="col-accion">
                        {accion.accion_nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recursos.map((recurso) => (
                    <tr key={recurso.id_recurso}>
                      <td className="recurso-nombre">
                        <strong>{recurso.nombre}</strong>
                        {recurso.codigo && <code>{recurso.codigo}</code>}
                      </td>
                      {accionesUnion.map((accion) => {
                        // Buscar en ESTE recurso la combinación de la misma
                        // acción (la columna comparte la acción, no el id)
                        const propia = (recurso.acciones || []).find(
                          (x) => x.accion_codigo === accion.accion_codigo
                        );
                        if (!propia) {
                          return (
                            <td key={accion.accion_codigo} className="celda-no-aplica">
                              <span aria-hidden="true">—</span>
                            </td>
                          );
                        }
                        return (
                          <td key={accion.accion_codigo}>
                            <div className="permiso-cell">
                              <input
                                type="checkbox"
                                className="permiso-checkbox"
                                checked={isChecked(propia.id_recurso_accion)}
                                onChange={() => togglePermiso(propia.id_recurso_accion)}
                                aria-label={`${propia.accion_nombre} para ${recurso.nombre}`}
                              />
                              {isChecked(propia.id_recurso_accion) && (
                                <select
                                  className="permiso-scope"
                                  value={getScopeValue(propia.id_recurso_accion)}
                                  onChange={(e) => manejarScope(propia.id_recurso_accion, e)}
                                  aria-label={`Scope para ${propia.accion_nombre} en ${recurso.nombre}`}
                                >
                                  <option value="global">{scopeLabels.global}</option>
                                  <option value="tienda">{scopeLabels.tienda}</option>
                                  <option value="propio">{scopeLabels.propio}</option>
                                </select>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {recursos.length > 0 && (
            <footer className="permisos-footer">
              <button
                className="btn btn--primary"
                onClick={guardarPermisos}
                disabled={cargandoMatriz}
              >
                {cargandoMatriz ? 'Guardando...' : 'Guardar Permisos'}
              </button>
            </footer>
          )}
        </section>
      ) : (
        <section className="categoria-permisos card" aria-label="Matriz de permisos">
          <p className="permisos-help" style={{ margin: 0 }}>
            Puedes crear y editar roles, pero la matriz de permisos solo puede
            ser editada por el Superadmin.
          </p>
        </section>
      )}

      {/* ====================== MODAL NUEVO/EDITAR ====================== */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal} role="dialog" aria-modal="true" aria-labelledby="rol-modal-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="rol-modal-title" className="modal-title">
                {editandoId ? 'Editar rol' : 'Nuevo rol'}
              </h2>
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
                <label htmlFor="rol-activo" className="form-label">Estado</label>
                <select
                  id="rol-activo"
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
        mensaje={`¿Seguro que quieres eliminar el rol "${rolAEliminar?.nombre_rol}"? Sus permisos asignados se eliminan con él; si hay usuarios con este rol, primero deberás reasignarlos.`}
        textoConfirmar="Sí, eliminar"
        peligroso
        onConfirmar={confirmarEliminar}
        onCancelar={() => setRolAEliminar(null)}
      />
    </div>
  );
}
