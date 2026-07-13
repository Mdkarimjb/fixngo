import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import type { Role } from '../types';

interface Props {
  allow: Role[];
  children: ReactNode;
}

/** Gates a route by authentication and role; redirects otherwise. */
export function RequireRole({ allow, children }: Props) {
  const user = useAuth((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
