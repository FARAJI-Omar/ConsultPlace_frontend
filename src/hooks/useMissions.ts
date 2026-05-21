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
  attachments?: { id: number; filename: string; url: string; type: string; createdAt: string }[];
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
  files?: File[];
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
    mutationFn: (data: MissionFormData) => {
      const formData = new FormData();
      formData.append('contractId', String(data.contractId));
      formData.append('consultantId', String(data.consultantId));
      formData.append('title', data.title);
      formData.append('startDate', data.startDate);
      if (data.endDate) formData.append('endDate', data.endDate);
      if (data.files) {
        data.files.forEach((file) => formData.append('files', file));
      }
      return apiClient
        .post<{ success: true; data: Mission }>('/missions', formData)
        .then((res) => res.data.data);
    },
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
