// Búsqueda de motos compartida por el configurador y el carrito.
// El catálogo de motos es pequeño y llega completo de la API, así que el
// filtrado y el orden se resuelven en el cliente mientras el usuario escribe.

const colator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export function sinAcentos(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function idMarcaMoto(moto) {
  return moto?.modelo_moto?.marca_moto?.id_marca || moto?.modelo_moto?.id_marca || '';
}

export function etiquetaMoto(moto) {
  if (!moto) return '';
  return [
    moto.modelo_moto?.marca_moto?.marca_nombre,
    moto.modelo_moto?.modelo_nombre,
    moto.moto_anio,
  ]
    .filter((parte) => parte !== undefined && parte !== null && parte !== '')
    .join(' ')
    .trim();
}

/**
 * Opciones de la lista de sugerencias: `etiqueta` es el texto que queda en el
 * input al elegir, y el resto alimenta los dos renglones de cada opción.
 * Todas las palabras de la consulta deben aparecer; el orden prioriza el
 * modelo que empieza por lo escrito, luego la marca y por último el año.
 */
export function filtrarMotos(motos, consulta) {
  const tokens = sinAcentos(consulta).split(/\s+/).filter(Boolean);
  const primera = tokens[0] || '';

  const opciones = [];
  for (const moto of Array.isArray(motos) ? motos : []) {
    if (!moto?.id_moto) continue;
    const modelo = moto.modelo_moto?.modelo_nombre || '';
    const marca = moto.modelo_moto?.marca_moto?.marca_nombre || '';
    const cilindraje = moto.modelo_moto?.cilindraje || '';
    const pais = moto.modelo_moto?.marca_moto?.marca_pais || '';
    const anio = moto.moto_anio ?? '';
    const pajar = sinAcentos([marca, modelo, anio, cilindraje, pais].join(' '));
    if (!tokens.every((token) => pajar.includes(token))) continue;

    const modeloPlano = sinAcentos(modelo);
    const marcaPlana = sinAcentos(marca);
    let rango = 3;
    if (primera && modeloPlano.startsWith(primera)) rango = 0;
    else if (primera && marcaPlana.startsWith(primera)) rango = 1;
    else if (primera && String(anio) === primera) rango = 2;

    opciones.push({
      id: moto.id_moto,
      etiqueta: etiquetaMoto(moto),
      modelo,
      marca,
      anio,
      detalle: [cilindraje, pais].filter(Boolean).join(' · '),
      rango,
      moto,
    });
  }

  return opciones.sort((a, b) => a.rango - b.rango || colator.compare(a.etiqueta, b.etiqueta));
}