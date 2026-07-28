import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '../../../components/common/DataTable';
import { useConsultantTracking, type TrackingEntry } from '../../../hooks/consultant/useConsultantTracking';

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export default function PaymentsHistoryPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useConsultantTracking();

  const rows = data ?? [];

  const totalMissions = new Set(rows.map((r) => r.missionId)).size;
  const totalGains = rows.reduce((sum, r) => sum + (r.paymentAmount ?? 0), 0);

  const columns: Column<TrackingEntry>[] = [
    { key: '#', label: '#', render: (_item, idx) => String(idx + 1) },
    {
      key: 'date',
      label: 'Date de Paiement',
      render: (item) => formatDate(item.date),
    },
    {
      key: 'missionTitle',
      label: 'Mission',
      render: (item) => (
        <button
          onClick={() => navigate(`/consultant/missions/${item.missionId}`)}
          className="cursor-pointer text-[#3b82f6] hover:underline text-left"
        >
          {item.missionTitle}
        </button>
      ),
    },
    {
      key: 'releve',
      label: 'Relevé associé',
      render: (item) =>
        item.timesheetId ? (
          <button
            onClick={() => navigate(`/consultant/timesheets/${item.timesheetId}`)}
            className="cursor-pointer text-[#3b82f6] hover:underline text-left"
          >
            {item.missionTitle}—{item.timesheetMonth}
          </button>
        ) : (
          <span className="text-[#9ca3af]">—</span>
        ),
    },
    {
      key: 'paymentAmount',
      label: 'Virement',
      render: (item) => `${(item.paymentAmount ?? 0).toLocaleString()} DH`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <h1 className="text-2xl font-semibold text-[#111111]">Historique des paiements</h1>
        <div className="flex justify-center gap-4">
          <div className="rounded-[12px] border border-[#e5e7eb] bg-[#0ace2e2e] px-4 py-2 md:px-6 md:py-3">
            <p className="text-xs text-[#6b7280]">Total missions</p>
            <p className="text-sm md:text-xl font-semibold text-[#111111]">{totalMissions}</p>
          </div>
          <div className="rounded-[12px] border border-[#e5e7eb] bg-[#0ace2e2e] px-4 py-2 md:px-6 md:py-3">
            <p className="text-xs text-[#6b7280]">Gains totaux {new Date().getFullYear()}</p>
            <p className="text-sm md:text-xl font-semibold text-[#111111]">{totalGains.toLocaleString()} DH</p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        pagination={{
          totalItems: rows.length,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: rows.length,
        }}
        isLoading={isLoading}
        isEmpty={rows.length === 0 && !isLoading}
        emptyMessage="Aucun paiement trouvé"
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />
    </div>
  );
}
