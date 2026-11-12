import { useEffect, useState, type ReactNode } from 'react';
import { apiLogin, apiLogout } from '../api/auth';
import { getApiErrorMessage } from '../api/client';
import { clearAuthSession, readAuthSession, writeAuthSession } from './authStorage';
import { SESSION_KEY } from './session-store';
import { AuthContext } from './auth-context';
import type { AuthSession, LoginResult } from '../types/auth';
import type { CaptchaValue } from '../api/captcha';

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
    captcha: CaptchaValue,
  ): Promise<LoginResult> {
    try {
      const payload = await apiLogin(email, password, captcha);

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

  /** Sinkronkan nama/email sesi lokal setelah profil diperbarui di backend. */
  function updateSessionUser(partial: Partial<Pick<AuthSession, 'name' | 'email'>>) {
    setSession((current) => {
      if (!current) return current;

      const next: AuthSession = { ...current, ...partial };
      /* Pertahankan pilihan "ingat saya": sesi tetap di storage yang sama. */
      const remembered = window.localStorage.getItem(SESSION_KEY) !== null;
      writeAuthSession(next, remembered);

      return next;
    });
  }

  async function logout(): Promise<void> {    try {
      await apiLogout();
    } catch {
      /* Token mungkin sudah dicabut — sesi lokal tetap dibersihkan. */
    }

    clearAuthSession();
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, login, logout, updateSessionUser }}>
      {children}
    </AuthContext.Provider>
  );
}
