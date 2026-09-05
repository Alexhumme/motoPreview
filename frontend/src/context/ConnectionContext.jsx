import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const ConnectionContext = createContext();

export function ConnectionProvider({ children }) {
  const [conectado, setConectado] = useState(true);

  useEffect(() => {
    function marcarOffline() {
      setConectado(false);
    }
    function marcarOnline() {
      setConectado(true);
    }

    window.addEventListener('backend:offline', marcarOffline);
    window.addEventListener('backend:online', marcarOnline);

    // Revisa periódicamente si el backend ya volvió, incluso sin que el usuario interactúe
    const intervalo = setInterval(async () => {
      try {
        await api.get('/health', { timeout: 4000 });
      } catch {
        // el propio interceptor ya marca offline si falla
      }
    }, 10000);

    return () => {
      window.removeEventListener('backend:offline', marcarOffline);
      window.removeEventListener('backend:online', marcarOnline);
      clearInterval(intervalo);
    };
  }, []);

  return (
    <ConnectionContext.Provider value={{ conectado }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  return useContext(ConnectionContext);
}