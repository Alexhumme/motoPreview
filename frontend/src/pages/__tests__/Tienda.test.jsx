import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Tienda from '../Tienda';
import { useAuth } from '../../context/authContexto';
import { usePermiso } from '../../context/usePermiso';
import { actualizarTienda, obtenerTienda } from '../../services/tiendas';

vi.mock('../../context/authContexto', () => ({ useAuth: vi.fn() }));
vi.mock('../../context/usePermiso', () => ({ usePermiso: vi.fn() }));
vi.mock('../../services/tiendas', () => ({ actualizarTienda: vi.fn(), obtenerTienda: vi.fn() }));

const tienda = {
  id_tienda: 'tienda-1',
  nombre_tienda: 'Tienda Norte',
  nit: '900123456-7',
  estado_tienda: 'activa',
  plan_subscripcion: { plan_nombre: 'Pro', precio_mensual: '50000' },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ usuario: { id_tienda: 'tienda-1' } });
  vi.mocked(usePermiso).mockReturnValue({ tienePermiso: () => true });
  vi.mocked(obtenerTienda).mockResolvedValue(tienda);
  vi.mocked(actualizarTienda).mockResolvedValue(tienda);
});

describe('Ficha de la tienda', () => {
  it('permite editar con el permiso RBAC correspondiente', async () => {
    render(<Tienda />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Nombre de la tienda'), { target: { value: 'Tienda Actualizada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(actualizarTienda).toHaveBeenCalledWith('tienda-1', expect.objectContaining({
      nombre_tienda: 'Tienda Actualizada',
    })));
  });

  it('oculta la edición sin permiso de actualización', async () => {
    vi.mocked(usePermiso).mockReturnValue({ tienePermiso: () => false });
    render(<Tienda />);
    expect(await screen.findByText('Tienda Norte')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });
});
