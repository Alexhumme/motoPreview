import { useEffect, useState } from 'react';
import { obtenerAccesorios, obtenerCategorias } from '../../services/accesorios';
import AccesorioCard from '../../components/AccesorioCard';
import './Catalogo.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Catalogo() {
  const [accesorios, setAccesorios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const POR_PAGINA = 8;
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const { usuario, logout } = useAuth();
  const { totalItems } = useCart();

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

  useEffect(() => {
    setPaginaActual(1);
  }, [categoriaSeleccionada, busqueda]);

  const accesoriosFiltrados = accesorios
    .filter((a) => categoriaSeleccionada === 'todas' || a.id_categoria === categoriaSeleccionada)
    .filter((a) => {
      const texto = busqueda.trim().toLowerCase();
      if (!texto) return true;
      return (
        a.acc_nombre.toLowerCase().includes(texto) ||
        a.acc_descripcion?.toLowerCase().includes(texto) ||
        a.codigo_sku?.toLowerCase().includes(texto)
      );
    });

  const totalPaginas = Math.max(1, Math.ceil(accesoriosFiltrados.length / POR_PAGINA));
  const accesoriosPagina = accesoriosFiltrados.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA
  );

  if (cargando) return <p className="catalogo__estado">Cargando catálogo...</p>;
  if (error) return <p className="catalogo__estado catalogo__estado--error">{error}</p>;

  return (
    <>
      <header className="catalogo__header">
        <span className="catalogo__marca">MotoPreview</span>
        <Link to="/carrito" className="catalogo__carrito">
          Carrito {totalItems > 0 && <span className="catalogo__carrito-contador">{totalItems}</span>}
        </Link>
        {usuario ? (
          <div className="catalogo__sesion">
            <span>{usuario.usu_nombre}</span>
            <Link to="/mis-cotizaciones" className="catalogo__enlace-admin">Mis cotizaciones</Link>
            {(usuario.id_rol === '11111111-0000-0000-0000-000000000001' || usuario.id_rol === '11111111-0000-0000-0000-000000000002') && (
              <Link to="/admin" className="catalogo__enlace-admin">Panel admin</Link>
            )}
            <button onClick={logout} className="catalogo__logout">Salir</button>
          </div>
        ) : (
          <div className="catalogo__sesion">
            <Link to="/login" className="catalogo__enlace-login">Iniciar sesión</Link>
            <Link to="/registro" className="catalogo__enlace-registro">Crear cuenta</Link>
          </div>
        )}
      </header>

      <div className="catalogo__banner">
        <div className="catalogo__banner-texto">
          <span className="catalogo__banner-titulo">¿Ya sabes qué moto tienes?</span>
          <span className="catalogo__banner-subtitulo">Usa el Configurador y mira solo los accesorios compatibles con tu moto.</span>
        </div>
        <Link to="/configurador" className="catalogo__banner-boton">Ir al Configurador →</Link>
      </div>

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
          <div className="catalogo__contenido-header">
            <h1 className="catalogo__titulo">Catálogo de accesorios</h1>
            <input
              type="text"
              className="catalogo__buscador"
              placeholder="Buscar por nombre, SKU o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {accesoriosFiltrados.length === 0 ? (
            <p className="catalogo__sin-resultados">No encontramos accesorios que coincidan con tu búsqueda.</p>
          ) : (
            <>
              <div className="catalogo__grid">
                {accesoriosPagina.map((accesorio) => (
                  <AccesorioCard key={accesorio.id_accesorio} accesorio={accesorio} />
                ))}
              </div>

              {totalPaginas > 1 && (
                <div className="catalogo__paginacion">
                  <button
                    disabled={paginaActual === 1}
                    onClick={() => setPaginaActual((p) => p - 1)}
                  >
                    ← Anterior
                  </button>
                  <span>Página {paginaActual} de {totalPaginas}</span>
                  <button
                    disabled={paginaActual === totalPaginas}
                    onClick={() => setPaginaActual((p) => p + 1)}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}