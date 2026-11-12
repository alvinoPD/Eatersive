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

/** Akun demo lokal (tanpa backend) yang dipakai halaman template lama. */
export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: AuthRole;
}

export type LoginResult =
  | { ok: true; session: AuthSession }
  | { ok: false; message: string };
