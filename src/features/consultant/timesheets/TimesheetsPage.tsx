import { useState, createElement } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useConsultantTimesheets } from '../../../hooks/consultant/useConsultantDashboard';
import { DataTable, type Column } from '../../../components/common/DataTable';
import { formatDate } from '../../../lib/utils';
import type { Timesheet } from '../../../types/models';

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
  VALIDE: 'bg-[#f59e0b]/10 text-[#f59e0b]',
  REJETE: 'bg-[#ef4444]/10 text-[#ef4444]',
  FACTURE: 'bg-[#f59e0b]/10 text-[#f59e0b]',
  PAYE: 'bg-[#10b981]/10 text-[#10b981]',
};

const statusLabels: Record<string, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS: 'En attente',
  VALIDE: 'En attente',
  REJETE: 'Rejeté',
  FACTURE: 'En attente',
  PAYE: 'Payé',
};

const columns: Column<Timesheet>[] = [
  { key: '#', label: '#', render: (_item, idx) => String(idx + 1) },
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
        className="inline-flex items-center gap-1 rounded-[8px] border border-[#bdbdbd] bg-[#ffffff] px-2.5 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
      >
        <Eye size={14} className="md:hidden" />
        <span className="hidden md:inline">Détails</span>
      </Link>
    ),
  },
];

const statusOptions: { value: string; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'REJETE', label: 'Rejeté' },
  { value: 'PAYE', label: 'Payé' },
];

export default function TimesheetsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: timesheets, isLoading, isError } = useConsultantTimesheets(statusFilter || undefined);

  const filtered = timesheets ?? [];

  return (
    <div className="overflow-hidden">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-[#111111] mb-2">
          Tous les relevés mensuels
        </h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
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
