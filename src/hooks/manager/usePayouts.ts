import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { PayoutHistory, PayoutPayload } from '../../types/manager';

interface PayoutHistoryResponse {
  success: boolean;
  data: PayoutHistory;
}

interface PayoutResponse {
  success: boolean;
  data: {
    id: number;
    invoiceId: number;
    consultantId: number;
    ref: string;
    amount: number;
    status: string;
    type: string;
    date: string;
  };
}

export function usePayoutsHistory() {
  return useQuery({
    queryKey: ['payouts-history'],
    queryFn: () =>
      apiClient.get<PayoutHistoryResponse>('/payouts/history').then((res) => res.data),
  });
}

export function useExportPayoutsPdf() {
  return useMutation({
    mutationFn: (month: string) =>
      apiClient
        .get(`/payouts/history/pdf?month=${month}`, { responseType: 'blob' })
        .then((res) => {
          const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
          const link = document.createElement('a');
          link.href = url;
          link.download = `paiements-${month}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        }),
  });
}

export function useTriggerPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PayoutPayload) =>
      apiClient.post<PayoutResponse>('/payouts/consultant', payload).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts-history'] });
      queryClient.invalidateQueries({ queryKey: ['tracking-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
