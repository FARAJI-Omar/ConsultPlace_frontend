import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

export type AlertType = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertEvent = 'LATE_INVOICE' | 'LATE_PAYOUT' | 'UNBILLED_CRA' | 'PENDING_CRA' | 'UPCOMING_BILL';

export interface AlertRule {
  id: number;
  type: AlertType;
  event: AlertEvent;
  threshold: number;
  isActive: boolean;
}

export interface AlertRuleFormData {
  type: AlertType;
  event: AlertEvent;
  threshold: number;
  isActive: boolean;
}

export function useGetAlertRules() {
  return useQuery({
    queryKey: ['alert-rules'],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: AlertRule[] }>('/alert-rules')
        .then((res) => res.data.data),
  });
}

export function useCreateAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AlertRuleFormData) =>
      apiClient
        .post<{ success: true; data: AlertRule }>('/alert-rules', data)
        .then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });
}

export function useUpdateAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AlertRuleFormData }) =>
      apiClient
        .put<{ success: true; data: AlertRule }>(`/alert-rules/${id}`, data)
        .then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });
}
