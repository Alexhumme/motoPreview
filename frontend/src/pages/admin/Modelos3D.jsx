import { useState } from 'react';
import RecursoAdmin from '../../components/admin/RecursoAdmin';
import Visor3D from '../../components/Visor3D';
import { accesoriosApi, modelos3dApi } from '../../services/admin';

async function cargarExtra() {
  return { accesorios: await accesoriosApi.listar() };
}

const columnas = [
  { clave: 'accesorio', etiqueta: 'Accesorio', valor: (m) => m.accesorio?.acc_nombre, filtrable: true },
  { clave: 'formato_archivo', etiqueta: 'Formato', filtrable: true },
  { clave: 'estado_visualizacion', etiqueta: 'Estado', filtrable: true },
  { clave: 'modelo3d_fecha', etiqueta: 'Fecha' },
  {
    clave: 'url_modelo3d',
    etiqueta: 'Archivo',
    render: (m) => <span title={m.url_modelo3d}>{m.url_modelo3d.split('?')[0].split('/').pop()}</span>,
  },
];

const campos = (extra) => [
  {
    nombre: 'id_accesorio',
    etiqueta: 'Accesorio',
    tipo: 'select',
    requerido: true,
    opciones: (extra.accesorios || []).map((a) => ({ valor: a.id_accesorio, etiqueta: a.acc_nombre || 'Sin nombre' })),
  },
  { nombre: 'url_modelo3d', etiqueta: 'URL del modelo (.glb o .gltf)', tipo: 'url', requerido: true },
  { nombre: 'estado_visualizacion', etiqueta: 'Estado de visualización', ayuda: 'Ej. activo' },
  { nombre: 'modelo3d_observaciones', etiqueta: 'Observaciones', tipo: 'textarea' },
];

export default function Modelos3D() {
  const [vista, setVista] = useState(null);

  return (
    <>
      <RecursoAdmin
        titulo="Modelos 3D"
        singular="Modelo 3D"
        claveId="id_modelo3d"
        api={modelos3dApi}
        cargarExtra={cargarExtra}
        columnas={columnas}
        campos={campos}
        textoEliminar={(m) => `Se eliminará el modelo 3D de ${m.accesorio?.acc_nombre || 'este accesorio'}.`}
        accionesExtra={(m) => (
          <button type="button" className="dt-boton dt-boton--suave" onClick={() => setVista(m)}>Vista previa</button>
        )}
      />
      {vista && (
        <div className="ra-overlay" onClick={() => setVista(null)}>
          <div className="ra-vista3d" role="dialog" aria-modal="true" aria-label="Vista previa del modelo 3D" onClick={(e) => e.stopPropagation()}>
            <Visor3D url={vista.url_modelo3d} nombreAccesorio={vista.accesorio?.acc_nombre || 'El accesorio'} />
            <div className="ra-botones">
              <button type="button" className="dt-boton dt-boton--suave" onClick={() => setVista(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
