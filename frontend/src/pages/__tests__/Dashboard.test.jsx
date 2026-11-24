import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../Dashboard';
import { AuthContext } from '../../context/authContexto';
import { obtenerResumenPanel } from '../../services/reportes';
import { ROL_ADMIN, ROL_CLIENTE, ROL_SUPERADMIN, ROL_VENDEDOR } from '../../utils/constants/roles';

vi.mock('../../services/reportes', () => ({
  obtenerResumenPanel: vi.fn(),
}));

vi.mock('../../components/buttons/SiteHeader', () => ({
  default: () => <header>Cabecera del portal</header>,
}));

const datos = {
  alcance: 'tienda',
  capacidades: { cotizaciones: true, inventario: true, comparar_tiendas: true },
  actual: {
    cotizaciones: { cantidad: 8, total: 800000 },
    ventas_completadas: { cantidad: 3, total: 300000 },
    por_cobrar: { cantidad: 2, total: 200000 },
    pedidos_pendientes: { cantidad: 4, total: 400000 },
    ventas_hoy: { cantidad: 1, total: 100000 },
  },
  estados: {
    pendiente: { cantidad: 4, total: 400000 },
    aprobada: { cantidad: 2, total: 200000 },
    rechazada: { cantidad: 1, total: 100000 },
    completada: { cantidad: 3, total: 300000 },
  },
  inventario: {
    total: 12,
    unidades: 40,
    bajo: 1,
    agotado: 1,
    alertas: [{
      id_inventario: 'inventario-1',
      stock_actual: 0,
      stock_minimo: 3,
      estado_inventario: 'agotado',
      producto__nombre: 'Casco integral',
    }],
  },
  tiendas: [{
    id_tienda: 'tienda-1',
    nombre: 'Tienda Central',
    cotizaciones: { cantidad: 8, total: 800000 },
    ventas_completadas: { cantidad: 3, total: 300000 },
  }],
};

function usuario(id_rol, id_tienda = 'tienda-1') {
  return {
    id_usuario: 'usuario-1',
    id_rol,
    id_tienda,
    usu_nombre: 'Ana Pérez',
  };
}

function renderDashboard(cuenta, path = '/admin', estricto = false) {
  const arbol = (
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={{ usuario: cuenta }}>
        <Dashboard />
      </AuthContext.Provider>
    </MemoryRouter>
  );
  return render(estricto ? <StrictMode>{arbol}</StrictMode> : arbol);
}

beforeEach(() => {
  vi.clearAllMocks();
  obtenerResumenPanel.mockResolvedValue(datos);
});

describe('Dashboard por rol', () => {
  it('muestra el resumen personal del cliente sin inventario', async () => {
    renderDashboard(usuario(ROL_CLIENTE, null), '/resumen');
    expect(await screen.findByText('Hola, Ana.')).toBeInTheDocument();
    expect(screen.getByText('Mis cotizaciones')).toBeInTheDocument();
    expect(screen.getByText('Total completado')).toBeInTheDocument();
    expect(screen.queryByText('Stock bajo o agotado')).not.toBeInTheDocument();
    expect(screen.getByText('Cabecera del portal')).toBeInTheDocument();
  });

  it('muestra inventario y alertas al administrador', async () => {
    renderDashboard(usuario(ROL_ADMIN));
    expect(await screen.findByText('Hola, Ana.')).toBeInTheDocument();
    expect(screen.getByText('Inventario')).toBeInTheDocument();
    expect(screen.getByText('Casco integral')).toBeInTheDocument();
    expect(screen.getByText('Quedan 0; mínimo 3')).toBeInTheDocument();
  });

  it('prioriza la cola comercial del vendedor', async () => {
    renderDashboard(usuario(ROL_VENDEDOR));
    expect(await screen.findByText('Hola, Ana.')).toBeInTheDocument();
    expect(screen.getByText('Tu cola de trabajo')).toBeInTheDocument();
    expect(screen.getByText('Tu embudo de cotizaciones')).toBeInTheDocument();
    expect(screen.queryByText('Stock bajo o agotado')).not.toBeInTheDocument();
  });

  it('compara tiendas para Superadmin', async () => {
    renderDashboard(usuario(ROL_SUPERADMIN, null));
    expect(await screen.findByText('Hola, Ana.')).toBeInTheDocument();
    expect(screen.getByText('Actividad por tienda')).toBeInTheDocument();
    expect(screen.getByText('Tienda Central')).toBeInTheDocument();
    expect(obtenerResumenPanel).toHaveBeenCalledWith({ comparar: true });
  });

  it('no deja el skeleton permanente bajo StrictMode', async () => {
    renderDashboard(usuario(ROL_ADMIN), '/admin', true);
    expect(await screen.findByText('Hola, Ana.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('permite reintentar cuando falla la carga', async () => {
    obtenerResumenPanel.mockRejectedValueOnce(new Error('Sin conexión'));
    renderDashboard(usuario(ROL_CLIENTE, null), '/resumen');
    expect(await screen.findByText('No se pudo abrir el resumen')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Hola, Ana.')).toBeInTheDocument();
  });

  it('informa cuando la cuenta no tiene capacidades', async () => {
    obtenerResumenPanel.mockResolvedValue({
      capacidades: { cotizaciones: false, inventario: false, comparar_tiendas: false },
      actual: null,
      inventario: null,
      estados: {},
      diario: [],
    });
    renderDashboard(usuario(ROL_CLIENTE, null), '/resumen');
    expect(await screen.findByText('No hay secciones disponibles')).toBeInTheDocument();
  });
});
