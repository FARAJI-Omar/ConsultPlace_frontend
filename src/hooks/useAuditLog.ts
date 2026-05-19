import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import type { Pagination } from '../types/api';

export interface AuditLogEntry {
  id: number;
  userId: number;
  userRole: string;
  action: string;
  entityType: string;
  entityId: number;
  details: Record<string, unknown> | null;
  ipAddress: string;
  timestamp: string;
}

export function useGetAuditLogs(
  page = 1,
  limit = 10,
  action?: string,
  entityType?: string,
) {
  return useQuery({
    queryKey: ['audit-log', { page, limit, action, entityType }],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: AuditLogEntry[]; pagination: Pagination }>('/audit-log', {
          params: { page, limit, action, entityType },
        })
        .then((res) => ({ data: res.data.data, pagination: res.data.pagination })),
  });
}
