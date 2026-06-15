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
  contract?: { id: number; ref: string; startDate?: string; endDate?: string; profile?: string; dailyRate?: number };
  consultant?: { id: number; name: string };
  consultants?: { consultantId: number; dailyRate: number; consultant: { id: number; name: string } }[];
  bdcs?: { id: number; bdc: string; totalDays: number; daysLeft: number; isActive: boolean; startDate?: string; endDate?: string | null; attachments?: { id: number; filename: string; url: string; type: string }[] }[];
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
  consultants: { consultantId: number; dailyRate: number }[];
  title: string;
  startDate: string;
  endDate?: string;
  files?: File[];
  bdcIds?: number[];
}

export interface UpdateMissionFormData {
  title?: string;
  startDate?: string;
  endDate?: string | null;
  consultantRates?: { consultantId: number; dailyRate: number }[];
  files?: File[];
  deleteAttachmentIds?: number[];
  bdcIds?: number[];
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
      const hasFiles = data.files && data.files.length > 0;
      if (hasFiles) {
        const formData = new FormData();
        formData.append('contractId', String(data.contractId));
        formData.append('consultants', JSON.stringify(data.consultants));
        formData.append('title', data.title);
        formData.append('startDate', data.startDate);
        if (data.endDate) formData.append('endDate', data.endDate);
        if (data.bdcIds && data.bdcIds.length > 0) formData.append('bdcIds', JSON.stringify(data.bdcIds));
        data.files!.forEach((file) => formData.append('files', file));
        return apiClient
          .post<{ success: true; data: Mission }>('/missions', formData)
          .then((res) => res.data.data);
      }
      const body: Record<string, unknown> = {
        contractId: data.contractId,
        consultants: data.consultants,
        title: data.title,
        startDate: data.startDate,
        ...(data.endDate ? { endDate: data.endDate } : {}),
        ...(data.bdcIds && data.bdcIds.length > 0 ? { bdcIds: data.bdcIds } : {}),
      };
      return apiClient
        .post<{ success: true; data: Mission }>('/missions', body)
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
        if (data.consultantRates !== undefined) formData.append('consultantRates', JSON.stringify(data.consultantRates));
        if (data.bdcIds !== undefined) formData.append('bdcIds', JSON.stringify(data.bdcIds));
        data.files!.forEach((file) => formData.append('files', file));
        if (data.deleteAttachmentIds && data.deleteAttachmentIds.length > 0)
          formData.append('deleteAttachmentIds', JSON.stringify(data.deleteAttachmentIds));
        return apiClient
          .patch<{ success: true; data: Mission }>(`/missions/${id}`, formData)
          .then((res) => res.data.data);
      }
      const body: Record<string, unknown> = {};
      if (data.title !== undefined) body.title = data.title;
      if (data.startDate !== undefined) body.startDate = data.startDate;
      if (data.endDate !== undefined) body.endDate = data.endDate;
      if (data.consultantRates !== undefined) body.consultantRates = data.consultantRates;
      if (data.bdcIds !== undefined) body.bdcIds = data.bdcIds;
      if (data.deleteAttachmentIds && data.deleteAttachmentIds.length > 0) body.deleteAttachmentIds = data.deleteAttachmentIds;
      return apiClient
        .patch<{ success: true; data: Mission }>(`/missions/${id}`, body)
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
