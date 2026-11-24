import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Tiendas from '../Tiendas';
import { useAuth } from '../../context/authContexto';
import { usePermiso } from '../../context/usePermiso';
import {
  actualizarTienda,
  crearTienda,
  eliminarTienda,
  obtenerPlanesSuscripcion,
  obtenerTiendas,
} from '../../services/tiendas';

vi.mock('../../context/authContexto', () => ({ useAuth: vi.fn() }));
vi.mock('../../context/usePermiso', () => ({ usePermiso: vi.fn() }));
vi.mock('../../services/tiendas', () => ({
  actualizarTienda: vi.fn(),
  crearTienda: vi.fn(),
  eliminarTienda: vi.fn(),
  obtenerPlanesSuscripcion: vi.fn(),
  obtenerTiendas: vi.fn(),
}));

const tienda = {
  id_tienda: 'tienda-1',
  nombre_tienda: 'Tienda Norte',
  nit: '900123456-7',
  direccion_tienda: 'Calle 10',
  telefono_tienda: '3001234567',
  email_tienda: 'norte@example.com',
  id_plan: 'plan-1',
  estado_tienda: 'activa',
  plan_subscripcion: { id_plan: 'plan-1', plan_nombre: 'Pro' },
};

function renderTiendas() {
  return render(<MemoryRouter><Tiendas /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ usuario: { id_tienda: null } });
  vi.mocked(usePermiso).mockReturnValue({ tienePermiso: () => true, esSuperAdmin: () => true });
  vi.mocked(obtenerTiendas).mockResolvedValue([tienda]);
  vi.mocked(obtenerPlanesSuscripcion).mockResolvedValue([
    { id_plan: 'plan-1', plan_nombre: 'Pro' },
    { id_plan: 'plan-2', plan_nombre: 'Premium' },
  ]);
  vi.mocked(crearTienda).mockResolvedValue({ id_tienda: 'tienda-2' });
  vi.mocked(actualizarTienda).mockResolvedValue(tienda);
  vi.mocked(eliminarTienda).mockResolvedValue({ mensaje: 'Tienda desactivada.' });
});

describe('Administración de tiendas', () => {
  it('lista tiendas y ofrece el resumen', async () => {
    renderTiendas();
    expect(await screen.findByText('Tienda Norte')).toBeInTheDocument();
    expect(screen.getByText('900123456-7')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Resumen/ })).toHaveAttribute('href', '/admin/tiendas/tienda-1');
  });

  it('crea una tienda con plan y normaliza campos vacíos', async () => {
    renderTiendas();
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva tienda' }));
    const dialogo = screen.getByRole('dialog');
    await screen.findByRole('option', { name: 'Premium' });
    fireEvent.change(within(dialogo).getByLabelText('Nombre'), { target: { value: 'Tienda Sur' } });
    fireEvent.change(within(dialogo).getByLabelText('NIT'), { target: { value: '900987654-3' } });
    fireEvent.change(within(dialogo).getByLabelText('Email'), { target: { value: 'sur@example.com' } });
    fireEvent.change(within(dialogo).getByLabelText('Plan'), { target: { value: 'plan-2' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar tienda' }));

    await waitFor(() => expect(crearTienda).toHaveBeenCalledWith({
      nombre_tienda: 'Tienda Sur',
      nit: '900987654-3',
      direccion_tienda: null,
      telefono_tienda: null,
      email_tienda: 'sur@example.com',
      id_plan: 'plan-2',
      estado_tienda: 'activa',
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Tienda creada correctamente.');
  });

  it('edita una tienda mediante PATCH', async () => {
    renderTiendas();
    fireEvent.click((await screen.findByText('Tienda Norte')).closest('tr').querySelector('button'));
    const dialogo = screen.getByRole('dialog');
    await screen.findByRole('option', { name: 'Pro' });
    expect(within(dialogo).getByLabelText('Nombre')).toHaveValue('Tienda Norte');
    fireEvent.change(within(dialogo).getByLabelText('Estado'), { target: { value: 'suspendida' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar tienda' }));

    await waitFor(() => expect(actualizarTienda).toHaveBeenCalledWith('tienda-1', expect.objectContaining({
      nombre_tienda: 'Tienda Norte',
      estado_tienda: 'suspendida',
      id_plan: 'plan-1',
    })));
  });

  it('confirma la desactivación lógica y conserva el historial', async () => {
    renderTiendas();
    fireEvent.click((await screen.findByText('Tienda Norte')).closest('tr').querySelectorAll('button')[1]);
    const dialogo = screen.getByRole('alertdialog');
    expect(dialogo).toHaveTextContent('historial se conservan');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar desactivación' }));

    await waitFor(() => expect(eliminarTienda).toHaveBeenCalledWith('tienda-1'));
    expect(await screen.findByRole('status')).toHaveTextContent('Tienda desactivada.');
  });

  it('oculta las mutaciones sin permisos de escritura', async () => {
    vi.mocked(usePermiso).mockReturnValue({ tienePermiso: () => false, esSuperAdmin: () => false });
    renderTiendas();
    await screen.findByText('Tienda Norte');
    expect(screen.queryByRole('button', { name: 'Nueva tienda' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Resumen/ })).toBeInTheDocument();
  });

  it('muestra errores de validación del backend', async () => {
    vi.mocked(crearTienda).mockRejectedValue({ response: { data: { error: { nit: ['Este NIT ya existe.'] } } } });
    renderTiendas();
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva tienda' }));
    const dialogo = screen.getByRole('dialog');
    await screen.findByRole('option', { name: 'Pro' });
    fireEvent.change(within(dialogo).getByLabelText('Nombre'), { target: { value: 'Tienda duplicada' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar tienda' }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Este NIT ya existe.');
  });
});
