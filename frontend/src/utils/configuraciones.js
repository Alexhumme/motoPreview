// Taller del configurador: cada configuración es un tab con su moto, sus capas
// de tipo y sus piezas. Se guarda en la sesión del usuario, como el carrito.

export const CLAVE_CONFIGURACIONES = 'configuraciones';
export const LIMITE_NOMBRE = 40;

let secuencia = 0;

function nuevoId() {
  secuencia += 1;
  return `cfg-${Date.now().toString(36)}-${secuencia}`;
}

export function limpiarNombre(nombre) {
  return typeof nombre === 'string' ? nombre.trim().slice(0, LIMITE_NOMBRE) : '';
}

export function crearConfiguracion(numero) {
  return {
    id: nuevoId(),
    nombre: `Configuración ${numero}`,
    moto: { marca: '', modelo: '', anio: '', busqueda: '' },
    tipos: [],
    piezas: [],
  };
}

// El número sale del hueco más alto que quede libre: borrar o renombrar tabs
// no puede producir dos "Configuración 1".
export function siguienteNumero(lista) {
  const nombres = new Set(lista.map((c) => c.nombre));
  let numero = lista.length + 1;
  while (nombres.has(`Configuración ${numero}`)) numero += 1;
  return numero;
}

function normalizarMoto(moto) {
  const texto = (valor) => (typeof valor === 'string' ? valor : '');
  return {
    marca: texto(moto?.marca),
    modelo: texto(moto?.modelo),
    anio: texto(moto?.anio),
    busqueda: texto(moto?.busqueda),
  };
}

function normalizarTipos(tipos) {
  if (!Array.isArray(tipos)) return [];
  return tipos.filter((id) => typeof id === 'number' || typeof id === 'string');
}

// Las piezas guardan el accesorio completo (igual que las líneas del carrito)
// para que el resumen y el total no dependan de una nueva consulta.
function normalizarPiezas(piezas) {
  if (!Array.isArray(piezas)) return [];
  const vistas = new Set();
  const lista = [];
  for (const pieza of piezas) {
    const id = pieza?.id_accesorio;
    if (!id || vistas.has(id) || !Number.isFinite(Number(pieza.acc_precio))) continue;
    vistas.add(id);
    lista.push(pieza);
  }
  return lista;
}

function normalizarConfiguracion(dato, indice) {
  if (!dato || typeof dato !== 'object') return null;
  return {
    id: typeof dato.id === 'string' && dato.id ? dato.id : nuevoId(),
    nombre: limpiarNombre(dato.nombre) || `Configuración ${indice + 1}`,
    moto: normalizarMoto(dato.moto),
    tipos: normalizarTipos(dato.tipos),
    piezas: normalizarPiezas(dato.piezas),
  };
}

export function leerConfiguraciones() {
  let lista = [];
  let activaId = null;
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_CONFIGURACIONES) || 'null');
    if (guardado && Array.isArray(guardado.lista)) {
      const ids = new Set();
      for (const [indice, dato] of guardado.lista.entries()) {
        const config = normalizarConfiguracion(dato, indice);
        if (!config || ids.has(config.id)) continue;
        ids.add(config.id);
        lista.push(config);
      }
      if (typeof guardado.activaId === 'string') activaId = guardado.activaId;
    }
  } catch {
    lista = [];
  }
  if (lista.length === 0) lista = [crearConfiguracion(1)];
  if (!lista.some((c) => c.id === activaId)) activaId = lista[0].id;
  return { lista, activaId };
}

export function guardarConfiguraciones(estado) {
  try {
    localStorage.setItem(CLAVE_CONFIGURACIONES, JSON.stringify(estado));
  } catch {
    // Sin almacenamiento disponible: el taller sigue funcionando en memoria.
  }
}