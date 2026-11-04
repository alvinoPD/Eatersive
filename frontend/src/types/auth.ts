export type AuthRole = 'owner' | 'user';

/**
 * Sesi login yang disimpan di browser.
 * Password tidak pernah disimpan; `token` adalah token Sanctum dari backend.
 */
export interface AuthSession {
  userId: string;
  name: string;
  email: string;
  role: AuthRole;
  token: string;
}

export type LoginResult =
  | { ok: true; session: AuthSession }
  | { ok: false; message: string };
