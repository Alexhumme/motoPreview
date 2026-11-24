import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GraficosDashboard from '../GraficosDashboard';

vi.mock('recharts', () => {
  const Contenedor = ({ children }) => <div>{children}</div>;
  const ComposedChart = ({ data, children }) => <div data-testid="historico" data-datos={JSON.stringify(data)}>{children}</div>;
  const Pie = ({ data, children }) => <div data-testid="torta" data-datos={JSON.stringify(data)}>{children}</div>;
  const BarChart = ({ data, children }) => <div data-testid="tiendas" data-datos={JSON.stringify(data)}>{children}</div>;
  const Vacio = () => null;
  return {
    ResponsiveContainer: Contenedor,
    ComposedChart,
    PieChart: Contenedor,
    BarChart,
    Pie,
    Cell: Vacio,
    CartesianGrid: Vacio,
    XAxis: Vacio,
    YAxis: Vacio,
    Tooltip: Vacio,
    Legend: Vacio,
    Bar: Vacio,
    Line: Vacio,
  };
});

const datos = {
  diario: [
    { fecha: '2026-11-22', cotizaciones: { cantidad: 4, total: '400000' }, ventas_completadas: { cantidad: 1, total: '100000' } },
    { fecha: '2026-11-23', cotizaciones: { cantidad: 2, total: '200000' }, ventas_completadas: { cantidad: 0, total: '0' } },
  ],
  estados: {
    pendiente: { cantidad: 3, total: '300000' },
    aprobada: { cantidad: 2, total: '200000' },
    rechazada: { cantidad: 0, total: '0' },
    completada: { cantidad: 1, total: '100000' },
  },
  tiendas: [
    { id_tienda: 'tienda-1', nombre: 'Central', cotizaciones: { cantidad: 4 }, ventas_completadas: { cantidad: 1 } },
    { id_tienda: 'tienda-2', nombre: 'Norte', cotizaciones: { cantidad: 2 }, ventas_completadas: { cantidad: 0 } },
  ],
};

function leerDatos(id) {
  return JSON.parse(screen.getByTestId(id).getAttribute('data-datos'));
}

describe('Gráficos del dashboard', () => {
  it('convierte la serie diaria y omite estados sin cotizaciones', () => {
    render(<GraficosDashboard datos={datos} />);
    expect(leerDatos('historico')).toEqual([
      { fecha: '2026-11-22', ventas_completadas: { cantidad: 1, total: '100000' }, cotizaciones: 4, ventas: 1 },
      { fecha: '2026-11-23', ventas_completadas: { cantidad: 0, total: '0' }, cotizaciones: 2, ventas: 0 },
    ]);
    expect(leerDatos('torta').map((estado) => estado.nombre)).toEqual(['Pendientes', 'Aprobadas', 'Completadas']);
    expect(leerDatos('tiendas').map((tienda) => [tienda.nombre, tienda.cotizaciones, tienda.ventas])).toEqual([
      ['Central', 4, 1],
      ['Norte', 2, 0],
    ]);
  });

  it('no muestra la comparación de tiendas si el usuario no tiene ese alcance', () => {
    render(<GraficosDashboard datos={{ ...datos, tiendas: [] }} />);
    expect(screen.queryByTestId('tiendas')).not.toBeInTheDocument();
    expect(screen.getByTestId('torta')).toBeInTheDocument();
  });

  it('explica cuando no hay actividad en el período', () => {
    render(<GraficosDashboard datos={{ diario: [], estados: {}, tiendas: [] }} />);
    expect(screen.getByText('Aún no hay solicitudes ni ventas en este período.')).toBeInTheDocument();
    expect(screen.queryByTestId('torta')).not.toBeInTheDocument();
  });
});
