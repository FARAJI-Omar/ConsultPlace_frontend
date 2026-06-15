import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import type { RootState } from '../../../store';
import { useSessionRestore } from '../../../lib/useSessionRestore';

export default function ManagerRoute() {
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );
  const restoring = useSessionRestore();

  if (restoring) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><div className="text-gray-400 text-sm">Chargement...</div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'GESTIONNAIRE') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}