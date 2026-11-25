import { clearStoredSession, readStoredSession, writeStoredSession } from './session-store';
import type { AuthRole, AuthSession } from '../types/auth';

function isValidRole(value: unknown): value is AuthRole {
  return value === 'owner' || value === 'user';
}

function isValidSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const candidate = value as Partial<AuthSession>;

  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.token === 'string' &&
    candidate.token.length > 0 &&
    isValidRole(candidate.role)
  );
}

/** Membaca sesi login dari localStorage (ingat saya) atau sessionStorage (satu tab). */
export function readAuthSession(): AuthSession | null {
  const session = readStoredSession<unknown>();
  if (!isValidSession(session)) return null;

  /* Sesi lama (sebelum fitur member) tetap valid dengan default non-member. */
  return {
    ...session,
    isMember: session.isMember === true,
    discountPercent:
      typeof session.discountPercent === 'number' ? session.discountPercent : 0,
    membershipPlan: session.membershipPlan ?? null,
    membershipExpiresAt: session.membershipExpiresAt ?? null,
  };
}

export function writeAuthSession(session: AuthSession, remember: boolean): void {
  writeStoredSession(session, remember);
}

export function clearAuthSession(): void {
  clearStoredSession();
}
