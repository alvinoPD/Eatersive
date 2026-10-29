import { DEMO_ACCOUNTS } from '../data/demoAccounts';
import type { AuthRole, AuthSession } from '../types/auth';

const SESSION_KEY = 'eatersive-auth-session';

function isValidRole(value: unknown): value is AuthRole {
  return value === 'owner' || value === 'user';
}

function parseSession(rawSession: string | null): AuthSession | null {
  if (!rawSession) return null;

  try {
    const parsed: unknown = JSON.parse(rawSession);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const candidate = parsed as Partial<AuthSession>;
    if (
      typeof candidate.userId !== 'string' ||
      typeof candidate.name !== 'string' ||
      typeof candidate.email !== 'string' ||
      !isValidRole(candidate.role)
    ) {
      return null;
    }

    const account = DEMO_ACCOUNTS.find(
      (item) => item.id === candidate.userId && item.role === candidate.role,
    );
    if (!account) return null;

    return {
      userId: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
    };
  } catch {
    return null;
  }
}

/** Membaca sesi dari localStorage (ingat saya) atau sessionStorage (satu tab). */
export function readAuthSession(): AuthSession | null {
  try {
    return (
      parseSession(window.localStorage.getItem(SESSION_KEY)) ??
      parseSession(window.sessionStorage.getItem(SESSION_KEY))
    );
  } catch {
    return null;
  }
}

export function writeAuthSession(session: AuthSession, remember: boolean): void {
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);

  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage bisa diblokir; state di React tetap dihapus oleh provider.
  }
}
