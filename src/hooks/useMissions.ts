import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import type { Pagination } from '../types/api';

export interface Mission {
  id: number;
  contractId: number;
  consultantId: number;
  title: string;
  startDate: string;
  endDate: string | null;
  status: 'ACTIVE' | 'CLOSED';
  contract?: { id: number; ref: string };
  consultant?: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface MissionFormData {
  contractId: number;
  consultantId: number;
  title: string;
  startDate: string;
  endDate?: string;
}

export function useGetMissions(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['missions', { page, limit }],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: Mission[]; pagination: Pagination }>('/missions', {
          params: { page, limit },
        })
        .then((res) => ({ data: res.data.data, pagination: res.data.pagination })),
  });
}

export function useGetMissionById(id: number | undefined) {
  return useQuery({
    queryKey: ['missions', id],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: Mission }>(`/missions/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
  });
}

export function useGetMissionsByContract(contractId: number | undefined) {
  return useQuery({
    queryKey: ['missions', { contractId }],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: Mission[] }>('/missions', {
          params: { contractId },
        })
        .then((res) => res.data.data),
    enabled: !!contractId,
  });
}

export function useMutateMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MissionFormData) =>
      apiClient
        .post<{ success: true; data: Mission }>('/missions', data)
        .then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useCloseMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiClient
        .patch<{ success: true; data: Mission }>(`/missions/${id}/close`)
        .then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}
