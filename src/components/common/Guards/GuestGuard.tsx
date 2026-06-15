import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { RootState } from '../../../store';
import { useSessionRestore } from '../../../lib/useSessionRestore';

interface GuestGuardProps {
  children: ReactNode;
}

export default function GuestGuard({ children }: GuestGuardProps) {
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );
  const restoring = useSessionRestore();

  if (restoring) {
    return <div className="flex min-h-screen items-center justify-center bg-[#ffffff]"><div className="text-gray-400 text-sm">Chargement...</div></div>;
  }

  if (isAuthenticated && user) {
    const rolePaths: Record<string, string> = {
      ADMIN: '/admin',
      GESTIONNAIRE: '/manager',
      CONSULTANT: '/consultant',
    };
    const path = rolePaths[user.role] ?? '/login';
    return <Navigate to={path} replace />;
  }

  return <>{children}</>;
}
