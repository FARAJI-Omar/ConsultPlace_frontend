import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { ApiResponse } from '../../types/api';
import type { DocumentFile } from '../../types/models';

export function useGetAttachments(timesheetId: number) {
  return useQuery({
    queryKey: ['attachments', timesheetId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DocumentFile[]>>(
        `/attachments/timesheet/${timesheetId}`,
      );
      return data.data;
    },
    enabled: !!timesheetId,
  });
}

export function useUploadAttachments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      files,
      timesheetId,
    }: {
      files: File[];
      timesheetId: string;
    }) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      formData.append('timesheetId', timesheetId);
      const { data } = await apiClient.post<ApiResponse<DocumentFile[]>>(
        '/attachments',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['attachments', Number(variables.timesheetId)],
      });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      timesheetId,
    }: {
      id: number;
      timesheetId: number;
    }) => {
      await apiClient.delete(`/attachments/${id}/${timesheetId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['attachments', variables.timesheetId],
      });
    },
  });
}
