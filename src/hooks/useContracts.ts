import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import type { Pagination } from '../types/api';

interface DocumentFile {
  id: number;
  timesheetId?: number | null;
  contractId?: number | null;
  filename: string;
  url: string;
  type: 'CONTRACT_DOC' | 'PROOF' | 'CRA' | 'INVOICE';
  uploadedAt?: string;
}

export interface Contract {
  id: number;
  ref: string;
  clientId: number;
  startDate: string;
  endDate: string;
  profile: string;
  dailyRate: number;
  isArchived: boolean;
  documents: DocumentFile[];
  attachments?: DocumentFile[];
  client?: { id: number; raison_sociale: string };
  createdAt: string;
  updatedAt: string;
}

export interface ContractFormData {
  clientId: number;
  startDate: string;
  endDate: string;
  profile: string;
  dailyRate: number;
  files?: File[];
}

export interface UpdateContractFormData {
  startDate?: string;
  endDate?: string;
  profile?: string;
  dailyRate?: number;
  files?: File[];
  deleteAttachmentIds?: number[];
}

export function useGetContracts(page = 1, limit = 10, includeArchived = false) {
  return useQuery({
    queryKey: ['contracts', { page, limit, includeArchived }],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: Contract[]; pagination: Pagination }>('/contracts', {
          params: { page, limit, ...(includeArchived ? { includeArchived: 'true' } : {}) },
        })
        .then((res) => ({ data: res.data.data, pagination: res.data.pagination })),
  });
}

export function useGetContractById(id: number | undefined) {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: Contract }>(`/contracts/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
  });
}

export function useMutateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ContractFormData) => {
      const formData = new FormData();
      formData.append('clientId', String(data.clientId));
      formData.append('startDate', data.startDate);
      formData.append('endDate', data.endDate);
      formData.append('profile', data.profile);
      formData.append('dailyRate', String(data.dailyRate));
      if (data.files) {
        data.files.forEach((file) => formData.append('files', file));
      }
      return apiClient
        .post<{ success: true; data: Contract }>('/contracts', formData)
        .then((res) => res.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateContractFormData }) => {
      const formData = new FormData();
      if (data.startDate !== undefined) formData.append('startDate', data.startDate);
      if (data.endDate !== undefined) formData.append('endDate', data.endDate);
      if (data.profile !== undefined) formData.append('profile', data.profile);
      if (data.dailyRate !== undefined) formData.append('dailyRate', String(data.dailyRate));
      if (data.files) data.files.forEach((file) => formData.append('files', file));
      if (data.deleteAttachmentIds && data.deleteAttachmentIds.length > 0)
        formData.append('deleteAttachmentIds', JSON.stringify(data.deleteAttachmentIds));
      return apiClient
        .patch<{ success: true; data: Contract }>(`/contracts/${id}`, formData)
        .then((res) => res.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useToggleContractArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isArchived }: { id: number; isArchived: boolean }) => {
      const endpoint = isArchived ? 'archive' : 'restore';
      return apiClient
        .patch<{ success: true; data: Contract }>(`/contracts/${id}/${endpoint}`)
        .then((res) => res.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}
