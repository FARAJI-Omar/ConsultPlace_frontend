import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

export type AlertType = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertEvent = 'LATE_INVOICE' | 'LATE_PAYOUT' | 'UNBILLED_CRA' | 'PENDING_CRA' | 'UPCOMING_BILL' | 'LOW_BDC_DAYS';

export const ALLOWED_VARIABLES: Record<AlertEvent, string[]> = {
  LATE_INVOICE: ['invoiceRef', 'daysOverdue', 'daysUntilDue', 'clientName', 'amount', 'dueDate'],
  LATE_PAYOUT: ['invoiceRef', 'daysOverdue', 'consultantName', 'clientName', 'amount'],
  PENDING_CRA: ['month', 'consultantName', 'daysPending'],
  UNBILLED_CRA: ['month', 'consultantName', 'daysSinceValidation'],
  UPCOMING_BILL: ['invoiceRef', 'daysUntilDue', 'clientName', 'amount', 'dueDate'],
  LOW_BDC_DAYS: ['bdcRef', 'daysLeft', 'totalDays', 'clientName'],
};

export interface AlertRule {
  id: number;
  type: AlertType;
  event: AlertEvent;
  threshold: number;
  isActive: boolean;
  titleTemplate: string | null;
  messageTemplate: string | null;
}

export interface AlertRuleFormData {
  type: AlertType;
  event?: AlertEvent;
  threshold: number;
  isActive: boolean;
  titleTemplate?: string | null;
  messageTemplate?: string | null;
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

export function useGetAlertRuleById(id: number | undefined) {
  return useQuery({
    queryKey: ['alert-rules', id],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: AlertRule }>(`/alert-rules/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
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
    mutationFn: ({ id, data }: { id: number; data: Partial<AlertRuleFormData> }) =>
      apiClient
        .patch<{ success: true; data: AlertRule }>(`/alert-rules/${id}`, data)
        .then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });
}
