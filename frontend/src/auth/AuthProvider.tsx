import { useEffect, useState, type ReactNode } from 'react';
import { apiLogin, apiLogout } from '../api/auth';
import { getApiErrorMessage } from '../api/client';
import { clearAuthSession, readAuthSession, writeAuthSession } from './authStorage';
import { AuthContext } from './auth-context';
import type { AuthSession, LoginResult } from '../types/auth';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Autentikasi berbasis Sanctum.
 *
 * Login mengirim kredensial ke backend, lalu token disimpan bersama sesi di
 * localStorage/sessionStorage. Semua request berikutnya otomatis membawa
 * header `Authorization: Bearer <token>` lewat `apiClient`.
 */
export default function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession());

  /* Token dicabut/kedaluwarsa (401) → paksa logout. */
  useEffect(() => {
    function handleUnauthorized() {
      clearAuthSession();
      setSession(null);
    }

    window.addEventListener('eatersive:unauthorized', handleUnauthorized);

    return () => window.removeEventListener('eatersive:unauthorized', handleUnauthorized);
  }, []);

  async function login(
    email: string,
    password: string,
    remember: boolean,
  ): Promise<LoginResult> {
    try {
      const payload = await apiLogin(email, password);

      const nextSession: AuthSession = {
        userId: String(payload.user.id),
        name: payload.user.name,
        email: payload.user.email,
        role: payload.user.role === 'admin' ? 'owner' : 'user',
        token: payload.token,
      };

      writeAuthSession(nextSession, remember);
      setSession(nextSession);

      return { ok: true, session: nextSession };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function logout(): Promise<void> {
    try {
      await apiLogout();
    } catch {
      /* Token mungkin sudah dicabut — sesi lokal tetap dibersihkan. */
    }

    clearAuthSession();
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
