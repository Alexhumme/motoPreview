import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Usuarios from '../Usuarios';
import { useAuth } from '../../context/authContexto';
import { usePermiso } from '../../context/usePermiso';
import { obtenerUsuarios } from '../../services/usuarios';
import { obtenerRoles } from '../../services/roles';
import { obtenerTiendas } from '../../services/tiendas';

vi.mock('../../context/authContexto', () => ({ useAuth: vi.fn() }));
vi.mock('../../context/usePermiso', () => ({ usePermiso: vi.fn() }));
vi.mock('../../services/usuarios', () => ({
  actualizarUsuario: vi.fn(),
  desactivarUsuario: vi.fn(),
  obtenerUsuarios: vi.fn(),
  registrarUsuario: vi.fn(),
}));
vi.mock('../../services/roles', () => ({ obtenerRoles: vi.fn() }));
vi.mock('../../services/tiendas', () => ({ obtenerTiendas: vi.fn() }));

const usuarios = [
  { id_usuario: 'usuario-1', usu_nombre: 'Ana Pérez', usu_email: 'ana@example.com', id_rol: 'rol-admin', estado_usuario: 'activo' },
  { id_usuario: 'usuario-2', usu_nombre: 'Luis Gómez', usu_email: 'luis@example.com', id_rol: 'rol-vendedor', estado_usuario: 'activo' },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ usuario: { id_tienda: 'tienda-1', id_usuario: 'usuario-actual' } });
  vi.mocked(usePermiso).mockReturnValue({ tienePermiso: () => true });
  vi.mocked(obtenerUsuarios).mockResolvedValue(usuarios);
  vi.mocked(obtenerRoles).mockResolvedValue([
    { id_rol: 'rol-admin', nombre_rol: 'Administrador' },
    { id_rol: 'rol-vendedor', nombre_rol: 'Vendedor' },
  ]);
  vi.mocked(obtenerTiendas).mockResolvedValue([]);
});

describe('Búsqueda de usuarios', () => {
  it('muestra una única barra de búsqueda', async () => {
    render(<Usuarios />);
    await screen.findByText('Ana Pérez');
    expect(screen.getAllByRole('searchbox')).toHaveLength(1);
    expect(screen.getByRole('searchbox', { name: 'Buscar en la tabla' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: 'Buscar usuarios' })).not.toBeInTheDocument();
    expect(screen.getByText('2 usuarios')).toBeInTheDocument();
  });

  it('busca por nombre, email y rol desde la tabla', async () => {
    render(<Usuarios />);
    await screen.findByText('Ana Pérez');
    const busqueda = screen.getByRole('searchbox', { name: 'Buscar en la tabla' });

    fireEvent.change(busqueda, { target: { value: 'luis@example.com' } });
    expect(screen.getByText('Luis Gómez')).toBeInTheDocument();
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();

    fireEvent.change(busqueda, { target: { value: 'Vendedor' } });
    expect(screen.getByText('Luis Gómez')).toBeInTheDocument();
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–1 de 1')).toBeInTheDocument();
  });

  it('combina el filtro de rol con la búsqueda y permite limpiarlos', async () => {
    render(<Usuarios />);
    await screen.findByText('Ana Pérez');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por Rol' }), { target: { value: 'Vendedor' } });
    expect(screen.getByText('Ningún registro coincide con la búsqueda.')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[0]);
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Luis Gómez')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });
});
