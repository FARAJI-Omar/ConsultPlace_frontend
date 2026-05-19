import { useState, useCallback } from 'react';
import { DataTable } from '../../../components/common/DataTable';
import { useGlobalTracking, exportTrackingCSV } from '../../../hooks/manager/useAdvancedTracking';
import { useGetClients } from '../../../hooks/useClients';
import { toast } from 'sonner';
import type { Column } from '../../../components/common/DataTable';
import type { TrackingRow } from '../../../types/manager';

const statusOptions = [
  { value: '', label: 'Tous' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'PARTIAL_PAID', label: 'Partiellement payé' },
  { value: 'PAID', label: 'Payé' },
  { value: 'CANCELED', label: 'Annulé' },
];

const statusBadge: Record<string, string> = {
  PENDING: 'bg-[#fef3c7] text-[#f59e0b]',
  PARTIAL_PAID: 'bg-[#ffedd5] text-[#f97316]',
  PAID: 'bg-[#d1fae5] text-[#10b981]',
  CANCELED: 'bg-[#e5e7eb] text-[#6b7280]',
};

const statusLabels: Record<string, string> = {
  PENDING: 'En attente',
  PARTIAL_PAID: 'Partiellement payé',
  PAID: 'Payé',
  CANCELED: 'Annulé',
};

export default function GlobalTrackingPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [clientIdFilter, setClientIdFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useGlobalTracking(page, limit, {
    status: statusFilter || undefined,
    clientId: clientIdFilter ? Number(clientIdFilter) : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const clientsQuery = useGetClients();

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((s: number) => { setLimit(s); setPage(1); }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportTrackingCSV({
        status: statusFilter || undefined,
        clientId: clientIdFilter ? Number(clientIdFilter) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      toast.success('Export CSV démarré');
    } catch {
      toast.error("Erreur lors de l'export CSV");
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<TrackingRow>[] = [
    { key: 'ref', label: 'Réf' },
    { key: 'client', label: 'Client' },
    { key: 'consultant', label: 'Consultant' },
    { key: 'amount', label: 'Montant HT', render: (r) => `${(r.amount ?? 0).toLocaleString()} DH` },
    { key: 'vat', label: 'TVA', render: (r) => `${(r.vat ?? 0).toLocaleString()} DH` },
    { key: 'total', label: 'Total TTC', render: (r) => `${(r.total ?? 0).toLocaleString()} DH` },
    {
      key: 'status',
      label: 'Statut',
      render: (r) => (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[r.status] || 'bg-[#e5e7eb] text-[#6b7280]'}`}>
          {statusLabels[r.status] || r.status}
        </span>
      ),
    },
    { key: 'issueDate', label: 'Date émission' },
    { key: 'dueDate', label: 'Date échéance' },
    { key: 'paymentDate', label: 'Date paiement', render: (r) => r.paymentDate ?? '—' },
    { key: 'totalPaid', label: 'Total payé', render: (r) => `${(r.totalPaid ?? 0).toLocaleString()} DH` },
    { key: 'cabinet_margin', label: 'Marge cabinet', render: (r) => `${(r.cabinet_margin ?? 0).toLocaleString()} DH` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111111]">Tracking global</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {exporting ? 'Export...' : 'Exporter CSV'}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b7280]">Statut</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b7280]">Client</label>
          <select
            value={clientIdFilter}
            onChange={(e) => { setClientIdFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] min-w-[180px]"
          >
            <option value="">Tous les clients</option>
            {(clientsQuery.data?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.raison_sociale}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b7280]">Date début</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b7280]">Date fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        pagination={data?.pagination ?? { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: limit }}
        isLoading={isLoading}
        isEmpty={!isLoading && (data?.data?.length ?? 0) === 0}
        emptyMessage="Aucune donnée de tracking"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
