import RecursoAdmin from '../../components/admin/RecursoAdmin';
import { accesoriosApi, categoriasApi } from '../../services/admin';

async function cargarExtra() {
  const accesorios = await accesoriosApi.listar();
  const conteo = {};
  accesorios.forEach((a) => { if (a.id_categoria) conteo[a.id_categoria] = (conteo[a.id_categoria] || 0) + 1; });
  return { conteo };
}

const columnas = (extra) => [
  { clave: 'cat_nombre', etiqueta: 'Nombre' },
  { clave: 'cat_descripcion', etiqueta: 'Descripción' },
  { clave: 'cantidad', etiqueta: 'Accesorios', valor: (c) => extra.conteo?.[c.id_categoria] ?? 0 },
];

const campos = [
  { nombre: 'cat_nombre', etiqueta: 'Nombre', requerido: true },
  { nombre: 'cat_descripcion', etiqueta: 'Descripción', tipo: 'textarea' },
];

export default function Categorias() {
  return (
    <RecursoAdmin
      titulo="Categorías"
      singular="Categoría"
      claveId="id_categoria"
      api={categoriasApi}
      cargarExtra={cargarExtra}
      columnas={columnas}
      campos={campos}
      textoEliminar={(c) => `Se eliminará “${c.cat_nombre}”. Si tiene accesorios asociados, el sistema no permitirá borrarla.`}
    />
  );
}
