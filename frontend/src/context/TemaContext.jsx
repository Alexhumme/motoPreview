import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Tema visual de la aplicación: 'oscuro' (por defecto) o 'claro'.
 * El tema se guarda en localStorage y se aplica como atributo
 * data-tema en <html> para que el CSS cambie las variables.
 */
const TemaContext = createContext(null);
const CLAVE_TEMA = 'motopreview-tema';

export function leerTemaGuardado() {
  try {
    return localStorage.getItem(CLAVE_TEMA) === 'claro' ? 'claro' : 'oscuro';
  } catch {
    return 'oscuro';
  }
}

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(leerTemaGuardado);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      /* almacenamiento no disponible: el tema solo vive en memoria */
    }
  }, [tema]);

  const alternarTema = () => setTema((t) => (t === 'oscuro' ? 'claro' : 'oscuro'));

  return (
    <TemaContext.Provider value={{ tema, alternarTema }}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema() {
  const contexto = useContext(TemaContext);
  if (!contexto) {
    throw new Error('useTema debe usarse dentro de <TemaProvider>');
  }
  return contexto;
}
