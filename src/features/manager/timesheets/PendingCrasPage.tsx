import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../../components/common/DataTable';
import { useManagerTimesheets } from '../../../hooks/manager/useManagerTimesheets';
import { formatDate } from '../../../lib/utils';
import ReviewCraModal from './ReviewCraModal';
import GenerateInvoiceModal from './GenerateInvoiceModal';
import type { Column } from '../../../components/common/DataTable';
import type { ManagerTimesheet } from '../../../types/manager';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'SOUMIS', label: 'Soumis' },
  { value: 'VALIDE', label: 'Validé' },
  { value: 'REJETE', label: 'Rejeté' },
  { value: 'FACTURE', label: 'Facturé' },
  { value: 'PAYE', label: 'Payé' },
];

const statusBadge: Record<string, string> = {
  BROUILLON: 'bg-[#e5e7eb] text-[#6b7280]',
  SOUMIS: 'bg-[#fef3c7] text-[#f59e0b]',
  VALIDE: 'bg-[#d1fae5] text-[#10b981]',
  REJETE: 'bg-[#fee2e2] text-[#ef4444]',
  FACTURE: 'bg-[#ffedd5] text-[#f97316]',
  PAYE: 'bg-[#d1fae5] text-[#10b981]',
};

function formatMonth(month: string) {
  const [y, m] = month.split('-');
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function PendingCrasPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<number | null>(null);
  const [invoiceTimesheet, setInvoiceTimesheet] = useState<ManagerTimesheet | null>(null);
  const [showHint, setShowHint] = useState(true);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (hintRef.current && !hintRef.current.contains(e.target as Node)) {
        setShowHint(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const { data, isLoading } = useManagerTimesheets(page, limit, statusFilter || undefined);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, []);

  const handlePageSizeChange = useCallback((s: number) => {
    setLimit(s);
    setPage(1);
  }, []);

  const filteredData = (data?.data ?? []).filter((ts) => ts.status !== 'BROUILLON');

  const columns: Column<ManagerTimesheet>[] = [
    { key: 'month', label: 'Mois', render: (ts) => formatMonth(ts.month) },
    { key: 'missionTitle', label: 'Mission', render: (ts) => ts.mission.title },
    { key: 'consultantName', label: 'Consultant', render: (ts) => (
      <span className="inline-block rounded-[6px] bg-[#EFF6FF] px-2.5 py-1 text-sm font-medium text-[#111111]">{ts.consultant.name}</span>
    ) },
    {
      key: 'status',
      label: 'Statut',
      render: (ts) => (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[ts.status] || 'bg-[#e5e7eb] text-[#6b7280]'}`}>
          {STATUS_OPTIONS.find((o) => o.value === ts.status)?.label || ts.status}
        </span>
      ),
    },
    {
      key: 'submittedAt',
      label: 'Soumis le',
      render: (ts) => formatDate(ts.submittedAt),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (ts) => (
        <div className="flex gap-2">
          {ts.status === 'SOUMIS' && (
            <button
              onClick={() => setSelectedTimesheetId(ts.id)}
              className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-3 py-1.5 text-xs font-medium text-[#ffffff] transition-colors hover:bg-[#2563eb]"
            >
              Examiner
            </button>
          )}
          {ts.status === 'VALIDE' && (
            <button
              onClick={() => setInvoiceTimesheet(ts)}
              className="cursor-pointer rounded-[8px] bg-[#10b981] px-3 py-1.5 text-xs font-medium text-[#ffffff] transition-colors hover:bg-[#059669]"
            >
              + Générer facture
            </button>
          )}
          <Link
            to={`/manager/timesheets/${ts.id}`}
            className="inline-block rounded-[8px] border border-[#848383] bg-[#ffffff] px-3 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#bdbdbd]"
          >
            Voir détails
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 relative">
          <h1 className="text-2xl font-semibold text-[#111111]">Relevés des consultants</h1>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowHint((p) => !p); }}
            className="w-5 h-5 rounded-full border border-[#ff0000] text-[#ff0000] text-[10px] flex items-center justify-center hover:bg-[#f3f4f6] transition-colors flex-shrink-0 cursor-pointer"
          >
            !
          </button>
          {showHint && (
            <div ref={hintRef} className="absolute left-20 top-full mt-2 bg-white border border-[#ff0000] rounded-lg shadow-lg p-6 text-sm text-[#6b7280] z-10 max-w-xl">
              -Cliquez sur <strong>Examiner</strong> pour valider ou rejeter un relevé.<br />
              -Validez un relevé afin de générer une facture.
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <label className="text-sm font-medium text-[#111111]">Filtrer par statut:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        pagination={data?.pagination ?? { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: limit }}
        isLoading={isLoading}
        isEmpty={!isLoading && filteredData.length === 0}
        emptyMessage="Aucun Relevé trouvé"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {selectedTimesheetId !== null && (
        <ReviewCraModal
          timesheetId={selectedTimesheetId}
          open={selectedTimesheetId !== null}
          onClose={() => setSelectedTimesheetId(null)}
        />
      )}

      {invoiceTimesheet !== null && (
        <GenerateInvoiceModal
          validTimesheets={[invoiceTimesheet]}
          prefilledTimesheetId={invoiceTimesheet.id}
          open={invoiceTimesheet !== null}
          onClose={() => setInvoiceTimesheet(null)}
        />
      )}
    </div>
  );
}
