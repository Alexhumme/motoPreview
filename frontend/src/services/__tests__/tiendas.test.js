import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import {
  actualizarTienda,
  crearTienda,
  eliminarTienda,
  obtenerPlanesSuscripcion,
  obtenerTiendas,
} from '../tiendas';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('Servicio de tiendas', () => {
  it('normaliza el listado paginado', async () => {
    api.get.mockResolvedValue({ data: { resultados: [{ id_tienda: 'tienda-1' }] } });
    await expect(obtenerTiendas()).resolves.toEqual([{ id_tienda: 'tienda-1' }]);
    expect(api.get).toHaveBeenCalledWith('/tiendas');
  });

  it('mantiene la compatibilidad con listados planos', async () => {
    api.get.mockResolvedValue({ data: [{ id_tienda: 'tienda-1' }] });
    await expect(obtenerTiendas()).resolves.toHaveLength(1);
  });

  it('obtiene los planes de suscripción', async () => {
    api.get.mockResolvedValue({ data: { resultados: [{ id_plan: 'plan-1' }] } });
    await expect(obtenerPlanesSuscripcion()).resolves.toEqual([{ id_plan: 'plan-1' }]);
    expect(api.get).toHaveBeenCalledWith('/planes-suscripcion');
  });

  it('crea, actualiza y desactiva mediante los endpoints del CRUD', async () => {
    api.post.mockResolvedValue({ data: { id_tienda: 'tienda-1' } });
    api.patch.mockResolvedValue({ data: { id_tienda: 'tienda-1' } });
    api.delete.mockResolvedValue({ data: { mensaje: 'Tienda desactivada.' } });
    const datos = { nombre_tienda: 'Tienda Norte' };
    await crearTienda(datos);
    await actualizarTienda('tienda-1', datos);
    await eliminarTienda('tienda-1');
    expect(api.post).toHaveBeenCalledWith('/tiendas', datos);
    expect(api.patch).toHaveBeenCalledWith('/tiendas/tienda-1', datos);
    expect(api.delete).toHaveBeenCalledWith('/tiendas/tienda-1');
  });
});
