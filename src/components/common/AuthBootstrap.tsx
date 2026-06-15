import { setAuthStore } from '../../lib/apiClient';
import { store as reduxStore } from '../../store';

setAuthStore(reduxStore);

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}