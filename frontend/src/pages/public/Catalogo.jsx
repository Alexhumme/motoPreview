import { useEffect, useState } from 'react';
import { obtenerAccesorios, obtenerCategorias } from '../../services/accesorios';
import AccesorioCard from '../../components/AccesorioCard';
import './Catalogo.css';

export default function Catalogo() {
  const [accesorios, setAccesorios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [datosAccesorios, datosCategorias] = await Promise.all([
          obtenerAccesorios(),
          obtenerCategorias(),
        ]);
        setAccesorios(datosAccesorios);
        setCategorias(datosCategorias);
      } catch (err) {
        setError('No se pudo cargar el catálogo. Verifica que el servidor esté corriendo.');
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, []);

  const accesoriosFiltrados = categoriaSeleccionada === 'todas'
    ? accesorios
    : accesorios.filter((a) => a.id_categoria === categoriaSeleccionada);

  if (cargando) return <p className="catalogo__estado">Cargando catálogo...</p>;
  if (error) return <p className="catalogo__estado catalogo__estado--error">{error}</p>;

  return (
    <div className="catalogo">
      <aside className="catalogo__filtros">
        <h2 className="catalogo__titulo-filtros">Categorías</h2>
        <button
          className={`catalogo__filtro ${categoriaSeleccionada === 'todas' ? 'catalogo__filtro--activo' : ''}`}
          onClick={() => setCategoriaSeleccionada('todas')}
        >
          Todas ({accesorios.length})
        </button>
        {categorias.map((cat) => {
          const cantidad = accesorios.filter((a) => a.id_categoria === cat.id_categoria).length;
          return (
            <button
              key={cat.id_categoria}
              className={`catalogo__filtro ${categoriaSeleccionada === cat.id_categoria ? 'catalogo__filtro--activo' : ''}`}
              onClick={() => setCategoriaSeleccionada(cat.id_categoria)}
            >
              {cat.cat_nombre} ({cantidad})
            </button>
          );
        })}
      </aside>

      <main className="catalogo__contenido">
        <h1 className="catalogo__titulo">Catálogo de accesorios</h1>
        <div className="catalogo__grid">
          {accesoriosFiltrados.map((accesorio) => (
            <AccesorioCard key={accesorio.id_accesorio} accesorio={accesorio} />
          ))}
        </div>
      </main>
    </div>
  );
}