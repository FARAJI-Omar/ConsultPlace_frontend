import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import type { Pagination } from '../types/api';

export interface AuditLogEntry {
  id: number;
  userId: number;
  userEmail: string;
  userRole: string;
  userIp?: string;
  action: string;
  entityType: string;
  entityId: number;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export function useGetAuditLogs(
  page = 1,
  limit = 10,
  role?: string,
  user?: string,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: ['audit-log', { page, limit, role, user, startDate, endDate }],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: AuditLogEntry[]; pagination: Pagination }>('/audit-log', {
          params: { page, limit, role, user, startDate, endDate },
        })
        .then((res) => ({ data: res.data.data, pagination: res.data.pagination })),
  });
}
