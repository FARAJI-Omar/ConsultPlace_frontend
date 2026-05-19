import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { ManagerTimesheet, ManagerTimesheetDetail, ReviewPayload } from '../../types/manager';
import type { Pagination } from '../../types/api';

interface TimesheetListResponse {
  success: boolean;
  data: ManagerTimesheet[];
  pagination: Pagination;
}

interface TimesheetDetailResponse {
  success: boolean;
  data: ManagerTimesheetDetail;
}

interface ReviewResponse {
  success: boolean;
  data: { id: number; status: string; updatedAt: string };
}

export function useManagerTimesheets(page: number, limit: number, status?: string) {
  return useQuery({
    queryKey: ['manager-timesheets', { page, limit, status }],
    queryFn: () =>
      apiClient
        .get<TimesheetListResponse>('/manager/timesheets', {
          params: { page, limit, ...(status ? { status } : {}) },
        })
        .then((res) => res.data),
    placeholderData: (prev) => prev,
  });
}

export function useManagerTimesheetDetail(id: number | null) {
  return useQuery({
    queryKey: ['manager-timesheets', id],
    queryFn: () =>
      apiClient
        .get<TimesheetDetailResponse>(`/manager/timesheets/${id}`)
        .then((res) => res.data),
    enabled: id !== null,
  });
}

export function useReviewTimesheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ReviewPayload }) =>
      apiClient
        .post<ReviewResponse>(`/manager/timesheets/${id}/review`, payload)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-timesheets'] });
    },
  });
}
