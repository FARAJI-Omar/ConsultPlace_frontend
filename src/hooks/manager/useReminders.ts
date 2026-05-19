import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { ReminderPayload, ReminderResponse } from '../../types/manager';

interface SendReminderResponse {
  success: boolean;
  data: { success: boolean; sentTo: string; invoiceRef: string };
}

export function useSendReminder() {
  return useMutation({
    mutationFn: (invoiceId: number) =>
      apiClient.post<SendReminderResponse>(`/reminders/${invoiceId}`).then((res) => res.data),
  });
}

export function useSetAutoReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: number; payload: ReminderPayload }) =>
      apiClient
        .post<{ success: boolean; data: ReminderResponse }>(`/reminders/${invoiceId}/auto`, payload)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useStopAutoReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: number) =>
      apiClient
        .delete<{ success: boolean; data: { invoiceId: number; status: string } }>(`/reminders/${invoiceId}/auto`)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
