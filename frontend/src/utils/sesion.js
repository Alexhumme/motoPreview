const CLAVE_TOKEN = 'token';
const CLAVE_USUARIO = 'usuario';

function almacenSesion() {
  if (sessionStorage.getItem(CLAVE_TOKEN)) return sessionStorage;
  if (localStorage.getItem(CLAVE_TOKEN)) return localStorage;
  return null;
}

export function obtenerToken() {
  return almacenSesion()?.getItem(CLAVE_TOKEN) || null;
}

export function guardarSesion(token, usuario, recordar) {
  limpiarSesion();
  const almacen = recordar ? localStorage : sessionStorage;
  almacen.setItem(CLAVE_TOKEN, token);
  almacen.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
}

export function leerUsuarioGuardado() {
  const almacen = almacenSesion();
  const usuarioGuardado = almacen?.getItem(CLAVE_USUARIO);
  if (!usuarioGuardado) return null;
  try {
    return JSON.parse(usuarioGuardado);
  } catch {
    return null;
  }
}

export function actualizarUsuarioGuardado(usuario) {
  almacenSesion()?.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
}

export function limpiarSesion() {
  for (const almacen of [localStorage, sessionStorage]) {
    almacen.removeItem(CLAVE_TOKEN);
    almacen.removeItem(CLAVE_USUARIO);
  }
}
