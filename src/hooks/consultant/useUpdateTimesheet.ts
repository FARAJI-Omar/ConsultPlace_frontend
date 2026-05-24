import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { ApiResponse } from '../../types/api';
import type { Timesheet } from '../../types/models';
import type { DailyEntry } from '../../types/models';

export function useUpdateTimesheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      dailyEntries,
    }: {
      id: number;
      dailyEntries: DailyEntry[];
    }) => {
      const { data } = await apiClient.put<ApiResponse<Timesheet>>(
        `/consultant/timesheets/${id}`,
        { dailyEntries },
      );
      return data.data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['consultant-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['consultant-timesheets', id] });
    },
  });
}
