import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../AuthProvider';
import { useAuth } from '../authContexto';
import api from '../../services/api';
import { obtenerPermisosUsuario } from '../../services/auth';

vi.mock('../../services/api', () => ({ default: { post: vi.fn() } }));
vi.mock('../../services/auth', () => ({ obtenerPermisosUsuario: vi.fn() }));

const sesion = { id_usuario: 'u1', usu_email: 'ana@example.com', id_rol: 'cliente' };

function Consumidor() {
  const { usuario, login, logout } = useAuth();
  return (
    <>
      <span>{usuario?.usu_email || 'Sin sesión'}</span>
      <button type="button" onClick={() => login('ana@example.com', 'Clave-Segura-123', true)}>Entrar persistente</button>
      <button type="button" onClick={() => login('ana@example.com', 'Clave-Segura-123', false)}>Entrar temporal</button>
      <button type="button" onClick={logout}>Salir</button>
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  vi.mocked(api.post).mockResolvedValue({ data: { token: 'token-jwt', usuario: sesion } });
  vi.mocked(obtenerPermisosUsuario).mockResolvedValue({ permisos: [] });
});

describe('AuthProvider y Recordarme', () => {
  it('guarda la sesión persistente y la elimina al salir', async () => {
    render(<AuthProvider><Consumidor /></AuthProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Entrar persistente' }));

    await waitFor(() => expect(localStorage.getItem('token')).toBe('token-jwt'));
    expect(JSON.parse(localStorage.getItem('usuario')).usu_email).toBe('ana@example.com');
    expect(sessionStorage.getItem('token')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByText('Sin sesión')).toBeInTheDocument();
  });

  it('guarda la sesión temporal solo en sessionStorage', async () => {
    render(<AuthProvider><Consumidor /></AuthProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Entrar temporal' }));

    await waitFor(() => expect(sessionStorage.getItem('token')).toBe('token-jwt'));
    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
  });
});
