/** Role yang dikenali oleh login demo frontend. */
export type AuthRole = 'owner' | 'user';

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: AuthRole;
}

/** Sesi yang disimpan di browser; password tidak pernah disimpan. */
export interface AuthSession {
  userId: string;
  name: string;
  email: string;
  role: AuthRole;
}

export type LoginResult =
  | { ok: true; session: AuthSession }
  | { ok: false; message: string };
