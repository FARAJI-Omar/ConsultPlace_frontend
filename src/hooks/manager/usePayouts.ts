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
