import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminLayout from '../AdminLayout';
import { useAuth } from '../../context/authContexto';
import { usePermiso } from '../../context/usePermiso';
import { ROL_ADMIN, ROL_SUPERADMIN } from '../../utils/constants/roles';

vi.mock('../../context/authContexto', () => ({ useAuth: vi.fn() }));
vi.mock('../../context/usePermiso', () => ({ usePermiso: vi.fn() }));
vi.mock('../../context/temaContexto', () => ({
  useTema: () => ({ tema: 'oscuro', alternarTema: vi.fn() }),
}));

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/admin/catalogo']}>
      <AdminLayout />
    </MemoryRouter>,
  );
}

function abrirAdministracion() {
  fireEvent.click(screen.getByRole('button', { name: 'Administración' }));
  return screen.getByRole('complementary', { name: 'Enlaces de Administración' });
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(useAuth).mockReturnValue({
    usuario: { id_rol: ROL_SUPERADMIN, usu_nombre: 'Ana Pérez' },
    logout: vi.fn(),
  });
  vi.mocked(usePermiso).mockReturnValue({
    esSuperAdmin: () => true,
    tieneAlgunPermiso: () => false,
  });
});

describe('AdminLayout', () => {
  it('agrupa Catálogo RBAC en Administración para Superadmin', () => {
    renderLayout();
    const administracion = abrirAdministracion();
    expect(within(administracion).getByRole('link', { name: 'Catálogo RBAC' })).toHaveAttribute('href', '/admin/catalogo');

    fireEvent.click(screen.getByRole('button', { name: 'Catálogo' }));
    const catalogo = screen.getByRole('complementary', { name: 'Enlaces de Catálogo' });
    expect(within(catalogo).queryByRole('link', { name: 'Catálogo RBAC' })).not.toBeInTheDocument();
  });

  it('ofrece una sola entrada para inventario y accesorios', () => {
    vi.mocked(usePermiso).mockReturnValue({
      esSuperAdmin: () => true,
      tieneAlgunPermiso: () => true,
    });
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Catálogo' }));
    const catalogo = screen.getByRole('complementary', { name: 'Enlaces de Catálogo' });
    expect(within(catalogo).getByRole('link', { name: 'Inventario y accesorios' })).toHaveAttribute('href', '/admin/inventario');
    expect(within(catalogo).queryByRole('link', { name: 'Accesorios' })).not.toBeInTheDocument();
  });

  it('no muestra Catálogo RBAC a un administrador de tienda', () => {
    vi.mocked(useAuth).mockReturnValue({
      usuario: { id_rol: ROL_ADMIN, usu_nombre: 'Ana Pérez' },
      logout: vi.fn(),
    });
    vi.mocked(usePermiso).mockReturnValue({
      esSuperAdmin: () => false,
      tieneAlgunPermiso: () => true,
    });

    renderLayout();
    const administracion = abrirAdministracion();
    expect(within(administracion).queryByRole('link', { name: 'Catálogo RBAC' })).not.toBeInTheDocument();
  });
});
