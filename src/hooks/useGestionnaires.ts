import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import type { Pagination } from '../types/api';

export interface Gestionnaire {
  id: number;
  email: string;
  role: 'GESTIONNAIRE';
  consultantId: null;
  createdAt: string;
  updatedAt: string;
}

export interface GestionnaireFormData {
  email: string;
  password: string;
}

export function useGetGestionnaires(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['gestionnaires', { page, limit }],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: Gestionnaire[]; pagination: Pagination }>('/gestionnaires', {
          params: { page, limit },
        })
        .then((res) => ({ data: res.data.data, pagination: res.data.pagination })),
  });
}

export function useCreateGestionnaire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GestionnaireFormData) =>
      apiClient
        .post<{ success: true; data: Gestionnaire }>('/gestionnaires', data)
        .then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestionnaires'] });
    },
  });
}
