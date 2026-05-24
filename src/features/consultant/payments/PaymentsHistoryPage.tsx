import { DataTable, type Column } from '../../../components/common/DataTable';
import { useConsultantTracking, type TrackingEntry } from '../../../hooks/consultant/useConsultantTracking';

function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return `${months[parseInt(m, 10) - 1]} ${year}`;
}

const columns: Column<TrackingEntry>[] = [
  {
    key: 'month',
    label: 'Mois',
    render: (item) => formatMonth(item.month),
  },
  {
    key: 'paymentRef',
    label: 'Ref Paiement',
  },
  {
    key: 'missionTitle',
    label: 'Mission',
  },
  {
    key: 'paymentAmount',
    label: 'Versé',
    render: (item) => `${(item.paymentAmount ?? 0).toLocaleString()} DH`,
  },
  {
    key: 'invoices',
    label: 'Ref Facture',
    render: (item) =>
      item.invoices.map((inv) => inv.ref).join(', ') || '-',
  },
];

export default function PaymentsHistoryPage() {
  const { data, isLoading } = useConsultantTracking();

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#111111]">Historique des paiements</h1>

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
