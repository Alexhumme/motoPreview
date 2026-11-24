import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Configurador from '../public/Configurador';
import { useCart } from '../../context/CartContext';
import { obtenerMotos } from '../../services/motos';
import { obtenerAccesorios, obtenerTiposProducto } from '../../services/accesorios';

vi.mock('../../context/CartContext', () => ({ useCart: vi.fn() }));
vi.mock('../../services/motos', () => ({ obtenerMotos: vi.fn() }));
vi.mock('../../services/accesorios', () => ({
  obtenerAccesorios: vi.fn(),
  obtenerTiposProducto: vi.fn(),
}));
vi.mock('../../components/buttons/SiteHeader', () => ({ default: () => null }));
vi.mock('../../components/ImagenProducto', () => ({
  default: ({ src, alt, className }) => <img src={src} alt={alt} className={className} />,
}));
vi.mock('../../utils/motion', () => ({ refrescarMovimiento: vi.fn() }));

const motos = [
  {
    id_moto: 'm1',
    moto_anio: 2023,
    modelo_moto: {
      id_modelo_moto: 'mo1',
      id_marca: 'b1',
      modelo_nombre: 'MT-07',
      cilindraje: '689 cc',
      marca_moto: { id_marca: 'b1', marca_nombre: 'Yamaha', marca_pais: 'Japón' },
    },
  },
  {
    id_moto: 'm2',
    moto_anio: 2022,
    modelo_moto: {
      id_modelo_moto: 'mo2',
      id_marca: 'b2',
      modelo_nombre: 'Monster',
      cilindraje: '937 cc',
      marca_moto: { id_marca: 'b2', marca_nombre: 'Ducati', marca_pais: 'Italia' },
    },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  vi.mocked(useCart).mockReturnValue({
    items: [],
    agregarItem: vi.fn(),
    eliminarItem: vi.fn(),
    actualizarCantidad: vi.fn(),
    totalItems: 0,
  });
  vi.mocked(obtenerMotos).mockResolvedValue(motos);
  vi.mocked(obtenerAccesorios).mockResolvedValue([]);
  vi.mocked(obtenerTiposProducto).mockResolvedValue([]);
});

describe('Configurador', () => {
  it('selecciona una sugerencia sin romper la configuración ni sus etiquetas', async () => {
    render(
      <MemoryRouter>
        <Configurador />
      </MemoryRouter>,
    );

    const buscador = await screen.findByRole('combobox', { name: 'Buscar moto' });
    fireEvent.change(buscador, { target: { value: 'yamaha' } });
    const sugerencias = await screen.findByRole('listbox', { name: 'Motos sugeridas' });
    fireEvent.click(within(sugerencias).getByRole('option', { name: /MT-07/ }));

    expect(buscador).toHaveValue('Yamaha MT-07 2023');
    expect(document.querySelector('#config-marca')).toHaveValue('b1');
    expect(document.querySelector('#config-modelo')).toHaveValue('mo1');
    expect(document.querySelector('#config-anio')).toHaveValue('2023');
    expect(screen.getByRole('tab')).toHaveTextContent('Yamaha · MT-07 · 2023');

    await waitFor(() => {
      const guardado = JSON.parse(window.localStorage.getItem('configuraciones'));
      expect(guardado.lista[0].moto).toEqual({
        marca: 'b1',
        modelo: 'mo1',
        anio: '2023',
        busqueda: 'Yamaha MT-07 2023',
      });
    });
  });
});
