import { Navigate, Outlet, useLocation } from 'react-router';
import type { Role } from '@/api/generated/model';
import { ForbiddenPage } from '@/features/errors/ForbiddenPage';
import { useAuth } from './useAuth';

/** Route guard: sends anonymous visitors to the login and shows "access denied" to the wrong role. */
export function RequireRole({ role }: { role: Role }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <p role="status">Verificando tu sesión…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (user.role !== role) return <ForbiddenPage />;
  return <Outlet />;
}
