import { useConsultantTimesheets } from '../../../hooks/consultant/useConsultantDashboard';
import { DataTable, type Column } from '../../../components/common/DataTable';
import type { Timesheet } from '../../../types/models';
import { createElement } from 'react';

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function formatMonth(month: string) {
  const [year, m] = month.split('-');
  return `${monthNames[parseInt(m, 10) - 1]} ${year}`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
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
];

export default function TimesheetsPage() {
  const { data: timesheets, isLoading, isError } = useConsultantTimesheets();

  return (
    <div className="rounded-[12px] bg-[#f5f5f5] p-8">
      <h1 className="text-[22px] font-semibold text-[#111111] mb-6">
        Tous les relevés mensuels
      </h1>

      {isError ? (
        <p className="text-sm text-[#ef4444]">
          Erreur lors du chargement des relevés.
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={timesheets ?? []}
          pagination={{ totalItems: timesheets?.length ?? 0, totalPages: 1, currentPage: 1, itemsPerPage: timesheets?.length ?? 0 }}
          isLoading={isLoading}
          isEmpty={!timesheets || timesheets.length === 0}
          emptyMessage="Aucun relevé mensuel trouvé."
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
        />
      )}
    </div>
  );
}
