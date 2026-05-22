import { useState, useCallback, useMemo, useRef } from 'react';
import { formatDate } from '../../../lib/utils';
import { DataTable } from '../../../components/common/DataTable';
import { useGlobalTracking, exportTrackingCSV } from '../../../hooks/manager/useAdvancedTracking';
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

const currentYear = new Date().getFullYear();

const periodeOptions = [
  { value: '', label: 'Toute période' },
  { value: 'Q1', label: `Q1 ${currentYear}` },
  { value: 'Q2', label: `Q2 ${currentYear}` },
  { value: 'Q3', label: `Q3 ${currentYear}` },
  { value: 'Q4', label: `Q4 ${currentYear}` },
  { value: '3M', label: '3 derniers mois' },
  { value: 'CUSTOM', label: 'Personnalisée' },
];

function computeDateRange(
  periode: string,
  customStart: string,
  customEnd: string,
): { startDate?: string; endDate?: string } {
  const year = currentYear;
  switch (periode) {
    case 'Q1':
      return {
        startDate: `${year}-01-01T00:00:00.000Z`,
        endDate: `${year}-03-31T23:59:59.000Z`,
      };
    case 'Q2':
      return {
        startDate: `${year}-04-01T00:00:00.000Z`,
        endDate: `${year}-06-30T23:59:59.000Z`,
      };
    case 'Q3':
      return {
        startDate: `${year}-07-01T00:00:00.000Z`,
        endDate: `${year}-09-30T23:59:59.000Z`,
      };
    case 'Q4':
      return {
        startDate: `${year}-10-01T00:00:00.000Z`,
        endDate: `${year}-12-31T23:59:59.000Z`,
      };
    case '3M': {
      const now = new Date();
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return {
        startDate: threeMonthsAgo.toISOString(),
        endDate: now.toISOString(),
      };
    }
    case 'CUSTOM':
      if (customStart && customEnd) {
        const [sd, sm, sy] = customStart.split('/');
        const [ed, em, ey] = customEnd.split('/');
        return {
          startDate: `${sy}-${sm}-${sd}T00:00:00.000Z`,
          endDate: `${ey}-${em}-${ed}T23:59:59.000Z`,
        };
      }
      return {};
    default:
      return {};
  }
}

