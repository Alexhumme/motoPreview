import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SelectorMoto from '../SelectorMoto';

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

const elegidas = [];
const textos = [];

function Campo({ opcionNinguna = '', inicial = '' }) {
  const [texto, setTexto] = useState(inicial);
  return (
    <SelectorMoto
      id="moto"
      motos={motos}
      texto={texto}
      onTexto={(valor) => { textos.push(valor); setTexto(valor); }}
      onElegir={(moto) => { elegidas.push(moto); }}
      opcionNinguna={opcionNinguna}
    />
  );
}

function escribir(valor) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: valor } });
}

describe('SelectorMoto', () => {
  beforeEach(() => {
    elegidas.length = 0;
    textos.length = 0;
  });

  it('arranca cerrado y despliega las sugerencias al escribir', () => {
    render(<Campo />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    escribir('yamaha');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByText('689 cc · Japón')).toBeInTheDocument();
  });

  it('resalta la palabra escrita dentro de la sugerencia', () => {
    render(<Campo />);
    escribir('monster');
    const resalte = document.querySelector('.selector-moto__resalte');
    expect(resalte).toHaveTextContent('Monster');
  });

  it('Enter elige la opción activa y compromete la etiqueta en el input', () => {
    render(<Campo />);
    escribir('yamaha');
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(elegidas).toEqual([motos[1]]);
    expect(screen.getByRole('combobox')).toHaveValue('Yamaha MT-07 2023');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('las flechas mueven la opción activa y Enter la elige', () => {
    render(<Campo />);
    const input = screen.getByRole('combobox');
    escribir('yamaha');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(elegidas).toEqual([motos[2]]);
  });

  it('ArrowUp desde la primera opción salta a la última', () => {
    render(<Campo />);
    const input = screen.getByRole('combobox');
    escribir('yamaha');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('Enter con la lista cerrada la abre en vez de enviar el formulario', () => {
    const onSubmit = vi.fn((evento) => evento.preventDefault());
    render(<form onSubmit={onSubmit}><Campo /></form>);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Escape cierra la lista sin elegir nada', () => {
    render(<Campo />);
    const input = screen.getByRole('combobox');
    escribir('ducati');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(elegidas).toEqual([]);
    expect(input).toHaveValue('ducati');
  });

  it('el clic fuera cierra la lista', () => {
    render(<Campo />);
    escribir('ducati');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('elegir con clic devuelve la moto completa', () => {
    render(<Campo />);
    escribir('r3');
    fireEvent.click(screen.getByRole('option'));
    expect(elegidas).toEqual([motos[2]]);
    expect(screen.getByRole('combobox')).toHaveValue('Yamaha R3 2021');
  });

  it('el botón de borrar vacía el texto y avisa con null', () => {
    render(<Campo inicial="Yamaha R3 2021" />);
    fireEvent.click(screen.getByRole('button', { name: 'Borrar moto' }));
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(elegidas).toEqual([null]);
  });

  it('la opción «ninguna» se ofrece primero y devuelve null', () => {
    render(<Campo opcionNinguna="Sin moto específica" />);
    fireEvent.focus(screen.getByRole('combobox'));
    const opciones = screen.getAllByRole('option');
    expect(opciones).toHaveLength(4);
    fireEvent.click(opciones[0]);
    expect(elegidas).toEqual([null]);
    expect(screen.getByRole('combobox')).toHaveValue('Sin moto específica');
  });

  it('al enfocar una moto ya elegida vuelve a mostrar todo el catálogo', () => {
    render(<Campo inicial="Yamaha R3 2021" />);
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('avisa cuando no hay coincidencias', () => {
    render(<Campo />);
    escribir('zzz');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.getByText(/Sin coincidencias para «zzz»/)).toBeInTheDocument();
  });

  it('mantiene un solo punto de tabulación y anuncia el total a lectores de pantalla', () => {
    render(<Campo />);
    escribir('yamaha');
    expect(screen.getByRole('status')).toHaveTextContent('2 motos disponibles');
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-autocomplete', 'list');
    expect(screen.getByRole('button', { name: 'Borrar moto' })).toBeInTheDocument();
  });
});