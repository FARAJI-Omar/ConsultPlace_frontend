import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { DashboardKPIs, MonthlySummary, AlertData } from '../../types/manager';

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['tracking-dashboard'],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: { kpis: DashboardKPIs } }>('/tracking/dashboard')
        .then((res) => res.data.data.kpis),
  });
}

export function useMonthlySummary(year?: number, month?: number) {
  const now = new Date();
  return useQuery({
    queryKey: ['tracking-monthly-summary', { year: year ?? now.getFullYear(), month: month ?? now.getMonth() + 1 }],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: MonthlySummary }>('/tracking/monthly-summary', {
          params: { year: year ?? now.getFullYear(), month: month ?? now.getMonth() + 1 },
        })
        .then((res) => res.data.data),
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ['tracking-alerts'],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: AlertData }>('/tracking/alerts')
        .then((res) => res.data.data),
  });
}

export function useUpdateAlertStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'RESOLVED' | 'REMINDED' }) =>
      apiClient
        .patch<{ success: true; data: { id: number; status: string } }>(`/tracking/alerts/${id}/status`, { status })
        .then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-alerts'] });
    },
  });
}
