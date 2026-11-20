import type { AuthRole } from '../types/auth';

export const ROLE_LABEL: Record<AuthRole, string> = {
  owner: 'Owner',
  user: 'Pelanggan',
};

/** Halaman default setelah login berhasil. */
export const ROLE_HOME: Record<AuthRole, string> = {
  owner: '/owner',
  user: '/layanan',
};
