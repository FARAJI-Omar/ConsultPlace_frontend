import { usePayoutsHistory } from '../../../hooks/manager/usePayouts';
import { Skeleton, SkeletonCard, SkeletonTable } from '../../../components/ui/skeleton';

const statusBadge: Record<string, string> = {
  COMPLETED: 'bg-[#d1fae5] text-[#10b981]',
  PENDING: 'bg-[#fef3c7] text-[#f59e0b]',
};

const statusLabels: Record<string, string> = {
  COMPLETED: 'Payé',
  PENDING: 'En attente',
};

export default function PayoutTrackingPage() {
  const { data, isLoading } = usePayoutsHistory();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <Skeleton className="mb-4 h-6 w-32" />
          <SkeletonTable rows={4} cols={4} />
        </div>
      </div>
    );
  }

  const payoutData = data?.data;
  const totals = payoutData?.totals;
  const history = payoutData?.history ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#111111]">Paiements consultants</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <p className="text-sm text-[#6b7280]">Total à payer</p>
          <p className="mt-1 text-2xl font-semibold text-[#111111]">{(totals?.total_to_be_payed ?? 0).toLocaleString()} DH</p>
        </div>
        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <p className="text-sm text-[#6b7280]">Total payé</p>
          <p className="mt-1 text-2xl font-semibold text-[#111111]">{(totals?.total_payed ?? 0).toLocaleString()} DH</p>
        </div>
      </div>

      <div className="rounded-[12px] bg-[#f5f5f5] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#111111]">Historique</h2>
        {history.length === 0 ? (
          <p className="text-sm text-[#6b7280]">Aucun paiement effectué</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Facture</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Montant</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Statut</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#e5e7eb]">
                    <td className="px-3 py-2 font-medium text-[#111111]">{entry.invoiceRef}</td>
                    <td className="px-3 py-2 text-[#111111]">{entry.amount.toLocaleString()} DH</td>
                    <td className="px-3 py-2 text-[#6b7280]">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[entry.status] || 'bg-[#e5e7eb] text-[#6b7280]'}`}>
                        {statusLabels[entry.status] || entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
