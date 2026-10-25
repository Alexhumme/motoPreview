import { createContext, useContext } from 'react';

// El contexto y su hook viven aquí, sin JSX, para que Fast Refresh funcione bien.
// El componente AuthProvider está en AuthProvider.jsx.
export const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}
