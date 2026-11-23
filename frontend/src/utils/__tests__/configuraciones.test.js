import {
  CLAVE_CONFIGURACIONES,
  LIMITE_NOMBRE,
  crearConfiguracion,
  guardarConfiguraciones,
  leerConfiguraciones,
  limpiarNombre,
  siguienteNumero,
} from '../configuraciones';

const pieza = (id, precio = 1000) => ({ id_accesorio: id, acc_nombre: `Pieza ${id}`, acc_precio: precio });

describe('configuraciones del taller', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('arranca con una sola configuración activa', () => {
    const { lista, activaId } = leerConfiguraciones();
    expect(lista).toHaveLength(1);
    expect(lista[0].nombre).toBe('Configuración 1');
    expect(lista[0].piezas).toEqual([]);
    expect(activaId).toBe(lista[0].id);
  });

  it('persiste la lista y el tab activo', () => {
    const primera = crearConfiguracion(1);
    const segunda = { ...crearConfiguracion(2), piezas: [pieza('a')] };
    guardarConfiguraciones({ lista: [primera, segunda], activaId: segunda.id });
    const { lista, activaId } = leerConfiguraciones();
    expect(lista.map((c) => c.nombre)).toEqual(['Configuración 1', 'Configuración 2']);
    expect(lista[1].piezas[0].id_accesorio).toBe('a');
    expect(activaId).toBe(segunda.id);
    expect(window.localStorage.getItem(CLAVE_CONFIGURACIONES)).toBeTruthy();
  });

  it('vuelve al primer tab si el activo guardado ya no existe', () => {
    const primera = crearConfiguracion(1);
    guardarConfiguraciones({ lista: [primera], activaId: 'cfg-borrada' });
    expect(leerConfiguraciones().activaId).toBe(primera.id);
  });

  it('descarta datos corruptos sin romper la vista', () => {
    window.localStorage.setItem(CLAVE_CONFIGURACIONES, '{esto no es json');
    expect(leerConfiguraciones().lista).toHaveLength(1);
    window.localStorage.setItem(CLAVE_CONFIGURACIONES, JSON.stringify({ lista: 'no-array' }));
    expect(leerConfiguraciones().lista).toHaveLength(1);
  });

  it('sanea piezas repetidas, sin precio y de otra forma', () => {
    const sucia = {
      ...crearConfiguracion(1),
      piezas: [pieza('a'), pieza('a'), pieza('b', 'no-numero'), null, pieza('c', 2500)],
      tipos: ['x', null, 3],
      moto: { marca: 'm1', modelo: 42 },
    };
    guardarConfiguraciones({ lista: [sucia], activaId: sucia.id });
    const [config] = leerConfiguraciones().lista;
    expect(config.piezas.map((p) => p.id_accesorio)).toEqual(['a', 'c']);
    expect(config.tipos).toEqual(['x', 3]);
    expect(config.moto).toEqual({ marca: 'm1', modelo: '', anio: '', busqueda: '' });
  });

  it('ignora ids duplicados y entradas que no son configuraciones', () => {
    const primera = crearConfiguracion(1);
    guardarConfiguraciones({ lista: [primera, null, primera, 'x'], activaId: null });
    expect(leerConfiguraciones().lista).toHaveLength(1);
  });

  it('numera sin chocar con nombres renombrados o tabs borrados', () => {
    const lista = [crearConfiguracion(1), { ...crearConfiguracion(2), nombre: 'Viaje norte' }];
    expect(siguienteNumero(lista)).toBe(3);
    lista.push({ ...crearConfiguracion(3), nombre: 'Configuración 3' });
    expect(siguienteNumero(lista)).toBe(4);
    expect(siguienteNumero([crearConfiguracion(1)])).toBe(2);
  });

  it('limpia el nombre: recorta espacios y respeta el límite', () => {
    expect(limpiarNombre('  Paseo diario  ')).toBe('Paseo diario');
    expect(limpiarNombre('a'.repeat(80))).toHaveLength(LIMITE_NOMBRE);
    expect(limpiarNombre(null)).toBe('');
    expect(limpiarNombre('   ')).toBe('');
  });
});