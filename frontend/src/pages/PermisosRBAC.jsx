import { useState, useEffect } from 'react';
import api from '../services/api';
import { obtenerPermisosRol, actualizarPermisosRol } from '../services/roles';

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
      // Si ya tiene scope, quitarlo (desmarcar). Si no tiene, poner 'global' por defecto.
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
      // Preparar datos para enviar: array de { id_recurso_accion, scope }
      const permisos = Object.entries(permisosRol)
        .map(([recursoAccionId, scope]) => ({
          id_recurso_accion: recursoAccionId,
          scope
        }));

      // Enviar al backend usando el service de roles
      await actualizarPermisosRol(rolSeleccionado, permisos);
      
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

  if (!rolSeleccionado) {
    return (
      <div className="permisos-rbac">
        <h2>Gestión de Permisos RBAC</h2>
        <p className="ayuda">Seleccione un rol para gestionar sus permisos</p>
        
        <div className="selector-rol">
          <label htmlFor="rol-select">Rol: </label>
          <select 
            id="rol-select"
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
      <div className="permisos-header">
        <h2>Gestión de Permisos RBAC</h2>
        <div className="selector-rol">
          <label htmlFor="rol-select">Rol: </label>
          <select 
            id="rol-select"
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
      </div>

      {mensaje && (
        <div className={`mensaje mensaje-${mensaje.tipo}`}>
          {mensaje.texto}
        </div>
      )}

      {cargando && !recursosConPermisos.length && <div className="cargando">Cargando recursos...</div>}

      {recursosConPermisos.length > 0 && (
        <div className="permisos-grid">
          {Object.entries(recursosPorCategoria).map(([categoria, recursos]) => (
            <div key={categoria} className="categoria-permisos">
              <h3>{categoria.charAt(0).toUpperCase() + categoria.slice(1)}</h3>
              <div className="tabla-permisos-wrapper">
                <table className="tabla-permisos">
                  <thead>
                    <tr>
                      <th>Recurso</th>
                      <th>Crear</th>
                      <th>Leer</th>
                      <th>Actualizar</th>
                      <th>Eliminar</th>
                      <th>Listar</th>
                      <th>Exportar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recursos.map(recurso => (
                      <tr key={recurso.id_recurso}>
                        <td className="recurso-nombre">{recurso.nombre}</td>
                        {(recurso.acciones || []).map(accion => (
                          <td key={accion.id_recurso_accion}>
                            <label className="checkbox-permiso">
                              <input
                                type="checkbox"
                                checked={isChecked(accion.id_recurso_accion)}
                                onChange={() => togglePermiso(accion.id_recurso_accion)}
                              />
                              <span className="permiso-label">
                                {accion.accion_nombre}
                                {isChecked(accion.id_recurso_accion) && (
                                  <select
                                    value={getScopeValue(accion.id_recurso_accion)}
                                    onChange={(e) => handleScopeChange(accion.id_recurso_accion, e)}
                                  >
                                    <option value="global">Global</option>
                                    <option value="tienda">Tienda</option>
                                    <option value="propio">Propio</option>
                                  </select>
                                )}
                              </span>
                            </label>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="permisos-acciones">
        <button 
          className="btn btn-guardar"
          onClick={guardarPermisos}
          disabled={cargando}
        >
          {cargando ? 'Guardando...' : 'Guardar Permisos'}
        </button>
      </div>
    </div>
  );
}