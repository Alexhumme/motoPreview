import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Registro from '../auth/Registro';
import Ajustes from '../Ajustes';
import { useAuth } from '../../context/authContexto';
import {
  actualizarAjustesSitio,
  obtenerAjustesSitio,
  registrarCliente,
} from '../../services/auth';
import { ROL_CLIENTE, TIENDA_PRINCIPAL } from '../../utils/constants/roles';

vi.mock('../../context/authContexto', () => ({ useAuth: vi.fn() }));
vi.mock('../../components/buttons/SiteHeader', () => ({ default: () => <header /> }));
vi.mock('../../services/auth', () => ({
  actualizarAjustesSitio: vi.fn(),
  obtenerAjustesSitio: vi.fn(),
  registrarCliente: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ login: vi.fn() });
  vi.mocked(obtenerAjustesSitio).mockResolvedValue({ email_verification_required: true });
  vi.mocked(actualizarAjustesSitio).mockResolvedValue({ email_verification_required: false });
});

function enviarRegistro() {
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Test' } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave-Segura-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
}

describe('registro y verificación de correo', () => {
  it('muestra el aviso y no intenta iniciar sesión cuando la verificación es obligatoria', async () => {
    vi.mocked(registrarCliente).mockResolvedValue({
      verificacion_requerida: true,
      mensaje: 'Usuario creado. Debes verificar tu correo antes de iniciar sesión.',
    });

    render(<MemoryRouter><Registro /></MemoryRouter>);
    enviarRegistro();

    expect(await screen.findByRole('status')).toHaveTextContent('Debes verificar tu correo antes de iniciar sesión.');
    expect(useAuth().login).not.toHaveBeenCalled();
    expect(registrarCliente).toHaveBeenCalledWith({
      usu_nombre: 'Ana Test',
      usu_email: 'ana@example.com',
      password: 'Clave-Segura-123',
      id_rol: ROL_CLIENTE,
      id_tienda: TIENDA_PRINCIPAL,
    });
  });

  it('inicia sesión automáticamente cuando el superadmin desactivó el requisito', async () => {
    vi.mocked(registrarCliente).mockResolvedValue({
      verificacion_requerida: false,
      mensaje: 'Usuario creado con éxito. Ya puedes iniciar sesión.',
    });

    render(<MemoryRouter><Registro /></MemoryRouter>);
    enviarRegistro();

    await waitFor(() => expect(useAuth().login).toHaveBeenCalledWith('ana@example.com', 'Clave-Segura-123'));
  });
});

describe('ajustes del sitio', () => {
  it('carga el requisito vigente y permite desactivarlo', async () => {
    render(<Ajustes />);

    const interruptor = await screen.findByRole('switch', { name: 'Exigir verificación de correo' });
    expect(interruptor).toBeChecked();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();

    fireEvent.click(interruptor);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(actualizarAjustesSitio).toHaveBeenCalledWith({ email_verification_required: false }));
    expect(await screen.findByRole('status')).toHaveTextContent('Ajustes guardados correctamente.');
  });

  it('muestra un error recuperable si no puede cargar los ajustes', async () => {
    vi.mocked(obtenerAjustesSitio).mockRejectedValueOnce(new Error('Sin conexión'));
    render(<Ajustes />);

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los ajustes del sitio.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('switch', { name: 'Exigir verificación de correo' })).toBeChecked();
  });
});
