import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import GestionInventarioTienda from '../GestionInventarioTienda';
import { actualizarInventario, obtenerInventario, obtenerMovimientos, registrarMovimiento } from '../../../services/inventario';

vi.mock('../../../services/inventario', () => ({
  actualizarInventario: vi.fn(),
  obtenerInventario: vi.fn(),
  obtenerMovimientos: vi.fn(),
  registrarMovimiento: vi.fn(),
}));
vi.mock('../../../context/usePermiso', () => ({
  usePermiso: () => ({ tienePermiso: () => true }),
}));

const inventario = {
  id_inventario: 'inv-1',
  stock_actual: 8,
  stock_minimo: 2,
  precio: '40000',
  estado_inventario: 'normal',
  producto: { nombre: 'Aceite sintético' },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(obtenerInventario).mockResolvedValue([inventario]);
  vi.mocked(obtenerMovimientos).mockResolvedValue([]);
});

describe('inventario de una tienda', () => {
  it('carga el inventario filtrado por tienda', async () => {
    render(<GestionInventarioTienda idTienda="tienda-1" />);
    expect(await screen.findByText('Aceite sintético')).toBeInTheDocument();
    expect(obtenerInventario).toHaveBeenCalledWith('tienda-1');
  });

  it('edita el mínimo y el precio sin modificar el stock directamente', async () => {
    vi.mocked(actualizarInventario).mockResolvedValue({ ...inventario, stock_minimo: 4 });
    render(<GestionInventarioTienda idTienda="tienda-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Stock mínimo'), { target: { value: '4' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(actualizarInventario).toHaveBeenCalledWith('inv-1', {
      stock_minimo: 4,
      precio: 40000,
    }));
  });

  it('consulta el historial de movimientos de la tienda', async () => {
    vi.mocked(obtenerMovimientos).mockResolvedValue([{
      id_movimiento: 'mov-1',
      fecha_movimiento: '2026-11-24T10:00:00Z',
      mov_cantidad: 2,
      producto: { nombre: 'Aceite sintético' },
      tipo: { tipomov_nombre: 'Entrada' },
      usuario: { usu_nombre: 'Ana' },
    }]);
    render(<GestionInventarioTienda idTienda="tienda-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver movimientos' }));
    await waitFor(() => expect(obtenerMovimientos).toHaveBeenCalledWith(null, 'tienda-1'));
    expect(await screen.findByRole('cell', { name: 'Entrada' })).toBeInTheDocument();
    expect(screen.getAllByText('Aceite sintético')).toHaveLength(2);
  });

  it('registra un movimiento y actualiza la fila de inventario', async () => {
    vi.mocked(registrarMovimiento).mockResolvedValue({
      inventarioActualizado: { ...inventario, stock_actual: 10 },
    });
    render(<GestionInventarioTienda idTienda="tienda-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Movimiento' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Tipo de movimiento'), { target: { value: 'cccccccc-0000-0000-0000-000000000001' } });
    fireEvent.change(within(dialogo).getByLabelText('Cantidad'), { target: { value: '2' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(registrarMovimiento).toHaveBeenCalledWith({
      id_inventario: 'inv-1',
      id_tipomov: 'cccccccc-0000-0000-0000-000000000001',
      mov_cantidad: 2,
      observaciones: null,
    }));
  });
});
