import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { JobStatusResponse } from '../../types/manager';

export function useJobStatus(jobId: number | null) {
  return useQuery({
    queryKey: ['job-status', jobId],
    queryFn: () =>
      apiClient.get<JobStatusResponse>(`/jobs/${jobId}`).then((res) => res.data),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      if (status === 'COMPLETED' || status === 'FAILED') return false;
      return 10000;
    },
  });
}
