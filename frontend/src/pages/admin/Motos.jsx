import { useState } from 'react';
import RecursoAdmin from '../../components/admin/RecursoAdmin';
import { marcasApi, modelosMotoApi, motosApi } from '../../services/admin';

async function cargarMarcas() {
  return { marcas: await marcasApi.listar() };
}
async function cargarModelos() {
  return { modelos: await modelosMotoApi.listar() };
}

const columnasMarcas = [
  { clave: 'marca_nombre', etiqueta: 'Marca' },
  { clave: 'marca_pais', etiqueta: 'País', filtrable: true },
];
const camposMarcas = [
  { nombre: 'marca_nombre', etiqueta: 'Marca', requerido: true },
  { nombre: 'marca_pais', etiqueta: 'País de origen' },
];

const columnasModelos = [
  { clave: 'marca', etiqueta: 'Marca', valor: (m) => m.marca_moto?.marca_nombre, filtrable: true },
  { clave: 'modelo_nombre', etiqueta: 'Modelo' },
  { clave: 'cilindraje', etiqueta: 'Cilindraje', filtrable: true },
  { clave: 'modelo_descripcion', etiqueta: 'Descripción' },
];
const camposModelos = (extra) => [
  {
    nombre: 'id_marca',
    etiqueta: 'Marca',
    tipo: 'select',
    requerido: true,
    opciones: (extra.marcas || []).map((m) => ({ valor: m.id_marca, etiqueta: m.marca_nombre })),
  },
  { nombre: 'modelo_nombre', etiqueta: 'Modelo', requerido: true },
  { nombre: 'cilindraje', etiqueta: 'Cilindraje', ayuda: 'Ej. 160' },
  { nombre: 'modelo_descripcion', etiqueta: 'Descripción', tipo: 'textarea' },
];

const columnasMotos = [
  { clave: 'marca', etiqueta: 'Marca', valor: (m) => m.modelo_moto?.marca_moto?.marca_nombre, filtrable: true },
  { clave: 'modelo', etiqueta: 'Modelo', valor: (m) => m.modelo_moto?.modelo_nombre, filtrable: true },
  { clave: 'moto_anio', etiqueta: 'Año', filtrable: true },
  { clave: 'moto_version', etiqueta: 'Versión' },
];
const camposMotos = (extra) => [
  {
    nombre: 'id_modelo_moto',
    etiqueta: 'Modelo',
    tipo: 'select',
    requerido: true,
    opciones: (extra.modelos || []).map((m) => ({
      valor: m.id_modelo_moto,
      etiqueta: `${m.marca_moto?.marca_nombre || ''} ${m.modelo_nombre}`.trim(),
    })),
  },
  { nombre: 'moto_anio', etiqueta: 'Año', tipo: 'number', min: 1950, max: 2100 },
  { nombre: 'moto_version', etiqueta: 'Versión' },
  { nombre: 'moto_imagen', etiqueta: 'URL de la imagen', tipo: 'url' },
];

const PESTANAS = [
  { id: 'marcas', etiqueta: 'Marcas' },
  { id: 'modelos', etiqueta: 'Modelos' },
  { id: 'motos', etiqueta: 'Años y versiones' },
];

export default function Motos() {
  const [pestana, setPestana] = useState('marcas');

  return (
    <div>
      <div className="ra-tabs" role="tablist" aria-label="Gestión de motos">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pestana === p.id}
            className="ra-tab"
            onClick={() => setPestana(p.id)}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {pestana === 'marcas' && (
        <RecursoAdmin
          key="marcas"
          titulo="Marcas"
          singular="Marca"
          claveId="id_marca"
          api={marcasApi}
          columnas={columnasMarcas}
          campos={camposMarcas}
          textoEliminar={(m) => `Se eliminará la marca “${m.marca_nombre}”.`}
        />
      )}
      {pestana === 'modelos' && (
        <RecursoAdmin
          key="modelos"
          titulo="Modelos"
          singular="Modelo"
          claveId="id_modelo_moto"
          api={modelosMotoApi}
          cargarExtra={cargarMarcas}
          columnas={columnasModelos}
          campos={camposModelos}
          textoEliminar={(m) => `Se eliminará el modelo “${m.modelo_nombre}”.`}
        />
      )}
      {pestana === 'motos' && (
        <RecursoAdmin
          key="motos"
          titulo="Años y versiones"
          singular="Moto"
          claveId="id_moto"
          api={motosApi}
          cargarExtra={cargarModelos}
          columnas={columnasMotos}
          campos={camposMotos}
          textoEliminar={(m) => `Se eliminará la moto ${m.modelo_moto?.modelo_nombre || ''} ${m.moto_anio || ''}.`}
        />
      )}
    </div>
  );
}
