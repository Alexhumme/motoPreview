import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import { obtenerAccesorios, obtenerProductos } from '../accesorios';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('servicios de productos', () => {
  it('normaliza las respuestas paginadas del catálogo', async () => {
    api.get.mockResolvedValue({ data: { resultados: [{ id_accesorio: 'p1' }] } });
    await expect(obtenerAccesorios()).resolves.toEqual([{ id_accesorio: 'p1' }]);
    expect(api.get).toHaveBeenCalledWith('/accesorios');
  });

  it('obtiene todos los productos desde el endpoint unificado', async () => {
    api.get.mockResolvedValue({ data: [{ id_accesorio: 'p1' }, { id_accesorio: 'p2' }] });
    await expect(obtenerProductos()).resolves.toHaveLength(2);
    expect(api.get).toHaveBeenCalledWith('/productos');
  });
});
