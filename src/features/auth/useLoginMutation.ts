import { useMutation } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import apiClient from '../../lib/apiClient';
import { setCredentials } from '../../store/authSlice';
import type { JwtPayload, LoginPayload } from '../../types/auth';

export function useLoginMutation() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      apiClient
        .post<{ success: true; data: { accessToken: string } }>(
          '/login',
          payload,
        )
        .then((res) => res.data.data),
    onSuccess: (data) => {
      dispatch(setCredentials({ accessToken: data.accessToken }));
      const decoded = jwtDecode<JwtPayload>(data.accessToken);
      const rolePaths: Record<string, string> = {
        ADMIN: 'admin',
        GESTIONNAIRE: 'manager',
        CONSULTANT: 'consultant',
      };
      navigate(`/${rolePaths[decoded.role] ?? 'login'}`, { replace: true });
    },
  });
}
