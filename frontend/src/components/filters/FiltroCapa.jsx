import { TODAS } from '../../utils/filtros';
import './FiltroCapa.css';

/**
 * Una capa de filtrado (categoría, tipo, …) en formato de chips compactos.
 * Las opciones ya llegan con su conteo, así que la capa solo muestra lo que
 * tiene resultados.
 */
export default function FiltroCapa({
  etiqueta,
  icono,
  opciones,
  valor,
  onChange,
  todasEtiqueta = 'Todas',
  ariaLabel,
}) {
  if (opciones.length === 0) return null;
  const total = opciones.reduce((suma, opcion) => suma + opcion.conteo, 0);

  return (
    <div className="filtro-capa">
      <span className="filtro-capa__label">
        {icono}
        {etiqueta}
      </span>
      <div className="filtro-capa__chips" role="group" aria-label={ariaLabel || `Filtrar por ${etiqueta.toLowerCase()}`}>
        <button
          type="button"
          className={`filtro-chip${valor === TODAS ? ' filtro-chip--activa' : ''}`}
          onClick={() => onChange(TODAS)}
          aria-pressed={valor === TODAS}
        >
          {todasEtiqueta}
          <em className="filtro-chip__count">{total}</em>
        </button>
        {opciones.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            className={`filtro-chip${valor === opcion.valor ? ' filtro-chip--activa' : ''}`}
            onClick={() => onChange(opcion.valor)}
            aria-pressed={valor === opcion.valor}
          >
            {opcion.etiqueta}
            <em className="filtro-chip__count">{opcion.conteo}</em>
          </button>
        ))}
      </div>
    </div>
  );
}
