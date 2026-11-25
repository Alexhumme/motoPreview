import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '../auth/Login';
import { useAuth } from '../../context/authContexto';
import { ROL_CLIENTE } from '../../utils/constants/roles';

vi.mock('../../context/authContexto', () => ({ useAuth: vi.fn() }));
vi.mock('../../components/buttons/SiteHeader', () => ({ default: () => null }));

const login = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ login });
  login.mockResolvedValue({ id_rol: ROL_CLIENTE });
});

function completarCaptcha() {
  const pregunta = screen.getByText(/Verificación: ¿cuánto es/);
  const [, a, operador, b] = pregunta.textContent.match(/(\d+)\s+([+−×-])\s+(\d+)/);
  const izquierda = Number(a);
  const derecha = Number(b);
  const resultado = operador === '+' ? izquierda + derecha : operador === '-' ? izquierda - derecha : izquierda * derecha;
  fireEvent.change(screen.getByLabelText(/Verificación:/), { target: { value: String(resultado) } });
}

async function enviarLogin(recordarme) {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave-Segura-123' } });
  if (recordarme) fireEvent.click(screen.getByRole('checkbox', { name: 'Recordarme' }));
  completarCaptcha();
  fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/ }));
  await waitFor(() => expect(login).toHaveBeenCalled());
}

describe('Recordarme del login', () => {
  it('envía el valor verdadero cuando el checkbox está marcado', async () => {
    render(<MemoryRouter><Login /></MemoryRouter>);

    await enviarLogin(true);

    expect(login).toHaveBeenCalledWith('ana@example.com', 'Clave-Segura-123', true);
  });

  it('envía el valor falso cuando el checkbox no está marcado', async () => {
    render(<MemoryRouter><Login /></MemoryRouter>);

    await enviarLogin(false);

    expect(login).toHaveBeenCalledWith('ana@example.com', 'Clave-Segura-123', false);
  });
});
