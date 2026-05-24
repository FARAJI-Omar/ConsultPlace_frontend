import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';

interface TrackingInvoice {
  invoiceId: number;
  ref: string;
}

interface TrackingEntry {
  timesheetId: number;
  date: string;
  missionTitle: string;
  missionId: number;
  timesheetStatus: string;
  paymentRef: string;
  paymentAmount: number;
  invoices: TrackingInvoice[];
}

export function useConsultantTracking(year?: number) {
  const currentYear = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: ['consultant-tracking', currentYear],
    queryFn: () =>
      apiClient
        .get<{ success: true; data: TrackingEntry[] }>(`/consultant/tracking?year=${currentYear}`)
        .then((res) => res.data.data),
  });
}

export type { TrackingEntry, TrackingInvoice };
