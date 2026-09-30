import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';

export interface AttestationDoc {
  id: number;
  key: string;
  filename: string;
  url: string;
  isActive: boolean;
  uploadedAt: string;
}

interface AttestationResponse {
  success: boolean;
  data: AttestationDoc | null;
}

const BASE = '/company-documents/attestation-fiscale';

export function useAttestation() {
  return useQuery({
    queryKey: ['attestation-fiscale'],
    queryFn: () => apiClient.get<AttestationResponse>(BASE).then((res) => res.data),
  });
}

export function useUploadAttestation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient
        .post<AttestationResponse>(BASE, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attestation-fiscale'] });
    },
  });
}

export function useSetAttestationActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) =>
      apiClient.patch<AttestationResponse>(`${BASE}/active`, { isActive }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attestation-fiscale'] });
    },
  });
}

export function useDeleteAttestation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete(BASE).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attestation-fiscale'] });
    },
  });
}
