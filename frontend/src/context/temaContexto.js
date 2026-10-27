import { createContext } from 'react';

/**
 * Tema visual de la aplicación: 'oscuro' (por defecto) o 'claro'.
 * El tema se guarda en localStorage y se aplica como atributo
 * data-tema en <html> para que el CSS cambie las variables.
 */
const TemaContext = createContext();
const CLAVE_TEMA = 'motopreview-tema';

function leerTemaGuardado() {
  try {
    return localStorage.getItem(CLAVE_TEMA) === 'claro' ? 'claro' : 'oscuro';
  } catch {
    return 'oscuro';
  }
}

export { TemaContext };
export { CLAVE_TEMA };
export { useTema } from './useTema';
export { leerTemaGuardado };
