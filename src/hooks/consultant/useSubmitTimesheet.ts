import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { ApiResponse } from '../../types/api';
import type { SubmitTimesheetResponse } from '../../types/consultant';

export function useSubmitTimesheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.put<
        ApiResponse<SubmitTimesheetResponse>
      >(`/consultant/timesheets/${id}/submit`);
      return data.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['consultant-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['consultant-timesheets', id] });
    },
  });
}