export default function GlobalTrackingPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [periodeFilter, setPeriodeFilter] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const [exporting, setExporting] = useState(false);

  const dateRange = useMemo(
    () => computeDateRange(periodeFilter, customStart, customEnd),
    [periodeFilter, customStart, customEnd],
  );

  const allClientsRef = useRef<Set<string>>(new Set());

  const { data, isLoading } = useGlobalTracking(page, limit, {
    status: statusFilter || undefined,
    client: clientFilter || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    sort,
  });

  if (data?.data) {
    data.data.forEach((r) => allClientsRef.current.add(r.client));
  }

  const clientOptions = Array.from(allClientsRef.current).sort((a, b) => a.localeCompare(b, 'fr'));

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((s: number) => { setLimit(s); setPage(1); }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportTrackingCSV({
        status: statusFilter || undefined,
        client: clientFilter || undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        sort,
      });
      toast.success('Export CSV démarré');
    } catch {
      toast.error("Erreur lors de l'export CSV");
    } finally {
      setExporting(false);
    }
  };

  const consultantStatusLabels: Record<string, string> = {
    PAYE: 'Payé',
  };

  const clientStatusLabels: Record<string, string> = {
    PENDING: 'En attente',
    PARTIAL_PAID: 'Partiellement payé',
    PAID: 'Payé',
    CANCELED: 'Annulé',
  };

  const clientStatusBadge: Record<string, string> = {
    PENDING: 'bg-[#fef3c7] text-[#f59e0b]',
    PARTIAL_PAID: 'bg-[#ffedd5] text-[#f97316]',
    PAID: 'bg-[#d1fae5] text-[#10b981]',
    CANCELED: 'bg-[#e5e7eb] text-[#6b7280]',
  };

  const columns: Column<TrackingRow>[] = [
    { key: 'month', label: 'Mois', render: (r) => r.timesheet?.month ?? '—' },
    { key: 'ref', label: 'Référence', render: (r) => r.ref ?? '—' },
    { key: 'client', label: 'Client', render: (r) => r.client ?? '—' },
    { key: 'consultant', label: 'Consultant', render: (r) => r.consultant ?? '—' },
    { key: 'mission', label: 'Mission', render: (r) => r.timesheet?.mission ?? '—' },
    { key: 'days', label: 'Jours', render: (r) => String(r.days ?? '—') },
    { key: 'dailyRate', label: 'TJM', render: (r) => `${(r.dailyRate ?? 0).toLocaleString()} DH` },
    { key: 'invoiceRef', label: 'Facture', render: (r) => r.invoiceRef ?? '—' },
    { key: 'amount', label: 'Montant HT', render: (r) => `${(r.amount ?? 0).toLocaleString()} DH` },
    { key: 'vat', label: 'TVA', render: (r) => `${(r.vat ?? 0).toLocaleString()} DH` },
    { key: 'total', label: 'Total TTC', render: (r) => `${(r.total ?? 0).toLocaleString()} DH` },
    {
      key: 'consultantStatus',
      label: 'Statut Consultant',
      render: (r) => (
        <span className="text-xs">{consultantStatusLabels[r.consultantStatus] ?? 'Pas encore'}</span>
      ),
    },
    {
      key: 'clientStatus',
      label: 'Statut Client',
      render: (r) => (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${clientStatusBadge[r.clientStatus] || 'bg-[#e5e7eb] text-[#6b7280]'}`}>
          {clientStatusLabels[r.clientStatus] ?? r.clientStatus}
        </span>
      ),
    },
    { key: 'totalPaid', label: 'Versé', render: (r) => `${(r.totalPaid ?? 0).toLocaleString()} DH` },
    { key: 'cabinet_margin', label: 'Marge cabinet', render: (r) => `${(r.cabinet_margin ?? 0).toLocaleString()} DH` },
    { key: 'issueDate', label: 'Date émission', render: (r) => formatDate(r.issueDate) },
    { key: 'dueDate', label: 'Date échéance', render: (r) => formatDate(r.dueDate) },
    { key: 'paymentDate', label: 'Date paiement', render: (r) => formatDate(r.paymentDate) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111111]">Suivi global</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="cursor-pointer rounded-[8px] bg-[#003ea8] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {exporting ? 'Exportation...' : 'Exporter CSV'}
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
            value={clientFilter}
            onChange={(e) => { setClientFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] min-w-[180px]"
          >
            <option value="">Tous les clients</option>
            {clientOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b7280]">Période</label>
          <select
            value={periodeFilter}
            onChange={(e) => { setPeriodeFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            {periodeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {periodeFilter === 'CUSTOM' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6b7280]">De (jj/mm/aaaa)</label>
              <input
                type="text"
                placeholder="jj/mm/aaaa"
                value={customStart}
                onChange={(e) => { setCustomStart(e.target.value); setPage(1); }}
                className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] w-[150px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6b7280]">À (jj/mm/aaaa)</label>
              <input
                type="text"
                placeholder="jj/mm/aaaa"
                value={customEnd}
                onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }}
                className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] w-[150px]"
              />
            </div>
          </>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b7280]">Tri</label>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as 'asc' | 'desc'); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="desc">↓ Mois (récent)</option>
            <option value="asc">↑ Mois (ancien)</option>
          </select>
        </div>
      </div>

      <div className="[&_table]:text-xs [&_th]:!text-xs [&_td]:!text-xs">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          pagination={data?.pagination ?? { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: limit }}
          isLoading={isLoading}
          isEmpty={!isLoading && (data?.data?.length ?? 0) === 0}
          emptyMessage="Aucune donnée"
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
}
