import RecursoAdmin from '../../components/admin/RecursoAdmin';
import { accesoriosApi, compatibilidadApi, modelosMotoApi } from '../../services/admin';

async function cargarExtra() {
  const [accesorios, modelos] = await Promise.all([accesoriosApi.listar(), modelosMotoApi.listar()]);
  return { accesorios, modelos };
}

const nombreAccesorio = (extra, id) => extra.accesorios?.find((a) => a.id_accesorio === id)?.acc_nombre || '';

const columnas = (extra) => [
  { clave: 'accesorio', etiqueta: 'Accesorio', valor: (c) => nombreAccesorio(extra, c.id_accesorio), filtrable: true },
  { clave: 'marca', etiqueta: 'Marca', valor: (c) => c.modelo_moto?.marca_moto?.marca_nombre, filtrable: true },
  { clave: 'modelo', etiqueta: 'Modelo', valor: (c) => c.modelo_moto?.modelo_nombre, filtrable: true },
  {
    clave: 'anios',
    etiqueta: 'Años',
    valor: (c) => (c.anio_desde || c.anio_hasta ? `${c.anio_desde ?? '…'} – ${c.anio_hasta ?? '…'}` : 'Todos'),
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
  {
    nombre: 'id_modelo_moto',
    etiqueta: 'Modelo de moto',
    tipo: 'select',
    requerido: true,
    opciones: (extra.modelos || []).map((m) => ({
      valor: m.id_modelo_moto,
      etiqueta: `${m.marca_moto?.marca_nombre || ''} ${m.modelo_nombre}`.trim(),
    })),
  },
  { nombre: 'anio_desde', etiqueta: 'Año desde', tipo: 'number', min: 1950, max: 2100 },
  { nombre: 'anio_hasta', etiqueta: 'Año hasta', tipo: 'number', min: 1950, max: 2100 },
];

export default function Compatibilidad() {
  return (
    <RecursoAdmin
      titulo="Compatibilidad"
      singular="Compatibilidad"
      claveId="id_compatibilidad"
      api={compatibilidadApi}
      cargarExtra={cargarExtra}
      columnas={columnas}
      campos={campos}
      vacio="Todavía no hay compatibilidades. Relaciona un accesorio con un modelo de moto."
      textoEliminar={(c) => `Se quitará la compatibilidad con ${c.modelo_moto?.modelo_nombre || 'este modelo'}.`}
    />
  );
}
