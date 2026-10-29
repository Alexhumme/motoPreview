import { useState } from 'react';
import RecursoAdmin from '../components/tables/RecursoAdmin';
import { ConPermisoAdmin } from '../components/menus/ConPermiso';
import { accionesApi, recursoAccionesApi, recursosApi } from '../services/auth';
import './CatalogoRBAC.css';

const OPCIONES_ESTADO = [
  { valor: 'true', etiqueta: 'Activo' },
  { valor: 'false', etiqueta: 'Inactivo' },
];

const CAMPO_ESTADO = {
  nombre: 'activo',
  etiqueta: 'Estado',
  tipo: 'select',
  booleano: true,
  defecto: 'true',
  opciones: OPCIONES_ESTADO,
};

function celdaEstado(fila, textoCierto) {
  return (
    <span className={`badge badge--${fila.activo ? 'mint' : 'gray'}`}>
      {textoCierto ?? (fila.activo ? 'Activo' : 'Inactivo')}
    </span>
  );
}

const COLUMNAS_RECURSO = [
  { clave: 'codigo', etiqueta: 'Código' },
  { clave: 'nombre', etiqueta: 'Nombre' },
  { clave: 'endpoint_base', etiqueta: 'Endpoint' },
  { clave: 'orden', etiqueta: 'Orden' },
  { clave: 'activo', etiqueta: 'Estado', render: (r) => celdaEstado(r), valor: (r) => (r.activo ? 'Activo' : 'Inactivo') },
];

