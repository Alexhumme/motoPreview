import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Inventario from '../Inventario';
import { useAuth } from '../../context/authContexto';
import { usePermiso } from '../../context/usePermiso';
import {
  crearProducto,
  obtenerCategorias,
  obtenerMarcasProducto,
  obtenerProductos,
  obtenerTiposProducto,
} from '../../services/accesorios';
import { crearInventario, obtenerInventario, registrarMovimiento } from '../../services/inventario';
import { TIPO_ENTRADA } from '../../utils/constants/tiposMovimiento';

vi.mock('../../context/authContexto', () => ({ useAuth: vi.fn() }));
vi.mock('../../context/usePermiso', () => ({ usePermiso: vi.fn() }));
vi.mock('../../services/accesorios', () => ({
  actualizarProducto: vi.fn(),
  crearProducto: vi.fn(),
  obtenerCategorias: vi.fn(),
  obtenerMarcasProducto: vi.fn(),
  obtenerProductos: vi.fn(),
  obtenerTiposProducto: vi.fn(),
}));
vi.mock('../../services/inventario', () => ({
  crearInventario: vi.fn(),
  obtenerInventario: vi.fn(),
  registrarMovimiento: vi.fn(),
}));

const productos = [
  {
    id_accesorio: 'producto-aceite',
    acc_nombre: 'Aceite sintético',
    acc_precio: '35000',
    acc_estado: 'disponible',
    es_accesorio: false,
    categoria_producto: { id_categoria_producto: 'categoria-1', nombre: 'Mantenimiento' },
    marca: { id_marca: 'marca-1', nombre: 'Motozone' },
    tipos: [],
    producto: {
      id_producto: 'producto-aceite',
      nombre: 'Aceite sintético',
      precio: '35000',
      es_accesorio: false,
      tipos: [],
    },
  },
  {
    id_accesorio: 'producto-casco',
    acc_nombre: 'Casco integral',
    acc_precio: '180000',
    acc_estado: 'disponible',
    es_accesorio: true,
    tipos: [{ id_tipo_producto: 'tipo-casco', nombre: 'Cascos', accesorio: true }],
    producto: {
      id_producto: 'producto-casco',
      nombre: 'Casco integral',
      precio: '180000',
      es_accesorio: true,
      id_categoria_producto: 'categoria-1',
      id_marca: 'marca-1',
      tipos: [{ id_tipo_producto: 'tipo-casco', nombre: 'Cascos', accesorio: true }],
    },
  },
];

const inventario = [{
  id_inventario: 'inventario-1',
  id_producto: 'producto-aceite',
  stock_actual: 4,
  stock_minimo: 2,
  estado_inventario: 'normal',
  accesorio: productos[0],
  producto: productos[0].producto,
}];

function renderInventario() {
  return render(<MemoryRouter><Inventario /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ usuario: { id_tienda: 'tienda-1' } });
  vi.mocked(usePermiso).mockReturnValue({ tienePermiso: () => true });
  vi.mocked(obtenerInventario).mockResolvedValue(inventario);
  vi.mocked(obtenerProductos).mockResolvedValue(productos);
  vi.mocked(obtenerCategorias).mockResolvedValue([{ id_categoria_producto: 'categoria-1', nombre: 'Mantenimiento' }]);
  vi.mocked(obtenerMarcasProducto).mockResolvedValue([{ id_marca: 'marca-1', nombre: 'Motozone' }]);
  vi.mocked(obtenerTiposProducto).mockResolvedValue([{ id_tipo_producto: 'tipo-casco', nombre: 'Cascos', accesorio: true }]);
});

describe('Inventario unificado', () => {
  it('muestra el producto común en inventario y registra movimientos', async () => {
    renderInventario();
    expect(await screen.findByText('Aceite sintético')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Movimiento' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Tipo de movimiento'), { target: { value: TIPO_ENTRADA } });
    fireEvent.change(within(dialogo).getByLabelText('Cantidad'), { target: { value: '3' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(registrarMovimiento).toHaveBeenCalledWith(expect.objectContaining({
      id_inventario: 'inventario-1',
      id_tipomov: TIPO_ENTRADA,
      mov_cantidad: 3,
    })));
  });

  it('distingue productos generales de accesorios en el catálogo', async () => {
    renderInventario();
    await screen.findByText('Aceite sintético');
    fireEvent.click(screen.getByRole('button', { name: 'Catálogo' }));
    const filaAceite = (await screen.findByText('Aceite sintético')).closest('tr');
    expect(within(filaAceite).getByText('Producto general')).toBeInTheDocument();
    const filaAccesorio = screen.getByText('Casco integral').closest('tr');
    expect(within(filaAccesorio).getByText('Accesorio')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Movimiento' })).not.toBeInTheDocument();
  });

  it('guarda un producto con sus tipos para clasificarlo como accesorio', async () => {
    vi.mocked(crearProducto).mockResolvedValue({});
    renderInventario();
    await screen.findByText('Aceite sintético');
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo producto' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Nombre'), { target: { value: 'Casco deportivo' } });
    fireEvent.change(within(dialogo).getByLabelText('Precio (COP)'), { target: { value: '95000' } });
    fireEvent.click(within(dialogo).getByLabelText(/Cascos/));
    expect(within(dialogo).getByText('Este producto se mostrará en el configurador.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar producto' }));
    await waitFor(() => expect(crearProducto).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Casco deportivo',
      precio: 95000,
      id_tipos: ['tipo-casco'],
    })));
  });

  it('permite asociar al inventario un producto que aún no tiene stock', async () => {
    vi.mocked(crearInventario).mockResolvedValue({});
    renderInventario();
    await screen.findByText('Aceite sintético');
    fireEvent.click(screen.getByRole('button', { name: 'Catálogo' }));
    const fila = (await screen.findByText('Casco integral')).closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: 'Inventario' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Stock inicial'), { target: { value: '5' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Agregar' }));
    await waitFor(() => expect(crearInventario).toHaveBeenCalledWith(expect.objectContaining({
      id_producto: 'producto-casco',
      stock_actual: 5,
      stock_minimo: 0,
    })));
  });

  it('oculta las mutaciones cuando la cuenta solo tiene permiso de lectura', async () => {
    vi.mocked(usePermiso).mockReturnValue({ tienePermiso: (recurso, accion) => recurso === 'inventario' && accion === 'listar' });
    renderInventario();
    await screen.findByText('Aceite sintético');
    expect(screen.queryByRole('button', { name: 'Nuevo producto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Movimiento' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Catálogo' }));
    const fila = (await screen.findByText('Casco integral')).closest('tr');
    expect(within(fila).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(within(fila).queryByRole('button', { name: 'Inventario' })).not.toBeInTheDocument();
  });
});
