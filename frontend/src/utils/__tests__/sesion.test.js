import {
  actualizarUsuarioGuardado,
  guardarSesion,
  leerUsuarioGuardado,
  limpiarSesion,
  obtenerToken,
} from '../sesion';

const usuario = { id_usuario: 'u1', usu_email: 'ana@example.com' };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('persistencia de la sesión', () => {
  it('guarda token y usuario en localStorage cuando se marca Recordarme', () => {
    guardarSesion('token-persistente', usuario, true);

    expect(localStorage.getItem('token')).toBe('token-persistente');
    expect(JSON.parse(localStorage.getItem('usuario'))).toEqual(usuario);
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(obtenerToken()).toBe('token-persistente');
    expect(leerUsuarioGuardado()).toEqual(usuario);
  });

  it('guarda token y usuario en sessionStorage cuando no se marca Recordarme', () => {
    guardarSesion('token-temporal', usuario, false);

    expect(sessionStorage.getItem('token')).toBe('token-temporal');
    expect(JSON.parse(sessionStorage.getItem('usuario'))).toEqual(usuario);
    expect(localStorage.getItem('token')).toBeNull();
    expect(obtenerToken()).toBe('token-temporal');
    expect(leerUsuarioGuardado()).toEqual(usuario);
  });

  it('elimina la sesión anterior al cambiar de persistencia', () => {
    guardarSesion('token-persistente', usuario, true);
    guardarSesion('token-temporal', usuario, false);

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('usuario')).toBeNull();
    expect(obtenerToken()).toBe('token-temporal');
  });

  it('actualiza el usuario sin moverlo a otro almacenamiento', () => {
    guardarSesion('token-temporal', usuario, false);
    actualizarUsuarioGuardado({ ...usuario, permisos: ['resumen:listar'] });

    expect(JSON.parse(sessionStorage.getItem('usuario')).permisos).toEqual(['resumen:listar']);
    expect(localStorage.getItem('usuario')).toBeNull();
  });

  it('limpia ambos almacenamientos al cerrar sesión', () => {
    localStorage.setItem('token', 'anterior');
    localStorage.setItem('usuario', JSON.stringify(usuario));
    sessionStorage.setItem('token', 'actual');
    sessionStorage.setItem('usuario', JSON.stringify(usuario));

    limpiarSesion();

    expect(obtenerToken()).toBeNull();
    expect(leerUsuarioGuardado()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
  });
});
