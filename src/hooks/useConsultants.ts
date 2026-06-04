import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import type { Pagination } from '../types/api';

interface Consultant {
  id: number;
  name: string;
  email: string;
  profile: string;
  dailyRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConsultantFormData {
  name: string;
  email: string;
  profile: string;
  dailyRate: number;
  password?: string;
}

interface UpdateConsultantFormData {
  name?: string;
  email?: string;
  profile?: string;
  dailyRate?: number;
  password?: string;
}

export function useGetConsultants(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['consultants', { page, limit }],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: Consultant[]; pagination: Pagination }>('/consultants', {
          params: { page, limit },
        })
        .then((res) => ({ data: res.data.data, pagination: res.data.pagination })),
  });
}

export function useMutateConsultant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConsultantFormData) =>
      apiClient
        .post<{ success: true; data: Consultant }>('/consultants', data)
        .then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });
}

export function useUpdateConsultant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateConsultantFormData }) =>
      apiClient
        .patch<{ success: true; data: Consultant }>(`/consultants/${id}`, data)
        .then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });
}

export function useToggleConsultantStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiClient
        .patch<{ success: true; data: Consultant }>(`/consultants/${id}/status`, { isActive })
        .then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });
}
