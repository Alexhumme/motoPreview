import { useContext } from 'react';
import { AuthContext } from './authContexto';

export function useAuth() {
  return useContext(AuthContext);
}
