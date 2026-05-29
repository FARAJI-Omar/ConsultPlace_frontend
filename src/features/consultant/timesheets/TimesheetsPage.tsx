import { useState, createElement } from 'react';
import { Link } from 'react-router-dom';
import { useConsultantTimesheets } from '../../../hooks/consultant/useConsultantDashboard';
import { DataTable, type Column } from '../../../components/common/DataTable';
import { formatDate } from '../../../lib/utils';
import type { Timesheet } from '../../../types/models';
import type { TimesheetStatus } from '../../../types/models';

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function formatMonth(month: string) {
  const [year, m] = month.split('-');
  return `${monthNames[parseInt(m, 10) - 1]} ${year}`;
}

const statusStyles: Record<string, string> = {
  BROUILLON: 'bg-[#6b7280]/10 text-[#6b7280]',
  SOUMIS: 'bg-[#f59e0b]/10 text-[#f59e0b]',
  VALIDE: 'bg-[#10b981]/10 text-[#10b981]',
  FACTURE: 'bg-[#fb923c]/10 text-[#fb923c]',
  PAYE: 'bg-[#10b981]/10 text-[#10b981]',
  REJETE: 'bg-[#ef4444]/10 text-[#ef4444]',
};

const statusLabels: Record<string, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS: 'Soumis',
  VALIDE: 'Validé',
  FACTURE: 'Facturé',
  PAYE: 'Payé',
  REJETE: 'Rejeté',
};

const columns: Column<Timesheet>[] = [
  { key: 'month', label: 'Mois', render: (t) => formatMonth(t.month) },
  { key: 'mission', label: 'Mission', render: (t) => t.mission?.title ?? '—' },
  { key: 'totalHours', label: 'Heures', render: (t) => `${t.totalHours}h` },
  {
    key: 'status',
    label: 'Statut',
    render: (t) =>
      createElement('span', {
        className: `inline-block rounded-[9999px] px-3 py-0.5 text-xs font-medium ${statusStyles[t.status] ?? 'bg-[#f5f5f5] text-[#6b7280]'}`,
        children: statusLabels[t.status] ?? t.status,
      }),
  },
  { key: 'submittedAt', label: 'Soumis le', render: (t) => formatDate(t.submittedAt) },
  {
    key: 'actions',
    label: 'Actions',
    render: (t) => (
      <Link
        to={`/consultant/timesheets/${t.id}`}
        className="inline-block rounded-[8px] border border-[#e5e7eb] px-2.5 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
      >
        Détails
      </Link>
    ),
  },
];

const statusOptions: { value: TimesheetStatus | ''; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'SOUMIS', label: 'Soumis' },
  { value: 'VALIDE', label: 'Validé' },
  { value: 'REJETE', label: 'Rejeté' },
  { value: 'FACTURE', label: 'Facturé' },
  { value: 'PAYE', label: 'Payé' },
];

export default function TimesheetsPage() {
  const { data: timesheets, isLoading, isError } = useConsultantTimesheets();
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | ''>('');

  const filtered = timesheets?.filter(
    (t) => !statusFilter || t.status === statusFilter,
  ) ?? [];

  return (
    <div className="rounded-[12px] bg-[#f5f5f5] p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-semibold text-[#111111]">
          Tous les relevés mensuels
        </h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TimesheetStatus | '')}
          className="h-10 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 text-sm text-[#111111] focus:border-[#111111] focus:outline-none"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isError ? (
        <p className="text-sm text-[#ef4444]">
          Erreur lors du chargement des relevés.
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          pagination={{ totalItems: filtered.length, totalPages: 1, currentPage: 1, itemsPerPage: filtered.length }}
          isLoading={isLoading}
          isEmpty={filtered.length === 0}
          emptyMessage="Aucun relevé mensuel trouvé."
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
        />
      )}
    </div>
  );
}
