import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  const [detailRow, setDetailRow] = useState<TrackingRow | null>(null);

  useEffect(() => {
    if (detailRow) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [detailRow]);

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

  const consultantStatusBadge: Record<string, string> = {
    PAYE: 'bg-[#d1fae5] text-[#10b981]',
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
    { key: 'client', label: 'Client', render: (r) => <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#eff6ff] text-[#3b82f6]">{r.client ?? '—'}</span> },
    { key: 'consultant', label: 'Consultant', render: (r) => <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#f5f3ff] text-[#7c3aed]">{r.consultant ?? '—'}</span> },
    { key: 'mission', label: 'Mission', render: (r) => r.timesheet?.mission ?? '—' },
    { key: 'days', label: 'Jours', render: (r) => String(r.days ?? '—') },
    { key: 'invoiceRef', label: 'Facture', render: (r) => r.invoiceRef ?? '—' },
    { key: 'total', label: 'TTC', render: (r) => `${(r.total ?? 0).toLocaleString()} DH` },
    {
      key: 'clientStatus',
      label: 'Statut Client',
      render: (r) => {
        const isLate = r.clientStatus !== 'PAID' && r.clientStatus !== 'CANCELED' && r.dueDate && new Date(r.dueDate) < new Date();
        if (isLate) {
          return <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#fef2f2] text-[#ef4444]">En retard</span>;
        }
        return (
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${clientStatusBadge[r.clientStatus] || 'bg-[#e5e7eb] text-[#6b7280]'}`}>
            {clientStatusLabels[r.clientStatus] ?? r.clientStatus}
          </span>
        );
      },
    },
    {
      key: 'consultantStatus',
      label: 'Statut Consultant',
      render: (r) => (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${consultantStatusBadge[r.consultantStatus] || 'bg-[#fef3c7] text-[#f59e0b]'}`}>
          {consultantStatusLabels[r.consultantStatus] ?? 'Pas encore'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDetailRow(r); }}
          className="cursor-pointer rounded-[8px] border border-[#bdbdbd] bg-[#ffffff] px-3 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          Détail
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111111]">Suivi global</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="cursor-pointer rounded-[8px] bg-red-400 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 hover:bg-red-500 disabled:hover:bg-red-400"
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
            className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
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
            className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] min-w-[180px]"
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
            className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
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
                autoComplete="off"
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
                autoComplete="off"
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
            className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="desc">↓ Mois (récent)</option>
            <option value="asc">↑ Mois (ancien)</option>
          </select>
        </div>
      </div>

      <div className="[&_table]:text-xs [&_th]:!text-xs [&_td]:!text-sm">
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

      {detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-[16px] bg-[#ffffff] shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-[#ffffff] border-b border-[#e5e7eb] px-6 py-5 flex items-center justify-between rounded-t-[16px]">
              <div>
                <h2 className="text-lg font-semibold text-[#111111]">{detailRow.consultant} <span className="text-[#6b7280]">·</span> {detailRow.timesheet?.month}</h2>
                <p className="text-sm text-[#6b7280] mt-0.5">{detailRow.client} <span className="text-[#d1d5db]">·</span> {detailRow.timesheet?.mission}</p>
              </div>
              <button
                onClick={() => setDetailRow(null)}
                className="cursor-pointer rounded-[6px] p-1.5 text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#111111]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-[12px] bg-[#f5f5f5] p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-3 text-center">Activité</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Jours</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{detailRow.days ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">TJM Contrat</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{(detailRow.contractDailyRate ?? 0).toLocaleString()} DH</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">TJM Consultant</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{(detailRow.missionDailyRate ?? 0).toLocaleString()} DH</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Validation client</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#10b981] font-semibold shrink-0">✓ Validé</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[12px] bg-[#f5f5f5] p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-3 text-center">Facturation</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Facture</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{detailRow.invoiceRef ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Date émission</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{formatDate(detailRow.issueDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">HT</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{(detailRow.amount ?? 0).toLocaleString()} DH</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">TVA</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{(detailRow.vat ?? 0).toLocaleString()} DH</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm border-t border-[#e5e7eb] pt-3">
                    <span className="text-[#111111] font-bold shrink-0">TTC</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-bold shrink-0">{(detailRow.total ?? 0).toLocaleString()} DH</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Date échéance</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{formatDate(detailRow.dueDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Statut Client</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    {(() => {
                      const isLate = detailRow.clientStatus !== 'PAID' && detailRow.clientStatus !== 'CANCELED' && detailRow.dueDate && new Date(detailRow.dueDate) < new Date();
                      if (isLate) {
                        return <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#fef2f2] text-[#ef4444] shrink-0">En retard</span>;
                      }
                      return (
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${clientStatusBadge[detailRow.clientStatus] || 'bg-[#e5e7eb] text-[#6b7280]'}`}>
                          {clientStatusLabels[detailRow.clientStatus] ?? detailRow.clientStatus}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Payée le</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{detailRow.paymentDate ? formatDate(detailRow.paymentDate) : '—'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[12px] bg-[#f5f5f5] p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-3 text-center">Paiement consultant</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Net</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{(detailRow.totalPaid ?? 0).toLocaleString()} DH</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Versé le</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{detailRow.consultantPaymentDate ? formatDate(detailRow.consultantPaymentDate) : '—'}</span>
                  </div>
                </div>
              </div>

              <div
                className="rounded-[12px] p-5"
                style={{
                  backgroundColor: (detailRow.cabinet_margin ?? 0) > 0 ? '#f0fdf4' : '#fef2f2',
                }}
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-3 text-center">Marge cabinet</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Encaissé HT</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{(detailRow.amount ?? 0).toLocaleString()} DH</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Versé conseil.</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">- {(detailRow.totalPaid ?? 0).toLocaleString()} DH</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm border-t border-[#e5e7eb] pt-3">
                    <span className="text-[#6b7280] shrink-0">Marge</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-bold shrink-0">{(detailRow.cabinet_margin ?? 0).toLocaleString()} DH</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}