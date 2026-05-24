import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { Timesheet } from '../../types/models';
import type { PaginatedResponse, ApiResponse } from '../../types/api';
import type { ConsultantMission, TrackingEntry } from '../../types/consultant';

export interface ConsultantEarnings {
  year: number;
  totalEarnings: number;
}

export interface ConsultantDashboardData {
  timesheets: Timesheet[];
  earnings: ConsultantEarnings | null;
  totalMissions: number;
  activeMissions: number;
  isLoading: boolean;
  isError: boolean;
}

function useConsultantMissionsCount(status?: string) {
  return useQuery({
    queryKey: ['consultant-missions-count', status ?? 'all'],
    queryFn: async () => {
      const params = status ? `?status=${status}&limit=1` : '?limit=1';
      const { data } = await apiClient.get<
        PaginatedResponse<ConsultantMission>
      >(`/consultant/missions${params}`);
      return data.pagination.totalItems;
    },
  });
}

export function useConsultantTimesheets() {
  return useQuery({
    queryKey: ['consultant-timesheets'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Timesheet[]>>(
        '/consultant/timesheets',
      );
      return data.data;
    },
  });
}

export function useConsultantTracking(year?: number) {
  const currentYear = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: ['consultant-tracking', currentYear],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TrackingEntry[]>>(
        `/consultant/tracking?year=${currentYear}`,
      );
      return data.data;
    },
  });
}

export function useConsultantEarnings(year?: number) {
  const currentYear = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: ['consultant-earnings', currentYear],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ConsultantEarnings>>(
        `/consultants/me/earnings?year=${currentYear}`,
      );
      return data.data;
    },
  });
}

export function useConsultantDashboard(): ConsultantDashboardData {
  const {
    data: totalMissions,
    isLoading: totalLoading,
    isError: totalError,
  } = useConsultantMissionsCount();

  const {
    data: activeMissions,
    isLoading: activeLoading,
    isError: activeError,
  } = useConsultantMissionsCount('ACTIVE');

  const {
    data: timesheets,
    isLoading: tsLoading,
    isError: tsError,
  } = useConsultantTimesheets();

  const {
    data: earnings,
    isLoading: earLoading,
    isError: earError,
  } = useConsultantEarnings();

  return {
    timesheets: timesheets ?? [],
    earnings: earnings ?? null,
    totalMissions: totalMissions ?? 0,
    activeMissions: activeMissions ?? 0,
    isLoading: totalLoading || activeLoading || tsLoading || earLoading,
    isError: totalError || activeError || tsError || earError,
  };
}
