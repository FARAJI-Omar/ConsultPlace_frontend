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
        .post<{ success: true; data: { token: string; user: { id: number; email: string; consultantId: number | null } } }>(
          '/login',
          payload,
        )
        .then((res) => res.data.data),
    onSuccess: (data) => {
      const decoded = jwtDecode<JwtPayload>(data.token);
      dispatch(
        setCredentials({
          token: data.token,
          user: {
            id: data.user.id,
            email: data.user.email,
            role: decoded.role,
            consultantId: decoded.consultantId,
          },
        }),
      );
      navigate(`/${decoded.role.toLowerCase()}`, { replace: true });
    },
  });
}
