import { useMemo } from 'react';
import { DataTable, type Column } from '../../../components/common/DataTable';
import { useConsultantTracking, type TrackingEntry } from '../../../hooks/consultant/useConsultantTracking';

interface PaymentRow {
  id: number;
  month: string;
  missionTitle: string;
  timesheetStatus: string;
  invoiceId: number;
  amount: number;
  invoiceStatus: 'PENDING' | 'PARTIAL_PAID' | 'PAID' | 'CANCELED';
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return `${months[parseInt(m, 10) - 1]} ${year}`;
}

function timesheetStatusLabel(status: string): string {
  const map: Record<string, string> = {
    BROUILLON: 'Brouillon',
    SOUMIS: 'Soumis',
    VALIDE: 'Validé',
    REJETE: 'Rejeté',
    FACTURE: 'Facturé',
    PAYE: 'Payé',
  };
  return map[status] ?? status;
}

function invoiceStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'En attente',
    PARTIAL_PAID: 'Partiellement payé',
    PAID: 'Payé',
    CANCELED: 'Annulé',
  };
  return map[status] ?? status;
}

function invoiceStatusColor(status: string): string {
  switch (status) {
    case 'PAID':
      return 'bg-green-100 text-green-700';
    case 'PARTIAL_PAID':
      return 'bg-yellow-100 text-yellow-700';
    case 'PENDING':
      return 'bg-gray-100 text-gray-500';
    case 'CANCELED':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}

const columns: Column<PaymentRow>[] = [
  {
    key: 'month',
    label: 'Mois',
    render: (item) => formatMonth(item.month),
  },
  {
    key: 'missionTitle',
    label: 'Mission',
  },
  {
    key: 'timesheetStatus',
    label: 'Statut du relevé',
    render: (item) => (
      <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
        {timesheetStatusLabel(item.timesheetStatus)}
      </span>
    ),
  },
  {
    key: 'invoiceId',
    label: 'N° Facture',
    render: (item) => `#${item.invoiceId}`,
  },
  {
    key: 'amount',
    label: 'Montant',
    render: (item) => `${item.amount.toLocaleString()} DH`,
  },
  {
    key: 'invoiceStatus',
    label: 'Statut du paiement',
    render: (item) => (
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${invoiceStatusColor(item.invoiceStatus)}`}>
        {invoiceStatusLabel(item.invoiceStatus)}
      </span>
    ),
  },
];

export default function PaymentsHistoryPage() {
  const { data, isLoading } = useConsultantTracking();

  const rows = useMemo<PaymentRow[]>(() => {
    if (!data) return [];
    return data.flatMap((entry: TrackingEntry) =>
      entry.invoices.map((inv) => ({
        id: inv.invoiceId,
        month: entry.month,
        missionTitle: entry.missionTitle,
        timesheetStatus: entry.timesheetStatus,
        invoiceId: inv.invoiceId,
        amount: inv.amount,
        invoiceStatus: inv.status,
      })),
    );
  }, [data]);

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
