import { createContext } from 'react';
import type { CaptchaValue } from '../api/captcha';
import type { AuthSession, LoginResult } from '../types/auth';

export interface AuthContextValue {
  session: AuthSession | null;
  login: (
    email: string,
    password: string,
    remember: boolean,
    captcha: CaptchaValue,
  ) => Promise<LoginResult>;
  logout: () => Promise<void>;
  /** Sinkronkan nama/email sesi setelah profil diperbarui di backend. */
  updateSessionUser: (partial: Partial<Pick<AuthSession, 'name' | 'email'>>) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);