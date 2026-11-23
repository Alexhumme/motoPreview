import { createContext } from 'react';
import { useAuth } from './useAuth';

const AuthContext = createContext();

export { AuthContext };
export { useAuth };
