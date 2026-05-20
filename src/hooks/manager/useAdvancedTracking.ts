import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type {
  TrackingRow,
  TurnoverForecast,
  MarginForecast,
} from '../../types/manager';
import type { PaginatedResponse, ApiResponse } from '../../types/api';

interface TrackingFilters {
  status?: string;
  client?: string;
  startDate?: string;
  endDate?: string;
}

export function useGlobalTracking(
  page: number,
  limit: number,
  filters: TrackingFilters,
) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (filters.status) params.set('status', filters.status);
  if (filters.client) params.set('client', filters.client);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);

  return useQuery({
    queryKey: ['tracking-global', { page, limit, ...filters }],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<TrackingRow>>(`/tracking/global?${params}`)
        .then((res) => res.data),
  });
}

export function useTurnoverForecast(months: number = 6) {
  return useQuery({
    queryKey: ['tracking-forecasts-turnover', months],
    queryFn: () =>
      apiClient
        .get<ApiResponse<TurnoverForecast>>(
          `/tracking/forecasts/turnover?months=${months}`,
        )
        .then((res) => res.data),
  });
}

export function useMarginForecast() {
  return useQuery({
    queryKey: ['tracking-forecasts-margin'],
    queryFn: () =>
      apiClient
        .get<ApiResponse<MarginForecast>>('/tracking/forecasts/margin')
        .then((res) => res.data),
  });
}

export function exportTrackingCSV(filters: TrackingFilters) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.client) params.set('client', filters.client);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);

  const token = localStorage.getItem('token');
  const query = params.toString();
  const url = `${import.meta.env.VITE_API_BASE_URL}/api/tracking/global/export${query ? `?${query}` : ''}`;

  return fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(async (res) => {
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'global-tracking.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  });
}
