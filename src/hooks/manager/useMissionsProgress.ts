import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { ApiResponse } from '../../types/api';
import type { MissionsProgressRow } from '../../types/manager';

export function useMissionsProgress() {
  return useQuery({
    queryKey: ['tracking-missions-progress'],
    queryFn: () =>
      apiClient
        .get<ApiResponse<MissionsProgressRow[]>>('/tracking/missions-progress')
        .then((res) => res.data),
  });
}
