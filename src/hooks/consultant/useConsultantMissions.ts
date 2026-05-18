import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { PaginatedResponse } from '../../types/api';
import type { ConsultantMission } from '../../types/consultant';

interface MissionsParams {
  page?: number;
  limit?: number;
  status?: 'ACTIVE' | 'CLOSED';
}

export function useConsultantMissions(params: MissionsParams = {}) {
  const { page = 1, limit = 10, status } = params;
  return useQuery({
    queryKey: ['consultant-missions', { page, limit, status }],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(page));
      searchParams.set('limit', String(limit));
      if (status) searchParams.set('status', status);
      const { data } = await apiClient.get<PaginatedResponse<ConsultantMission>>(
        `/consultant/missions?${searchParams.toString()}`,
      );
      return data;
    },
  });
}
