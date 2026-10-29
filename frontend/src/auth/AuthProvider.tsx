import { useState, type ReactNode } from 'react';
import { findDemoAccount } from '../data/demoAccounts';
import { clearAuthSession, readAuthSession, writeAuthSession } from './authStorage';
import { AuthContext } from './auth-context';
import type { AuthSession, LoginResult } from '../types/auth';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Autentikasi demo berbasis browser.
 *
 * Akun dan password berasal dari `data/demoAccounts.ts`, lalu sesi disimpan di
 * localStorage/sessionStorage. Tidak ada request ke backend dan ini bukan
 * mekanisme autentikasi produksi.
 */
export default function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession());

  function login(email: string, password: string, remember: boolean): LoginResult {
    const account = findDemoAccount(email, password);

    if (!account) {
      return {
        ok: false,
        message:
          'Email atau kata sandi demo tidak cocok. Gunakan akun owner atau pelanggan di atas.',
      };
    }

    const nextSession: AuthSession = {
      userId: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
    };

    try {
      writeAuthSession(nextSession, remember);
    } catch (error) {
      // Storage bisa diblokir; sesi tetap aktif di memori untuk demo ini.
      console.error('Tidak dapat menyimpan sesi demo:', error);
    }

    setSession(nextSession);
    return { ok: true, session: nextSession };
  }

  function logout(): void {
    clearAuthSession();
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
