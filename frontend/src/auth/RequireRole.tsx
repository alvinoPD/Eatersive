import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROLE_HOME } from '../data/demoAccounts';
import useAuth from './useAuth';
import type { AuthRole } from '../types/auth';

interface RequireRoleProps {
  role: AuthRole;
}

/** Membatasi route tertentu sesuai role sesi demo. */
export default function RequireRole({ role }: RequireRoleProps) {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  if (session.role !== role) {
    return <Navigate to={ROLE_HOME[session.role]} replace />;
  }

  return <Outlet />;
}
