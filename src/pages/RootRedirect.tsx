import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import type { RootState } from '../store';

export default function RootRedirect() {
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const rolePaths: Record<string, string> = {
    ADMIN: '/admin',
    GESTIONNAIRE: '/manager',
    CONSULTANT: '/consultant',
  };

  return (
    <Navigate to={rolePaths[user.role] || `/login`} replace />
  );
}
