import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { AuthContext } from '../authContexto';
import { usePermiso } from '../usePermiso';

function renderPermiso(usuario) {
  return renderHook(() => usePermiso(), {
    wrapper: ({ children }) => (
      <AuthContext.Provider value={{ usuario, actualizarPermisos: () => {} }}>
        {children}
      </AuthContext.Provider>
    ),
  }).result;
}

describe('usePermiso', () => {
  it('concede el bypass al superadministrador sin matriz de permisos', () => {
    const { current } = renderPermiso({ id_rol: '00000000-0000-0000-0000-000000000000' });
    expect(current.tienePermiso('inventario', 'leer')).toBe(true);
  });

  it('no concede permisos a un usuario sin matriz cargada', () => {
    const { current } = renderPermiso({ id_rol: '11111111-0000-0000-0000-000000000001' });
    expect(current.tienePermiso('inventario', 'leer')).toBe(false);
  });

  it('respeta el scope de los permisos de un usuario', () => {
    const { current } = renderPermiso({
      id_rol: '11111111-0000-0000-0000-000000000001',
      permisos: [{ recurso: 'inventario', accion: 'leer', scope: 'tienda', activo: true }],
    });
    expect(current.tienePermiso('inventario', 'leer', 'tienda')).toBe(true);
    expect(current.tienePermiso('inventario', 'leer', 'global')).toBe(false);
  });
});
