import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';

interface TrackingInvoice {
  invoiceId: number;
  amount: number;
  status: 'PENDING' | 'PARTIAL_PAID' | 'PAID' | 'CANCELED';
}

interface TrackingEntry {
  timesheetId: number;
  month: string;
  missionTitle: string;
  timesheetStatus: string;
  invoices: TrackingInvoice[];
}

export function useConsultantTracking() {
  return useQuery({
    queryKey: ['consultant-tracking'],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: TrackingEntry[] }>('/consultant/tracking')
        .then((res) => res.data.data),
  });
}

export type { TrackingEntry, TrackingInvoice };
