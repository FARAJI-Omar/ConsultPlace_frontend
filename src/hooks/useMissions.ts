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
  missionDailyRate?: number;
  attachments?: { id: number; filename: string; url: string; type: string; createdAt: string }[];
  contract?: { id: number; ref: string; startDate?: string; endDate?: string; profile?: string; dailyRate?: number };
  consultant?: { id: number; name: string };
  timesheets?: {
    id: number;
    consultantId: number;
    missionId: number;
    month: string;
    days: number;
    totalHours: number;
    status: string;
    clientValidation: boolean;
    submittedAt?: string;
    rejectionReason?: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface MissionFormData {
  contractId: number;
  consultantId: number;
  title: string;
  startDate: string;
  endDate?: string;
  missionDailyRate: number;
  files?: File[];
}

export interface UpdateMissionFormData {
  title?: string;
  startDate?: string;
  endDate?: string | null;
  missionDailyRate?: number;
  files?: File[];
  deleteAttachmentIds?: number[];
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
      formData.append('missionDailyRate', String(data.missionDailyRate));
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

export function useUpdateMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMissionFormData }) => {
      const hasFiles = data.files && data.files.length > 0;
      if (hasFiles) {
        const formData = new FormData();
        if (data.title !== undefined) formData.append('title', data.title);
        if (data.startDate !== undefined) formData.append('startDate', data.startDate);
        if (data.endDate !== undefined) formData.append('endDate', data.endDate ?? '');
        if (data.missionDailyRate !== undefined) formData.append('missionDailyRate', String(data.missionDailyRate));
        data.files!.forEach((file) => formData.append('files', file));
        if (data.deleteAttachmentIds && data.deleteAttachmentIds.length > 0)
          formData.append('deleteAttachmentIds', JSON.stringify(data.deleteAttachmentIds));
        return apiClient
          .patch<{ success: true; data: Mission }>(`/missions/${id}`, formData)
          .then((res) => res.data.data);
      }
      return apiClient
        .patch<{ success: true; data: Mission }>(`/missions/${id}`, data)
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
