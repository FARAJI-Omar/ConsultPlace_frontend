import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { clearCredentials } from '../../store/authSlice';
import apiClient from '../../lib/apiClient';
import type { RootState } from '../../store';
import type { ApiResponse } from '../../types/api';
import type { ConsultantProfileData } from '../../types/consultant';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const { data: profileData } = useQuery({
    queryKey: ['consultant-profile'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ConsultantProfileData>>('/consultants/me');
      return data.data;
    },
    enabled: user?.role === 'CONSULTANT',
  });

  const displayName =
    user?.role === 'CONSULTANT'
      ? profileData?.profile.name ?? user?.email?.split('@')[0]
      : user?.email?.split('@')[0];

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-[#e5e7eb] bg-[#ffffff] px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="cursor-pointer rounded p-2 text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#111111] lg:hidden"
          aria-label="Menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-[#6b7280]">
          {displayName}
        </span>
        <button
          onClick={handleLogout}
          className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}
