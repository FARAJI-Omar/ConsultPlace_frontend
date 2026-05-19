import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { ApiResponse } from '../../types/api';
import type { CreateTimesheetPayload } from '../../types/consultant';
import type { Timesheet } from '../../types/models';

export function useCreateTimesheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTimesheetPayload) => {
      const { data } = await apiClient.post<ApiResponse<Timesheet>>(
        '/consultant/timesheets',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant-timesheets'] });
    },
  });
}
