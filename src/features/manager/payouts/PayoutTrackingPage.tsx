import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePayoutsHistory, useTriggerPayout, useExportPayoutsPdf } from '../../../hooks/manager/usePayouts';
import { useInvoices } from '../../../hooks/manager/useInvoices';
import { Skeleton, SkeletonCard, SkeletonTable } from '../../../components/ui/skeleton';
import { toast } from 'sonner';
import { formatDate } from '../../../lib/utils';
import LoadingOverlay from '../../../components/common/LoadingOverlay';

export default function PayoutTrackingPage() {
  const { data, isLoading } = usePayoutsHistory();
  const paidInvoicesQuery = useInvoices(1, 1000, 'PAID');
  const payoutMutation = useTriggerPayout();
  const [payoutModal, setPayoutModal] = useState<{
    id: number;
    ref: string;
    consultantPayoutRest: number;
    consultant?: { id: number; name: string };
    consultants?: { id: number; name: string; email: string }[];
    consultantPayouts?: { consultantId: number; payoutAmount: number }[];
    consultantsPayouts?: { consultantId: number; payoutAmount: number; paid: number; rest: number; status: string }[];
  } | null>(null);
  const [payoutMode, setPayoutMode] = useState<'DH' | '%'>('DH');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutComment, setPayoutComment] = useState('');
  const [payoutConsultantId, setPayoutConsultantId] = useState<number | ''>('');
  const [selectedHistoriqueId, setSelectedHistoriqueId] = useState<number | null>(null);
  const [selectedUnpaidId, setSelectedUnpaidId] = useState<number | null>(null);
  const [exportModal, setExportModal] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(5, 7));
  const exportPdfMutation = useExportPayoutsPdf();

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const currentMonth = new Date().toISOString().slice(5, 7);

  const unpaidConsultants = (paidInvoicesQuery.data?.data ?? []).filter(
    (inv) => (inv.consultantPayoutRest ?? 0) > 0 && inv.timesheet?.status !== 'PAYE',
  );

  const payoutRest = payoutModal?.consultantPayoutRest ?? 0;
  const payoutBase = payoutModal?.consultantsPayouts && payoutConsultantId
    ? (payoutModal.consultantsPayouts.find((cp) => cp.consultantId === payoutConsultantId)?.rest ?? payoutRest)
    : payoutModal?.consultantPayouts && payoutConsultantId
      ? (payoutModal.consultantPayouts.find((cp) => cp.consultantId === payoutConsultantId)?.payoutAmount ?? payoutRest)
      : payoutRest;

  const handlePayout = () => {
    if (!payoutModal) return;
    const parsed = parseFloat(payoutAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }
    if (parsed > payoutBase) {
      toast.error('Le montant ne peut pas dépasser le reste à payer');
      return;
    }
    const dhAmount = payoutMode === '%'
      ? Math.round(payoutBase * parsed / 100 * 100) / 100
      : parsed;
    payoutMutation.mutate(
      {
        invoiceId: payoutModal.id,
        consultantId: Number(payoutConsultantId) || undefined,
        amount: dhAmount,
        comment: payoutComment || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Paiement déclenché pour ${payoutModal.ref}`);
          setPayoutModal(null);
          setPayoutConsultantId('');
        },
        onError: (err) => {
          const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
          toast.error(axiosErr.response?.data?.error?.message ?? "Erreur lors du paiement");
        },
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
    <LoadingOverlay isLoading={payoutMutation.isPending || exportPdfMutation.isPending}>
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#111111]">Paiements consultants</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[12px] bg-[#ffffff] border border-[#e5e7eb] p-6">
          <p className="text-sm text-[#6b7280]">Total à payer</p>
          <p className="mt-1 text-2xl font-semibold text-[#111111]">{(totals?.total_to_be_payed ?? 0).toLocaleString()} DH</p>
        </div>
        <div className="rounded-[12px] bg-[#ffffff] border border-[#e5e7eb] p-6">
          <p className="text-sm text-[#6b7280]">Total payé</p>
          <p className="mt-1 text-2xl font-semibold text-[#111111]">{(totals?.total_payed ?? 0).toLocaleString()} DH</p>
        </div>
      </div>

      {unpaidConsultants.length > 0 && (
        <div className="rounded-[12px] bg-[#ffffff] border border-[#e5e7eb] p-6">
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
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedUnpaidId(selectedUnpaidId === inv.id ? null : inv.id)}
                    className={`border-b border-[#e5e7eb] cursor-pointer transition-colors ${selectedUnpaidId === inv.id ? 'bg-yellow-100/50' : 'hover:bg-yellow-50'}`}
                  >
                    <td className="px-3 py-2 font-medium">
                      <Link to={`/manager/invoices/${inv.id}`} className="text-[#3b82f6] hover:underline">{inv.ref}</Link>
                    </td>
                    <td className="px-3 py-2 text-[#6b7280]">{inv.timesheet?.month ?? '-'}</td>
                    <td className="px-3 py-2 text-[#111111]">{inv.consultants?.map((c) => c.name).join(', ') ?? inv.consultant?.name ?? '-'}</td>
                    {/* <td className="px-3 py-2 text-[#6b7280]">{inv.timesheet?.mission?.title ?? '-'}</td> */}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => {
                          setPayoutModal({ id: inv.id, ref: inv.ref, consultantPayoutRest: inv.consultantPayoutRest ?? 0, consultant: inv.consultants?.[0], consultants: inv.consultants, consultantPayouts: inv.consultantPayouts, consultantsPayouts: inv.consultantsPayouts });
                          setPayoutMode('DH');
                          setPayoutAmount(String(inv.consultantPayoutRest ?? 0));
                          setPayoutComment('');
                        }}
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

      <div className="rounded-[12px] bg-[#ffffff] border border-[#e5e7eb] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#111111]">Historique</h2>
          <button
            onClick={() => setExportModal(true)}
            className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-xs font-medium text-white transition-colors bg-red-400 hover:bg-red-500"
          >
            Exporter PDF
          </button>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-[#6b7280]">Aucun paiement effectué</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Facture</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Montant Versé</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Consultant</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedHistoriqueId(selectedHistoriqueId === entry.id ? null : entry.id)}
                    className={`border-b border-[#e5e7eb] cursor-pointer transition-colors ${selectedHistoriqueId === entry.id ? 'bg-yellow-100/50' : 'hover:bg-yellow-50'}`}
                  >
                    <td className="px-3 py-2 font-medium">
                      <Link to={`/manager/invoices/${entry.invoiceId}`} className="text-[#3b82f6] hover:underline">{entry.invoiceRef}</Link>
                    </td>
                    <td className="px-3 py-2 text-[#111111]">{entry.amount.toLocaleString()} DH</td>
                    <td className="px-3 py-2 text-[#6b7280]">{formatDate(entry.date)}</td>
                    <td className="px-3 py-2"><span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#f5f3ff] text-[#7c3aed]">{entry.consultant}</span></td>
                    <td className="px-3 py-2 text-xs text-[#6b7280] max-w-[160px] truncate">{entry.comment ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {exportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Exporter PDF</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111111] mb-1">Mois</label>
              <select
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value)}
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}{m === currentMonth ? ' (Mois en cours)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setExportModal(false)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button
                onClick={() => {
                  exportPdfMutation.mutate(exportMonth, {
                    onSuccess: () => {
                      toast.success('PDF exporté avec succès');
                      setExportModal(false);
                    },
                    onError: () => toast.error("Erreur lors de l'export PDF"),
                  });
                }}
                disabled={exportPdfMutation.isPending}
                className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {exportPdfMutation.isPending ? 'Export...' : 'Exporter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {payoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Payer le consultant</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Facture {payoutModal.ref}</p>

            <p className="mb-3 text-sm text-[#6b7280]">
              Reste à payer : <span className="font-bold bg-green-500/20 px-4 py-1 rounded text-[#111111]">{(payoutModal.consultantPayoutRest ?? 0).toLocaleString()} DH</span>
            </p>

            {(payoutModal.consultantsPayouts && payoutModal.consultantsPayouts.length > 0 || payoutModal.consultantPayouts && payoutModal.consultantPayouts.length > 0) && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#111111] mb-1">Consultant</label>
                <select
                  value={payoutConsultantId}
                  onChange={(e) => setPayoutConsultantId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                >
                  <option value="">Sélectionner un consultant</option>
                  {payoutModal.consultantsPayouts && payoutModal.consultantsPayouts.length > 0
                    ? payoutModal.consultantsPayouts.filter((cp) => cp.rest > 0).map((cp) => {
                        const consultant = payoutModal.consultants?.find((c) => c.id === cp.consultantId);
                        const name = consultant?.name ?? `Consultant #${cp.consultantId}`;
                        return (
                          <option key={cp.consultantId} value={cp.consultantId}>
                            {name} — reste {cp.rest.toLocaleString()} DH
                          </option>
                        );
                      })
                    : (payoutModal.consultantPayouts ?? []).map((cp) => {
                        const consultant = payoutModal.consultants?.find((c) => c.id === cp.consultantId);
                        const name = consultant?.name ?? `Consultant #${cp.consultantId}`;
                        return (
                          <option key={cp.consultantId} value={cp.consultantId}>
                            {name} — {cp.payoutAmount.toLocaleString()} DH
                          </option>
                        );
                      })
                  }
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111111] mb-1">
                {payoutMode === 'DH' ? 'Montant (DH)' : 'Pourcentage (%)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  autoComplete="off"
                  className="flex-1 rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  min={0}
                  step="any"
                />
                <div className="flex rounded-[8px] border border-[#e5e7eb] overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => { setPayoutMode('DH'); setPayoutAmount(String(payoutBase)); }}
                    className={`cursor-pointer px-3 py-2 text-xs font-semibold transition-colors ${payoutMode === 'DH' ? 'bg-[#111111] text-[#ffffff]' : 'bg-[#ffffff] text-[#6b7280] hover:bg-[#f3f4f6]'}`}
                  >
                    DH
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPayoutMode('%'); setPayoutAmount('100'); }}
                    className={`cursor-pointer px-3 py-2 text-xs font-semibold transition-colors ${payoutMode === '%' ? 'bg-[#111111] text-[#ffffff]' : 'bg-[#ffffff] text-[#6b7280] hover:bg-[#f3f4f6]'}`}
                  >
                    %
                  </button>
                </div>
              </div>
              {payoutMode === '%' && payoutAmount && !isNaN(parseFloat(payoutAmount)) && (
                <p className="mt-1 text-xs text-[#6b7280]">
                  Montant calculé : {Math.round(payoutBase * parseFloat(payoutAmount) / 100 * 100) / 100} DH
                </p>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-[#111111] mb-1">Commentaire (optionnel)</label>
              <textarea
                value={payoutComment}
                onChange={(e) => setPayoutComment(e.target.value)}
                rows={2}
                placeholder="Ajouter un commentaire..."
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setPayoutModal(null); setPayoutConsultantId(''); }} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button
                onClick={handlePayout}
                disabled={payoutMutation.isPending || !payoutAmount || parseFloat(payoutAmount) <= 0 || parseFloat(payoutAmount) > (payoutMode === 'DH' ? payoutBase : 100)}
                className="cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {payoutMutation.isPending ? 'Traitement...' : 'Confirmer le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </LoadingOverlay>
  );
}
