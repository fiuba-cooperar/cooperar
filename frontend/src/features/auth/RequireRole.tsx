import { Navigate, Outlet, useLocation } from 'react-router';
import type { Role } from '@/api/generated/model';
import { useAuth } from './useAuth';

/**
 * Route guard: sends anonymous visitors to the login and shows "access denied" to the wrong role. Without a role,
 * any signed-in account gets in.
 */
export function RequireRole({ role }: { role?: Role }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <p role="status">Verificando tu sesión…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  // The forbidden page lives in the public layout, since a panel layout may wrap the guarded routes.
  if (role && user.role !== role) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
