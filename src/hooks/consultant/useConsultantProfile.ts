import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { ApiResponse } from '../../types/api';
import type { ConsultantProfileData } from '../../types/consultant';

export function useConsultantProfile(year?: number) {
  return useQuery({
    queryKey: ['consultant-profile', year],
    queryFn: async () => {
      const params = year ? `?year=${year}` : '';
      const { data } = await apiClient.get<ApiResponse<ConsultantProfileData>>(
        `/consultants/me${params}`,
      );
      return data.data;
    },
  });
}
