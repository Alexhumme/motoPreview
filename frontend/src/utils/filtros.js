// Utilidades de las capas de filtrado (categoría → tipo) del catálogo y el configurador.

export const TODAS = '__todas';

const colador = new Intl.Collator('es', { sensitivity: 'base' });

/**
 * Agrupa una lista por una clave de taxonomía contando coincidencias, para que
 * una capa de filtros solo ofrezca opciones con resultados.
 * `clave` devuelve null/undefined para lo que no pertenece a esta capa.
 */
export function agruparOpciones(lista, clave, etiqueta) {
  const mapa = new Map();
  lista.forEach((item) => {
    const valor = clave(item);
    if (!valor) return;
    const entrada = mapa.get(valor);
    if (entrada) entrada.conteo += 1;
    else mapa.set(valor, { valor, etiqueta: etiqueta(item), conteo: 1 });
  });
  return [...mapa.values()].sort((a, b) => colador.compare(a.etiqueta, b.etiqueta));
}
