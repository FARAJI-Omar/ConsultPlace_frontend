import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import type { Pagination } from '../types/api';

interface Client {
  id: number;
  raison_sociale: string;
  rc: string;
  contact: string;
  email: string;
  address: string;
  phone_n: string | null;
  total_contracts: number;
  createdAt: string;
  updatedAt: string;
}

interface ClientFormData {
  raison_sociale: string;
  rc: string;
  contact: string;
  email: string;
  address: string;
  phone_n?: string;
}

export function useGetClients(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['clients', { page, limit }],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: Client[]; pagination: Pagination }>('/clients', {
          params: { page, limit },
        })
        .then((res) => ({ data: res.data.data, pagination: res.data.pagination })),
  });
}

export function useMutateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id?: number; data: ClientFormData }) => {
      if (variables.id) {
        return apiClient
          .patch<{ success: true; data: Client }>(`/clients/${variables.id}`, variables.data)
          .then((res) => res.data.data);
      }
      return apiClient
        .post<{ success: true; data: Client }>('/clients', variables.data)
        .then((res) => res.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
