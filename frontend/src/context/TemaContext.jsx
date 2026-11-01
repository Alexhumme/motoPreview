import { useEffect, useState } from 'react';
import { TemaContext, leerTemaGuardado } from './temaContexto';

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(leerTemaGuardado);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    try {
      localStorage.setItem('motopreview-tema', tema);
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
