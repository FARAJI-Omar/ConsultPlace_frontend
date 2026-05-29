import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import type { Pagination } from '../types/api';
import type { ClientDetail } from '../types/models';

interface Client {
  id: number;
  raison_sociale: string;
  rc?: string;
  identifiant_commun: string;
  identifiant_fiscal: string | null;
  contact: string;
  email: string;
  address: string;
  phone_n: string | null;
  total_contracts: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientFormData {
  raison_sociale: string;
  rc?: string;
  identifiant_commun: string;
  identifiant_fiscal?: string;
  contact: string;
  email: string;
  address: string;
  phone_n?: string;
}

export function useGetClients(page = 1, limit = 10, includeArchived = false) {
  return useQuery({
    queryKey: ['clients', { page, limit, includeArchived }],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: Client[]; pagination: Pagination }>('/clients', {
          params: { page, limit, ...(includeArchived ? { includeArchived: 'true' } : {}) },
        })
        .then((res) => ({ data: res.data.data, pagination: res.data.pagination })),
  });
}

export function useGetClientById(id: number | undefined) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: ClientDetail }>(`/clients/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
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

export function useToggleClientArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isArchived }: { id: number; isArchived: boolean }) => {
      const endpoint = isArchived ? 'archive' : 'restore';
      return apiClient
        .patch<{ success: true; data: Client }>(`/clients/${id}/${endpoint}`)
        .then((res) => res.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
