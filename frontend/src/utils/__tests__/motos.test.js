import { etiquetaMoto, filtrarMotos, idMarcaMoto, sinAcentos } from '../motos';

const motos = [
  {
    id_moto: 'm1',
    moto_anio: 2022,
    modelo_moto: {
      id_modelo_moto: 'mo1',
      id_marca: 'b1',
      modelo_nombre: 'Monster',
      cilindraje: '937 cc',
      marca_moto: { id_marca: 'b1', marca_nombre: 'Ducati', marca_pais: 'Italia' },
    },
  },
  {
    id_moto: 'm2',
    moto_anio: 2023,
    modelo_moto: {
      id_modelo_moto: 'mo2',
      id_marca: 'b2',
      modelo_nombre: 'MT-07',
      cilindraje: '689 cc',
      marca_moto: { id_marca: 'b2', marca_nombre: 'Yamaha', marca_pais: 'Japón' },
    },
  },
  {
    id_moto: 'm3',
    moto_anio: 2021,
    modelo_moto: {
      id_modelo_moto: 'mo3',
      id_marca: 'b2',
      modelo_nombre: 'R3',
      cilindraje: '321 cc',
      marca_moto: { id_marca: 'b2', marca_nombre: 'Yamaha', marca_pais: 'Japón' },
    },
  },
];

const ids = (lista) => lista.map((opcion) => opcion.id);

describe('etiquetaMoto', () => {
  it('une marca, modelo y año en el texto que queda en el input', () => {
    expect(etiquetaMoto(motos[0])).toBe('Ducati Monster 2022');
  });

  it('devuelve cadena vacía sin moto y omite las partes que faltan', () => {
    expect(etiquetaMoto(null)).toBe('');
    expect(etiquetaMoto({ modelo_moto: { modelo_nombre: 'R3' } })).toBe('R3');
  });
});

describe('idMarcaMoto', () => {
  it('prefiere la marca anidada y cae al id del modelo si no viene', () => {
    expect(idMarcaMoto(motos[0])).toBe('b1');
    expect(idMarcaMoto({ modelo_moto: { id_marca: 'suelto' } })).toBe('suelto');
    expect(idMarcaMoto(null)).toBe('');
  });
});

describe('sinAcentos', () => {
  it('normaliza acentos, mayúsculas y valores nulos', () => {
    expect(sinAcentos('Japón')).toBe('japon');
    expect(sinAcentos(null)).toBe('');
  });
});

describe('filtrarMotos', () => {
  it('sin consulta devuelve todo el catálogo ordenado por etiqueta', () => {
    expect(ids(filtrarMotos(motos, ''))).toEqual(['m1', 'm2', 'm3']);
  });

  it('filtra por marca sin distinguir acentos ni mayúsculas', () => {
    expect(ids(filtrarMotos(motos, 'YAMAHA'))).toEqual(['m2', 'm3']);
    expect(ids(filtrarMotos(motos, 'japon'))).toEqual(['m2', 'm3']);
  });

  it('todas las palabras de la consulta deben aparecer', () => {
    expect(ids(filtrarMotos(motos, 'yamaha 2021'))).toEqual(['m3']);
    expect(ids(filtrarMotos(motos, 'yamaha ducati'))).toEqual([]);
  });

  it('también busca por cilindraje y por año', () => {
    expect(ids(filtrarMotos(motos, '937'))).toEqual(['m1']);
    expect(ids(filtrarMotos(motos, '2023'))).toEqual(['m2']);
  });

  it('pone primero el modelo que empieza por lo escrito', () => {
    expect(ids(filtrarMotos(motos, 'mt'))).toEqual(['m2']);
    const marcas = filtrarMotos(motos, 'r');
    expect(marcas[0].id).toBe('m3');
  });

  it('expone los renglones de la sugerencia además de la etiqueta', () => {
    const [opcion] = filtrarMotos(motos, 'monster');
    expect(opcion).toMatchObject({
      id: 'm1',
      etiqueta: 'Ducati Monster 2022',
      modelo: 'Monster',
      marca: 'Ducati',
      anio: 2022,
      detalle: '937 cc · Italia',
      moto: motos[0],
    });
  });

  it('devuelve vacío sin coincidencias y tolera un catálogo que no es lista', () => {
    expect(filtrarMotos(motos, 'zzz')).toEqual([]);
    expect(filtrarMotos(null, '')).toEqual([]);
    expect(filtrarMotos([{ modelo_nombre: 'sin id' }, null], '')).toEqual([]);
  });
});