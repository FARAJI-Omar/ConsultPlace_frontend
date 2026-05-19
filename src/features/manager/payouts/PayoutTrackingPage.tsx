import { useState } from 'react';
import { usePayoutsHistory, useTriggerPayout } from '../../../hooks/manager/usePayouts';
import { useInvoices } from '../../../hooks/manager/useInvoices';
import { Skeleton, SkeletonCard, SkeletonTable } from '../../../components/ui/skeleton';
import { toast } from 'sonner';

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
  const paidInvoicesQuery = useInvoices(1, 1000, 'PAID');
  const payoutMutation = useTriggerPayout();
  const [payoutModal, setPayoutModal] = useState<{ id: number; ref: string } | null>(null);
  const [payoutPercentage, setPayoutPercentage] = useState('80');

  const unpaidConsultants = (paidInvoicesQuery.data?.data ?? []).filter(
    (inv) => inv.timesheet?.status !== 'PAYE',
  );

  const handlePayout = () => {
    if (!payoutModal) return;
    payoutMutation.mutate(
      { invoiceId: payoutModal.id, payoutPercentage: parseFloat(payoutPercentage) || 80 },
      {
        onSuccess: () => {
          toast.success(`Paiement déclenché pour ${payoutModal.ref}`);
          setPayoutModal(null);
          setPayoutPercentage('80');
        },
        onError: () => toast.error("Erreur lors du paiement"),
      },
    );
  };

  if (isLoading || paidInvoicesQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <Skeleton className="mb-4 h-6 w-48" />
          <SkeletonTable rows={4} cols={5} />
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

      {unpaidConsultants.length > 0 && (
        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Consultants non payés</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Facture</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Mois</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Consultant</th>
                  {/* <th className="px-3 py-2 text-l moeft text-xs font-medium text-[#6b7280]">Mission</th> */}
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {unpaidConsultants.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#e5e7eb]">
                    <td className="px-3 py-2 font-medium text-[#111111]">{inv.ref}</td>
                    <td className="px-3 py-2 text-[#6b7280]">{inv.timesheet?.month ?? '-'}</td>
                    <td className="px-3 py-2 text-[#111111]">{inv.consultant?.name ?? '-'}</td>
                    {/* <td className="px-3 py-2 text-[#6b7280]">{inv.timesheet?.mission?.title ?? '-'}</td> */}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setPayoutModal({ id: inv.id, ref: inv.ref })}
                        disabled={payoutMutation.isPending}
                        className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-3 py-1.5 text-xs font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        Payer consultant
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {payoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setPayoutModal(null)}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Payer le consultant</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Facture {payoutModal.ref}</p>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">Pourcentage consultant (%)</label>
              <input
                type="number"
                value={payoutPercentage}
                onChange={(e) => setPayoutPercentage(e.target.value)}
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setPayoutModal(null)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handlePayout} disabled={payoutMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {payoutMutation.isPending ? 'Traitement...' : 'Confirmer le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
