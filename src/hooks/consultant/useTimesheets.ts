import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { ApiResponse } from '../../types/api';
import type { Timesheet } from '../../types/models';

export function useTimesheetById(id: number) {
  return useQuery({
    queryKey: ['consultant-timesheets', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Timesheet>>(
        `/consultant/timesheets/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function useSubmitTimesheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.put<
        ApiResponse<{ id: number; status: string; submittedAt: string; updatedAt: string }>
      >(`/consultant/timesheets/${id}/submit`);
      return data.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['consultant-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['consultant-timesheets', id] });
    },
  });
}
