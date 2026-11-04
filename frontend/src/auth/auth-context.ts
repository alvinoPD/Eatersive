import { createContext } from 'react';
import type { AuthSession, LoginResult } from '../types/auth';

export interface AuthContextValue {
  session: AuthSession | null;
  login: (email: string, password: string, remember: boolean) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
