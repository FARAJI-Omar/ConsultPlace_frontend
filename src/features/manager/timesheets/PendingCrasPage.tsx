import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../../components/common/DataTable';
import { useManagerTimesheets } from '../../../hooks/manager/useManagerTimesheets';
import ReviewCraModal from './ReviewCraModal';
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
  const [statusFilter, setStatusFilter] = useState('SOUMIS');
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<number | null>(null);

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
    { key: 'consultantName', label: 'Consultant', render: (ts) => ts.consultant.name },
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
      render: (ts) => (ts.submittedAt ? new Date(ts.submittedAt).toLocaleDateString() : '-'),
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
          <Link
            to={`/manager/timesheets/${ts.id}`}
            className="inline-block rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
          >
            Voir détails
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111111]">Relevés des consultants</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#6b7280]">Statut:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
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
    </div>
  );
}
