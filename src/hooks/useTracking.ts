import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

interface DashboardKPIs {
  pendingInvoices: number;
  totalPendingInvoices: number;
  totalPaid: number;
}

interface TrackingRow {
  id: number;
  ref: string;
  client: string;
  consultant: string;
  amount: number;
  vat: number;
  total: number;
  status: string;
  issueDate: string;
  dueDate: string;
  totalPaid: number;
  cabinet_margin: number;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

interface MarginReport {
  period: number;
  summary: {
    totalRevenue: number;
    totalPayouts: number;
    cabinet_margin: number;
    marginPercentage: number;
  };
  byClient: Array<{ clientId: number; clientName: string; totalRevenue: number; invoiceCount: number }>;
  byConsultant: Array<{ consultantId: number; consultantName: string; totalPayout: number }>;
}

interface TurnoverForecast {
  forecastMonths: number;
  totalEstimatedRevenue: number;
  avgMonthlyRevenue: number;
  activeMissionsCount: number;
  missions: Array<{
    missionId: number;
    missionTitle: string;
    clientName: string;
    consultantName: string;
    dailyRate: number;
    estimatedDaysPerMonth: number;
    estimatedRevenuePerMonth: number;
    monthsRemaining: number;
    totalEstimatedRevenue: number;
    startDate: string;
    endDate: string;
  }>;
}

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['tracking', 'dashboard'],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: { kpis: DashboardKPIs } }>('/tracking/dashboard')
        .then((res) => res.data.data.kpis),
  });
}

export function useGlobalTracking(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['tracking', 'global', { page, pageSize }],
    queryFn: () =>
      apiClient
        .get<{
          success: true;
          data: TrackingRow[];
          pagination: Pagination;
        }>('/tracking/global', { params: { page, limit: pageSize } })
        .then((res) => ({ data: res.data.data, pagination: res.data.pagination })),
  });
}

export function useMarginReport() {
  return useQuery({
    queryKey: ['tracking', 'forecasts', 'margin'],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: MarginReport }>('/tracking/forecasts/margin')
        .then((res) => res.data.data),
  });
}

export function useTurnoverForecast(months = 6) {
  return useQuery({
    queryKey: ['tracking', 'forecasts', 'turnover', { months }],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: TurnoverForecast }>('/tracking/forecasts/turnover', {
          params: { months },
        })
        .then((res) => res.data.data),
  });
}