const CAMPOS_RECURSO = [
  { nombre: 'codigo', etiqueta: 'Código', requerido: true, ayuda: 'ej: ventas' },
  { nombre: 'nombre', etiqueta: 'Nombre', requerido: true },
  { nombre: 'endpoint_base', etiqueta: 'Endpoint base', ayuda: 'ej: /api/ventas' },
  { nombre: 'icono', etiqueta: 'Icono' },
  { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea' },
  { nombre: 'orden', etiqueta: 'Orden', tipo: 'number', requerido: true, defecto: '0' },
  CAMPO_ESTADO,
];

const COLUMNAS_ACCION = [
  { clave: 'codigo', etiqueta: 'Código' },
  { clave: 'nombre', etiqueta: 'Nombre' },
  { clave: 'metodo_http', etiqueta: 'Método HTTP' },
  { clave: 'orden', etiqueta: 'Orden' },
  { clave: 'activo', etiqueta: 'Estado', render: (a) => celdaEstado(a), valor: (a) => (a.activo ? 'Activo' : 'Inactivo') },
];

const CAMPOS_ACCION = [
  { nombre: 'codigo', etiqueta: 'Código', requerido: true, ayuda: 'ej: exportar' },
  { nombre: 'nombre', etiqueta: 'Nombre', requerido: true },
  { nombre: 'metodo_http', etiqueta: 'Método HTTP', ayuda: 'GET, POST, PUT...' },
  { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea' },
  { nombre: 'orden', etiqueta: 'Orden', tipo: 'number', requerido: true, defecto: '0' },
  CAMPO_ESTADO,
];

// Estable a propósito: RecursoAdmin la usa como dependencia de su efecto de carga.
async function cargarCombosExtra() {
  const [recursos, acciones] = await Promise.all([recursosApi.listar(), accionesApi.listar()]);
  return { recursos, acciones };
}

const opciones = (lista, claveId) => (lista || []).map((x) => ({ valor: x[claveId], etiqueta: x.nombre }));

const COLUMNAS_COMBO = [
  { clave: 'recurso', etiqueta: 'Recurso', valor: (c) => c.recurso?.nombre, filtrable: true },
  { clave: 'accion', etiqueta: 'Acción', valor: (c) => c.accion?.nombre, filtrable: true },
  {
    clave: 'requiere_scope',
    etiqueta: 'Alcance',
    valor: (c) => (c.requiere_scope ? 'Por alcance' : 'Solo global'),
  },
  { clave: 'activo', etiqueta: 'Estado', render: (c) => celdaEstado(c), valor: (c) => (c.activo ? 'Activo' : 'Inactivo') },
];

// extra trae los catálogos para poblar los selects del formulario.
const camposCombo = (extra) => [
  { nombre: 'id_recurso', etiqueta: 'Recurso', tipo: 'select', requerido: true, opciones: opciones(extra.recursos, 'id_recurso') },
  { nombre: 'id_accion', etiqueta: 'Acción', tipo: 'select', requerido: true, opciones: opciones(extra.acciones, 'id_accion') },
  { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea' },
  {
    nombre: 'requiere_scope',
    etiqueta: 'Alcance',
    tipo: 'select',
    booleano: true,
    defecto: 'true',
    opciones: [
      { valor: 'true', etiqueta: 'Puede limitarse a tienda o propio' },
      { valor: 'false', etiqueta: 'Solo global' },
    ],
  },
  CAMPO_ESTADO,
];

// La lectura viene anidada (recurso: {...}) y la escritura pide ids sueltos.
function aFormularioCombo(fila) {
  return {
    id_recurso: fila.recurso?.id_recurso,
    id_accion: fila.accion?.id_accion,
    descripcion: fila.descripcion,
    requiere_scope: fila.requiere_scope,
    activo: fila.activo,
  };
}

const PESTANAS = [
  { clave: 'recursos', etiqueta: 'Recursos' },
  { clave: 'acciones', etiqueta: 'Acciones' },
  { clave: 'combinaciones', etiqueta: 'Combinaciones' },
];

/**
 * Catálogo RBAC: alta, edición y borrado de recursos, acciones y de las
 * combinaciones que luego ofrece la matriz de Seguridad.
 *
 * Solo el superadmin lo escribe; la API también lo exige (IsSuperAdmin en
 * /recursos, /acciones y /recurso-acciones), así que esta pantalla es la única
 * vía para crear recursos sin tocar SQL ni el admin de Django.
 */
export default function CatalogoRBAC() {
  const [pestana, setPestana] = useState('recursos');

  return (
    <ConPermisoAdmin
      fallback={
        <div className="catalogo-rbac">
          <p className="permisos-help">El catálogo de permisos solo lo gestiona el Superadmin.</p>
        </div>
      }
    >
      <div className="catalogo-rbac">
        <header className="catalogo-header">
          <h1 className="permisos-title">Catálogo de permisos</h1>
          <p className="permisos-help">
            Define qué recursos existen, qué acciones admiten y qué combinaciones podrá
            conceder la matriz de Seguridad.
          </p>
        </header>

        <div className="catalogo-pestanas" role="tablist" aria-label="Secciones del catálogo">
          {PESTANAS.map((t) => (
            <button
              key={t.clave}
              type="button"
              role="tab"
              aria-selected={pestana === t.clave}
              className={`catalogo-tab${pestana === t.clave ? ' catalogo-tab--activa' : ''}`}
              onClick={() => setPestana(t.clave)}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>

        {pestana === 'recursos' && (
          <RecursoAdmin
            titulo="Recursos"
            singular="Recurso"
            claveId="id_recurso"
            api={recursosApi}
            columnas={COLUMNAS_RECURSO}
            campos={CAMPOS_RECURSO}
            textoEliminar={(r) => `“${r.codigo}” dejará de aparecer en la matriz de permisos.`}
          />
        )}
        {pestana === 'acciones' && (
          <RecursoAdmin
            titulo="Acciones"
            singular="Acción"
            claveId="id_accion"
            api={accionesApi}
            columnas={COLUMNAS_ACCION}
            campos={CAMPOS_ACCION}
            textoEliminar={(a) => `“${a.codigo}” dejará de poder concederse a ningún rol.`}
          />
        )}
        {pestana === 'combinaciones' && (
          <RecursoAdmin
            titulo="Combinaciones recurso-acción"
            singular="Combinación"
            claveId="id_recurso_accion"
            api={recursoAccionesApi}
            cargarExtra={cargarCombosExtra}
            columnas={COLUMNAS_COMBO}
            campos={camposCombo}
            aFormulario={aFormularioCombo}
            textoEliminar={(c) => `Se eliminará “${c.recurso?.codigo}:${c.accion?.codigo}”. Los roles que la tengan asignada perderán ese permiso.`}
          />
        )}
      </div>
    </ConPermisoAdmin>
  );
}
