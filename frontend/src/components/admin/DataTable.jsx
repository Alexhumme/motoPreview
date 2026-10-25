import { useMemo, useState } from 'react';
import './DataTable.css';

const TAMANOS = [10, 25, 50, 100];

function valorDe(fila, columna) {
  return columna.valor ? columna.valor(fila) : fila[columna.clave];
}

function texto(valor) {
  return valor === null || valor === undefined ? '' : String(valor);
}

/**
 * Tabla administrativa con búsqueda, filtros, orden, paginación y estados
 * de carga / error / vacío.
 *
 * columnas: [{ clave, etiqueta, valor?(fila), render?(fila), filtrable?, ordenable? }]
 */
export default function DataTable({
  columnas,
  filas,
  claveFila,
  cargando = false,
  error = '',
  onReintentar,
  vacio = 'No hay registros.',
  acciones,
}) {
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState({ clave: null, direccion: 'asc' });
  const [filtros, setFiltros] = useState({});
  const [tamano, setTamano] = useState(10);
  const [pagina, setPagina] = useState(1);

  const opcionesFiltro = useMemo(() => {
    const resultado = {};
    columnas.filter((c) => c.filtrable).forEach((c) => {
      const valores = new Set(filas.map((f) => texto(valorDe(f, c))).filter(Boolean));
      resultado[c.clave] = [...valores].sort((a, b) => a.localeCompare(b, 'es'));
    });
    return resultado;
  }, [columnas, filas]);

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    let resultado = filas.filter((fila) => {
      const coincideFiltros = Object.entries(filtros).every(([clave, valor]) => {
        if (!valor) return true;
        const columna = columnas.find((c) => c.clave === clave);
        return texto(valorDe(fila, columna)) === valor;
      });
      if (!coincideFiltros) return false;
      if (!termino) return true;
      return columnas.some((c) => texto(valorDe(fila, c)).toLowerCase().includes(termino));
    });
    if (orden.clave) {
      const columna = columnas.find((c) => c.clave === orden.clave);
      const factor = orden.direccion === 'asc' ? 1 : -1;
      resultado = [...resultado].sort((a, b) =>
        texto(valorDe(a, columna)).localeCompare(texto(valorDe(b, columna)), 'es', { numeric: true }) * factor,
      );
    }
    return resultado;
  }, [filas, columnas, busqueda, filtros, orden]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / tamano));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaActual - 1) * tamano, paginaActual * tamano);
  const hayFiltros = busqueda !== '' || Object.values(filtros).some(Boolean);

  function cambiarOrden(clave) {
    setOrden((previo) =>
      previo.clave === clave
        ? { clave, direccion: previo.direccion === 'asc' ? 'desc' : 'asc' }
        : { clave, direccion: 'asc' },
    );
  }

  function limpiar() {
    setBusqueda('');
    setFiltros({});
    setPagina(1);
  }

  if (error) {
    return (
      <div className="dt-estado dt-estado--error" role="alert">
        <p>{error}</p>
        {onReintentar && <button type="button" className="dt-boton" onClick={onReintentar}>Reintentar</button>}
      </div>
    );
  }

  return (
    <div className="dt">
      <div className="dt-barra">
        <input
          type="search"
          className="dt-busqueda"
          placeholder="Buscar..."
          aria-label="Buscar en la tabla"
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
        />
        {columnas.filter((c) => c.filtrable).map((c) => (
          <select
            key={c.clave}
            className="dt-select"
            aria-label={`Filtrar por ${c.etiqueta}`}
            value={filtros[c.clave] || ''}
            onChange={(e) => { setFiltros({ ...filtros, [c.clave]: e.target.value }); setPagina(1); }}
          >
            <option value="">{c.etiqueta}: todos</option>
            {opcionesFiltro[c.clave].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        ))}
        {hayFiltros && <button type="button" className="dt-boton dt-boton--suave" onClick={limpiar}>Limpiar filtros</button>}
      </div>

      <div className="dt-scroll">
        <table className="dt-tabla">
          <thead>
            <tr>
              {columnas.map((c) => (
                <th
                  key={c.clave}
                  scope="col"
                  aria-sort={orden.clave === c.clave ? (orden.direccion === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {c.ordenable === false ? c.etiqueta : (
                    <button type="button" className="dt-orden" onClick={() => cambiarOrden(c.clave)}>
                      {c.etiqueta}
                      <span aria-hidden="true">{orden.clave === c.clave ? (orden.direccion === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                    </button>
                  )}
                </th>
              ))}
              {acciones && <th scope="col">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {cargando && Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`} className="dt-skeleton">
                {columnas.concat(acciones ? [{ clave: 'acc' }] : []).map((c) => <td key={c.clave}><span /></td>)}
              </tr>
            ))}
            {!cargando && visibles.map((fila) => (
              <tr key={fila[claveFila]}>
                {columnas.map((c) => {
                  const contenido = c.render ? c.render(fila) : texto(valorDe(fila, c));
                  return <td key={c.clave}>{contenido === '' ? '—' : contenido}</td>;
                })}
                {acciones && <td className="dt-acciones">{acciones(fila)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!cargando && filas.length === 0 && <div className="dt-estado">{vacio}</div>}
      {!cargando && filas.length > 0 && filtradas.length === 0 && (
        <div className="dt-estado">
          <p>Ningún registro coincide con la búsqueda.</p>
          <button type="button" className="dt-boton dt-boton--suave" onClick={limpiar}>Limpiar filtros</button>
        </div>
      )}

      {!cargando && filtradas.length > 0 && (
        <div className="dt-pie">
          <span>
            Mostrando {(paginaActual - 1) * tamano + 1}–{Math.min(paginaActual * tamano, filtradas.length)} de {filtradas.length}
          </span>
          <label>
            Mostrar{' '}
            <select className="dt-select" value={tamano} onChange={(e) => { setTamano(Number(e.target.value)); setPagina(1); }}>
              {TAMANOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <span className="dt-paginas">
            <button type="button" className="dt-boton dt-boton--suave" disabled={paginaActual <= 1} onClick={() => setPagina(paginaActual - 1)}>‹ Anterior</button>
            <span>{paginaActual} / {totalPaginas}</span>
            <button type="button" className="dt-boton dt-boton--suave" disabled={paginaActual >= totalPaginas} onClick={() => setPagina(paginaActual + 1)}>Siguiente ›</button>
          </span>
        </div>
      )}
    </div>
  );
}
