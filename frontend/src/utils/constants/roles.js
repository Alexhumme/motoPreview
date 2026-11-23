export const ROL_SUPERADMIN = '00000000-0000-0000-0000-000000000000';
export const ROL_ADMIN = '11111111-0000-0000-0000-000000000001';
export const ROL_VENDEDOR = '11111111-0000-0000-0000-000000000002';
export const ROL_CLIENTE = '11111111-0000-0000-0000-000000000003';
export const TIENDA_PRINCIPAL = '33333333-0000-0000-0000-000000000001';

// Nombre legible para sesiones antiguas que guardaron el rol sin su objeto.
// Coinciden con los nombres sembrados en la tabla `rol`.
export const NOMBRE_ROL = {
  [ROL_SUPERADMIN]: 'Superadmin',
  [ROL_ADMIN]: 'Admin Tienda',
  [ROL_VENDEDOR]: 'Vendedor',
  [ROL_CLIENTE]: 'Cliente',
};