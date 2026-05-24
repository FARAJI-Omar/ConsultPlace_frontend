import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';

interface TrackingInvoice {
  invoiceId: number;
  ref: string;
}

interface TrackingEntry {
  timesheetId: number;
  month: string;
  missionTitle: string;
  timesheetStatus: string;
  paymentRef: string;
  paymentAmount: number;
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
