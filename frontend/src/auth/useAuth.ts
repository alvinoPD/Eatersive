import { useContext } from 'react';
import { AuthContext } from './auth-context';

/** Akses sesi demo dan aksi login/logout. Harus dipakai di dalam AuthProvider. */
export default function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider.');
  }

  return context;
}
