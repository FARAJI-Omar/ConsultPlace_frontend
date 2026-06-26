import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import type { ContractRates, Invoice, PaymentRecord, MarkPaidPayload, PaymentPayload } from '../../types/manager';
import type { Pagination } from '../../types/api';

interface InvoiceListResponse {
  success: boolean;
  data: Invoice[];
  pagination: Pagination;
}

interface InvoiceDetailResponse {
  success: boolean;
  data: Invoice;
}

interface GenerateInvoicePayload {
  timesheetId: number;
  vatRate?: number;
  delai?: number;
  appliedDailyRate?: number;
  bdcAssignments?: { timesheetId: number; bdcId: number }[];
}

interface GenerateInvoiceResponse {
  success: boolean;
  data: Invoice;
}

interface CancelResponse {
  success: boolean;
  data: { id: number; status: string; updatedAt: string };
}

interface MarkPaidResponse {
  success: boolean;
  data: { invoiceId: number; amount: number; status: string; paymentDate: string };
}

interface PaymentResponse {
  success: boolean;
  data: PaymentRecord;
}

interface EmailResponse {
  success: boolean;
  data: { jobId: number; status: string; sentTo: string; invoiceRef: string };
}

export function useInvoices(page: number, limit: number, status?: string) {
  return useQuery({
    queryKey: ['invoices', { page, limit, status }],
    queryFn: () =>
      apiClient
        .get<InvoiceListResponse>('/invoices', {
          params: { page, limit, ...(status ? { status } : {}) },
        })
        .then((res) => res.data),
    placeholderData: (prev) => prev,
  });
}

export function useInvoiceDetail(id: number | null) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () =>
      apiClient
        .get<InvoiceDetailResponse>(`/invoices/${id}`)
        .then((res) => res.data),
    enabled: id !== null,
  });
}

export function useContractRates(timesheetId: number | null) {
  return useQuery({
    queryKey: ['contract-rates', timesheetId],
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: ContractRates }>(`/invoices/contract-rates/${timesheetId}`)
        .then((res) => res.data.data),
    enabled: timesheetId !== null,
  });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateInvoicePayload) =>
      apiClient
        .post<GenerateInvoiceResponse>('/invoices/generate', payload)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['tracking-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['manager-timesheets'] });
    },
  });
}

interface GenerateGroupedPayload {
  timesheetIds: number[];
  vatRate?: number;
  delai?: number;
  appliedDailyRate?: number;
  bdcAssignments?: { timesheetId: number; bdcId: number }[];
}

export function useGenerateGroupedInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateGroupedPayload) =>
      apiClient
        .post<GenerateInvoiceResponse>('/invoices/generate-grouped', payload)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['tracking-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['manager-timesheets'] });
    },
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient
        .post<CancelResponse>(`/invoices/${id}/cancel`)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useRegisterPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PaymentPayload }) =>
      apiClient
        .post<PaymentResponse>(`/invoices/${id}/payments`, payload)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['tracking-dashboard'] });
    },
  });
}

export function useMarkPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MarkPaidPayload) =>
      apiClient
        .post<MarkPaidResponse>('/payments/mark-paid', payload)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['tracking-dashboard'] });
    },
  });
}

export function useDownloadPdf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient
        .get(`/invoice-pdf/${id}/download`, { responseType: 'blob' })
        .then((res) => {
          const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
          const link = document.createElement('a');
          link.href = url;
          link.download = `facture-${id}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useEmailInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient
        .post<EmailResponse>(`/invoice-pdf/${id}/email`)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
