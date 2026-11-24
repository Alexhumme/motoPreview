import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Cotizaciones from '../Cotizaciones';
import Reportes from '../Reportes';
import { obtenerCotizaciones } from '../../services/cotizaciones';

vi.mock('../../context/authContexto', () => ({
  useAuth: () => ({ usuario: { id_tienda: 'tienda-1' } }),
}));
vi.mock('../../context/usePermiso', () => ({
  usePermiso: () => ({ tienePermiso: () => true }),
}));
vi.mock('../../services/cotizaciones', () => ({
  obtenerCotizaciones: vi.fn(),
  cambiarEstadoCotizacion: vi.fn(),
  crearCotizacion: vi.fn(),
}));

const cotizaciones = [{
  id_cotizacion: 'cotizacion-1',
  id_tienda: 'tienda-1',
  fecha_solicitud: new Date().toISOString(),
  coti_estado: 'aprobada',
  total: '200000',
  moto: {
    modelo_moto: {
      marca_moto: { marca_nombre: 'Yamaha' },
      modelo_nombre: 'FZ 2.0',
    },
  },
  usuario: { usu_nombre: 'Ana', usu_email: 'ana@example.com' },
  detalle_cotizacion: [{
    id_detalle_cotizacion: 'detalle-1',
    cantidad: 2,
    subtotal: '200000',
    producto: { id_producto: 'producto-1', nombre: 'Casco integral' },
  }],
}];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(obtenerCotizaciones).mockResolvedValue(cotizaciones);
});

describe('cotizaciones y reportes', () => {
  it('muestra el producto unificado al expandir una cotización', async () => {
    render(<Cotizaciones />);
    fireEvent.click(await screen.findByText('Yamaha FZ 2.0'));
    expect(await screen.findByText('2 × Casco integral')).toBeInTheDocument();
    expect(obtenerCotizaciones).toHaveBeenCalledWith('tienda-1');
  });

  it('calcula reportes con los productos de las cotizaciones', async () => {
    render(<Reportes />);
    expect(await screen.findByText('Casco integral')).toBeInTheDocument();
    expect(screen.getByText(/200\.000/)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('permite reintentar reportes cuando falla la carga', async () => {
    vi.mocked(obtenerCotizaciones).mockRejectedValueOnce(new Error('Sin conexión'));
    render(<Reportes />);
    expect(await screen.findByText('No se pudieron cargar los reportes.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Casco integral')).toBeInTheDocument();
  });
});
