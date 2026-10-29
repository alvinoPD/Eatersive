import type { AuthRole, DemoAccount } from '../types/auth';

/**
 * Akun demo yang hanya hidup di frontend.
 * Bukan autentikasi produksi: kredensial terlihat di bundle dan tidak memakai backend.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'owner-demo',
    name: 'Admin EaterSive',
    email: 'owner@eatersive.id',
    password: 'owner123',
    role: 'owner',
  },
  {
    id: 'user-demo',
    name: 'Budi Santoso',
    email: 'user@eatersive.id',
    password: 'user123',
    role: 'user',
  },
];

export const ROLE_LABEL: Record<AuthRole, string> = {
  owner: 'Owner',
  user: 'Pelanggan',
};

/** Halaman default setelah login berhasil. */
export const ROLE_HOME: Record<AuthRole, string> = {
  owner: '/owner',
  user: '/layanan',
};

export function findDemoAccount(email: string, password: string): DemoAccount | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find(
    (account) => account.email === normalizedEmail && account.password === password,
  );
}
