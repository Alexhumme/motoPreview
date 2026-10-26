import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { obtenerPermisosRol, actualizarPermisosRol } from '../services/roles';
import './PermisosRBAC.css';

/**
 * Componente para gestionar permisos RBAC en el panel de administración
 * Permite asignar permisos (recurso + acción + scope) a roles usando checkboxes
 */
export default function PermisosRBAC() {
  const [roles, setRoles] = useState([]);
  const [recursosConPermisos, setRecursosConPermisos] = useState([]);
  const [rolSeleccionado, setRolSeleccionado] = useState(null);
  // permisosRol: { [recursoAccionId]: 'global' | 'tienda' | 'propio' | null }
  const [permisosRol, setPermisosRol] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Cargar roles al montar
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const res = await api.get('/roles');
        if (activo) setRoles(res.data);
      } catch (err) {
        console.error('Error cargando roles:', err);
      }
    })();
    return () => { activo = false; };
  }, []);

  async function cargarRecursosConPermisos() {
    if (!rolSeleccionado) return;
    try {
      const res = await obtenerPermisosRol(rolSeleccionado);
      setRecursosConPermisos(res.data || []);

      // Inicializar permisosRol desde los datos del backend
      const inicial = {};
      (res.data || []).forEach(recurso => {
        (recurso.acciones || []).forEach(accion => {
          if (accion.scope) {
            inicial[accion.id_recurso_accion] = accion.scope;
          }
        });
      });
      setPermisosRol(inicial);
    } catch (err) {
      console.error('Error cargando recursos:', err);
    }
  }

  function handleRolChange(e) {
    const rolId = e.target.value;
    setRolSeleccionado(rolId);
    setPermisosRol({});
    if (rolId) {
      cargarRecursosConPermisos();
    }
  }

  function togglePermiso(recursoAccionId) {
    setPermisosRol(prev => {
      const nuevo = { ...prev };
      if (nuevo[recursoAccionId]) {
        delete nuevo[recursoAccionId];
      } else {
        nuevo[recursoAccionId] = 'global';
      }
      return nuevo;
    });
  }

  function isChecked(recursoAccionId) {
    return !!permisosRol[recursoAccionId];
  }

  function getScopeValue(recursoAccionId) {
    return permisosRol[recursoAccionId] || '';
  }

  function handleScopeChange(recursoAccionId, e) {
    const scope = e.target.value;
    setPermisosRol(prev => {
      const nuevo = { ...prev };
      if (scope) {
        nuevo[recursoAccionId] = scope;
      } else {
        delete nuevo[recursoAccionId];
      }
      return nuevo;
    });
  }

  async function guardarPermisos() {
    if (!rolSeleccionado) return;

    setCargando(true);
    setMensaje(null);

    try {
      const permisos = Object.entries(permisosRol)
        .map(([recursoAccionId, scope]) => ({
          id_recurso_accion: recursoAccionId,
          scope
        }));

      await actualizarPermisosRol(rolSeleccionado, permisos);

      // Recargar la matriz para reflejar los scopes guardados
      await cargarRecursosConPermisos();
      setMensaje({ tipo: 'exito', texto: 'Permisos actualizados correctamente' });
    } catch (err) {
      console.error('Error guardando permisos:', err);
      setMensaje({ tipo: 'error', texto: 'Error al guardar permisos' });
    } finally {
      setCargando(false);
    }
  }

  // Agrupar recursos por categoría para mejor UX
  const recursosPorCategoria = recursosConPermisos.reduce((acc, recurso) => {
    const categoria = (recurso.codigo || '').split('_')[0] || 'otros';
    if (!acc[categoria]) acc[categoria] = [];
    acc[categoria].push(recurso);
    return acc;
  }, {});

  const scopeLabels = {
    global: 'Global',
    tienda: 'Tienda',
    propio: 'Propio'
  };

  if (!rolSeleccionado) {
    return (
      <div className="permisos-rbac">
        <header className="permisos-header">
          <h1 className="permisos-title">Gestión de Permisos RBAC</h1>
        </header>
        <p className="permisos-help">Seleccione un rol para gestionar sus permisos</p>

        <div className="permisos-selector">
          <label htmlFor="rol-select" className="form-label">Rol</label>
          <select
            id="rol-select"
            className="form-input form-select"
            value={rolSeleccionado || ''}
            onChange={handleRolChange}
          >
            <option value="">-- Seleccionar rol --</option>
            {roles.map(rol => (
              <option key={rol.id_rol} value={rol.id_rol}>
                {rol.nombre_rol}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="permisos-rbac">
      <header className="permisos-header">
        <h1 className="permisos-title">Gestión de Permisos RBAC</h1>
        <div className="permisos-selector">
          <label htmlFor="rol-select" className="form-label">Rol</label>
          <select
            id="rol-select"
            className="form-input form-select"
            value={rolSeleccionado}
            onChange={handleRolChange}
          >
            <option value="">-- Seleccionar rol --</option>
            {roles.map(rol => (
              <option key={rol.id_rol} value={rol.id_rol}>
                {rol.nombre_rol}
              </option>
            ))}
          </select>
        </div>
      </header>

      {mensaje && (
        <div className={`mensaje mensaje-${mensaje.tipo}`} role="alert">
          {mensaje.texto}
        </div>
      )}

      {cargando && !recursosConPermisos.length && (
        <div className="cargando" role="status" aria-live="polite">
          <div className="skeleton" style={{ width: '200px', height: '20px' }} />
        </div>
      )}

      {recursosConPermisos.length > 0 && (
        <div className="permisos-grid">
          {Object.entries(recursosPorCategoria).map(([categoria, recursos]) => {
            // Columnas = unión de acciones de la sección (robusto si algún
            // día agrupan varios recursos bajo el mismo prefijo)
            const accionesUnion = [];
            recursos.forEach((recurso) =>
              (recurso.acciones || []).forEach((accion) => {
                if (!accionesUnion.some((x) => x.id_recurso_accion === accion.id_recurso_accion)) {
                  accionesUnion.push(accion);
                }
              })
            );
            return (
              <section key={categoria} className="categoria-permisos card">
                <h2 className="categoria-title">{categoria.charAt(0).toUpperCase() + categoria.slice(1)}</h2>
                <div className="tabla-permisos-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '280px' }}>Recurso</th>
                        {accionesUnion.map((accion) => (
                          <th key={accion.id_recurso_accion}>{accion.accion_nombre}</th>
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
                            const propia = (recurso.acciones || []).find(
                              (x) => x.id_recurso_accion === accion.id_recurso_accion
                            );
                            if (!propia) return <td key={accion.id_recurso_accion} />;
                            return (
                              <td key={accion.id_recurso_accion}>
                                <label className="permiso-cell">
                                  <input
                                    type="checkbox"
                                    className="permiso-checkbox"
                                    checked={isChecked(propia.id_recurso_accion)}
                                    onChange={() => togglePermiso(propia.id_recurso_accion)}
                                    aria-label={`${propia.accion_nombre} para ${recurso.nombre}`}
                                  />
                                  <span className="permiso-label">{propia.accion_nombre}</span>
                                  {isChecked(propia.id_recurso_accion) && (
                                    <select
                                      className="permiso-scope"
                                      value={getScopeValue(propia.id_recurso_accion)}
                                      onChange={(e) => handleScopeChange(propia.id_recurso_accion, e)}
                                      aria-label={`Scope para ${propia.accion_nombre}`}
                                    >
                                      <option value="global">{scopeLabels.global}</option>
                                      <option value="tienda">{scopeLabels.tienda}</option>
                                      <option value="propio">{scopeLabels.propio}</option>
                                    </select>
                                  )}
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <footer className="permisos-footer">
        <Link to="/admin/roles" className="btn btn--ghost">
          + Crear rol
        </Link>
        <button
          className="btn btn--primary"
          onClick={guardarPermisos}
          disabled={cargando}
        >
          {cargando ? 'Guardando...' : 'Guardar Permisos'}
        </button>
      </footer>
    </div>
  );
}