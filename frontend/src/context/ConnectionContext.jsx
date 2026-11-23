import { createContext, useContext, useEffect, useState } from 'react';

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

    // El estado lo mueve el interceptor de api.js: cualquier petición real que
    // llegue marca online y cualquier petición sin respuesta marca offline. No
    // hay sondeo periódico: sin tráfico, el banner queda como está hasta que el
    // usuario vuelve a interactuar.
    window.addEventListener('backend:offline', marcarOffline);
    window.addEventListener('backend:online', marcarOnline);

    return () => {
      window.removeEventListener('backend:offline', marcarOffline);
      window.removeEventListener('backend:online', marcarOnline);
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