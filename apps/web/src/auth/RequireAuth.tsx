import { type ReactElement, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './authStore.js';
import { useDemoStore } from '../demo/demoStore.js';
import { LoadingShell } from '../ui/LoadingShell.js';

/**
 * Gates child routes behind authentication. Demo mode is allowed through
 * because demo is an offline experience with no real data exposure.
 */
export function RequireAuth({
  children, role,
}: { children: ReactNode; role?: 'admin' }): ReactElement {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const hasUsers = useAuthStore((s) => s.hasUsers);
  const demo = useDemoStore((s) => s.demo);
  const location = useLocation();

  if (demo) return <>{children}</>;

  if (status === 'unknown') return <LoadingShell />;

  if (status === 'anonymous') {
    // No accounts yet → push the user to /signup to create the first admin.
    // Otherwise drop them at /login and remember where they were going.
    const target = hasUsers ? '/login' : '/signup';
    return <Navigate to={target} state={{ from: location.pathname }} replace />;
  }

  if (role === 'admin' && user?.role !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
