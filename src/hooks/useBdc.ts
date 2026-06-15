import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import type { BonDeCommande } from '../types/models';
import type { Pagination } from '../types/api';

interface BdcListResponse {
  success: boolean;
  data: BonDeCommande[];
  pagination: Pagination;
}

interface BdcDetailResponse {
  success: boolean;
  data: BonDeCommande;
}

interface CreateBdcPayload {
  bdc: string;
  contractId: number;
  missionId?: number;
  totalDays: number;
  startDate: string;
  endDate?: string;
  files?: File[];
}

interface UpdateBdcPayload {
  bdc?: string;
  totalDays?: number;
  startDate?: string;
  endDate?: string | null;
  files?: File[];
  deleteAttachmentIds?: number[];
}

export function useGetBdcs(
  page = 1,
  limit = 20,
  missionId?: number,
  contractId?: number,
) {
  return useQuery({
    queryKey: ['bdcs', { page, limit, missionId, contractId }],
    queryFn: () =>
      apiClient
        .get<BdcListResponse>('/bons-de-commande', {
          params: { page, limit, ...(missionId ? { missionId } : {}), ...(contractId ? { contractId } : {}) },
        })
        .then((res) => res.data),
  });
}

export function useGetBdcById(id: number | undefined) {
  return useQuery({
    queryKey: ['bdcs', id],
    queryFn: () =>
      apiClient
        .get<BdcDetailResponse>(`/bons-de-commande/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
  });
}

export function useGetBdcsByContract(contractId: number | undefined) {
  return useQuery({
    queryKey: ['bdcs', { contractId }],
    queryFn: () =>
      apiClient
        .get<BdcListResponse>('/bons-de-commande', {
          params: { contractId, limit: 200 },
        })
        .then((res) => res.data.data),
    enabled: !!contractId,
  });
}

export function useGetBdcsByMission(missionId: number | undefined) {
  return useQuery({
    queryKey: ['bdcs', { missionId }],
    queryFn: () =>
      apiClient
        .get<BdcListResponse>('/bons-de-commande', {
          params: { missionId, limit: 200 },
        })
        .then((res) => res.data.data),
    enabled: !!missionId,
  });
}

export function useCreateBdc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBdcPayload) => {
      const hasFiles = payload.files && payload.files.length > 0;
      if (hasFiles) {
        const formData = new FormData();
        formData.append('bdc', payload.bdc);
        formData.append('contractId', String(payload.contractId));
        if (payload.missionId) formData.append('missionId', String(payload.missionId));
        formData.append('totalDays', String(payload.totalDays));
        formData.append('startDate', payload.startDate);
        if (payload.endDate) formData.append('endDate', payload.endDate);
        payload.files!.forEach((file) => formData.append('files', file));
        return apiClient
          .post<BdcDetailResponse>('/bons-de-commande', formData)
          .then((res) => res.data.data);
      }
      return apiClient
        .post<BdcDetailResponse>('/bons-de-commande', {
          bdc: payload.bdc,
          contractId: payload.contractId,
          ...(payload.missionId ? { missionId: payload.missionId } : {}),
          totalDays: payload.totalDays,
          startDate: payload.startDate,
          ...(payload.endDate ? { endDate: payload.endDate } : {}),
        })
        .then((res) => res.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bdcs'] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useUpdateBdc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBdcPayload }) => {
      const hasFiles = data.files && data.files.length > 0;
      const hasDeleteIds = data.deleteAttachmentIds && data.deleteAttachmentIds.length > 0;
      if (hasFiles || hasDeleteIds) {
        const formData = new FormData();
        if (data.bdc !== undefined) formData.append('bdc', data.bdc);
        if (data.totalDays !== undefined) formData.append('totalDays', String(data.totalDays));
        if (data.startDate !== undefined) formData.append('startDate', data.startDate);
        if (data.endDate !== undefined) formData.append('endDate', data.endDate ?? '');
        if (hasFiles) data.files!.forEach((file) => formData.append('files', file));
        if (hasDeleteIds) formData.append('deleteAttachmentIds', JSON.stringify(data.deleteAttachmentIds));
        return apiClient
          .patch<BdcDetailResponse>(`/bons-de-commande/${id}`, formData)
          .then((res) => res.data.data);
      }
      return apiClient
        .patch<BdcDetailResponse>(`/bons-de-commande/${id}`, {
          ...data,
          ...(hasDeleteIds ? { deleteAttachmentIds: data.deleteAttachmentIds } : {}),
        })
        .then((res) => res.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bdcs'] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useUploadBdcAttachments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, files }: { id: number; files: File[] }) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      return apiClient
        .post<BdcDetailResponse>(`/bons-de-commande/${id}/attachments`, formData)
        .then((res) => res.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bdcs'] });
    },
  });
}
