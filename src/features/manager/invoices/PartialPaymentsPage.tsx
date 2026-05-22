import { useState, useCallback } from 'react';
import { DataTable } from '../../../components/common/DataTable';
import { useInvoices, useRegisterPayment, useMarkPaid } from '../../../hooks/manager/useInvoices';
import { toast } from 'sonner';
import type { Column } from '../../../components/common/DataTable';
import type { Invoice } from '../../../types/manager';

export default function PartialPaymentsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmPayAll, setConfirmPayAll] = useState<Invoice | null>(null);
  const [payAllDate, setPayAllDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useInvoices(page, limit);
  const registerPaymentMutation = useRegisterPayment();
  const markPaidMutation = useMarkPaid();

  const partialData = (data?.data ?? []).filter(
    (inv) => inv.status === 'PENDING' || inv.status === 'PARTIAL_PAID',
  );

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((s: number) => { setLimit(s); setPage(1); }, []);

  const calcRemaining = (inv: Invoice) => {
    if (inv.rest != null) return inv.rest;
    const paid = inv.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
    return (inv.total ?? 0) - paid;
  };

  const calcPaid = (inv: Invoice) => {
    if (inv.paid != null) return inv.paid;
    return inv.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
  };

  const handleRegisterPayment = () => {
    if (!paymentModal) return;
    const amount = parseInt(paymentAmount, 10);
    if (isNaN(amount) || amount <= 0) return;
    registerPaymentMutation.mutate(
      { id: paymentModal.id, payload: { amount, date: paymentDate } },
      {
        onSuccess: () => {
          toast.success('Paiement enregistré');
          setPaymentModal(null);
          setPaymentAmount('');
        },
        onError: () => toast.error("Erreur lors de l'enregistrement"),
      },
    );
  };

  const handlePayAll = (inv: Invoice) => {
    markPaidMutation.mutate(
      { invoiceId: inv.id, paymentDate: payAllDate },
      {
        onSuccess: () => {
          toast.success(`Facture ${inv.ref} marquée comme payée`);
          setConfirmPayAll(null);
        },
        onError: () => toast.error("Erreur lors du paiement"),
      },
    );
  };

  const columns: Column<Invoice>[] = [
    { key: 'ref', label: 'Réf', render: (inv) => inv.ref },
    { key: 'client', label: 'Client', render: (inv) => inv.client?.raison_sociale ?? '-' },
    { key: 'total', label: 'Total TTC', render: (inv) => `${(inv.total ?? 0).toLocaleString()} DH` },
    { key: 'paid', label: 'Payé', render: (inv) => `${calcPaid(inv).toLocaleString()} DH` },
    { key: 'remaining', label: 'Reste', render: (inv) => `${calcRemaining(inv).toLocaleString()} DH` },
    {
      key: 'actions',
      label: 'Actions',
      render: (inv) => (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setPaymentModal(inv)}
            className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-2.5 py-1.5 text-xs font-medium text-[#ffffff] transition-colors hover:bg-[#2563eb]"
          >
            Ajouter un paiement
          </button>
          <button
            onClick={() => setConfirmPayAll(inv)}
            disabled={markPaidMutation.isPending}
            className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-2.5 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:opacity-50"
          >
            Tout payer
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={partialData}
        pagination={data?.pagination ?? { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: limit }}
        isLoading={isLoading}
        isEmpty={!isLoading && partialData.length === 0}
        emptyMessage="Aucune facture en attente"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setPaymentModal(null)}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">
              Paiement — {paymentModal.ref}
            </h2>
            <p className="mb-4 text-sm text-[#6b7280]">
              Reste dû : <span className="font-medium text-[#111111]">{calcRemaining(paymentModal).toLocaleString()} DH</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">Montant</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                  placeholder="Ex: 5000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setPaymentModal(null)}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Annuler
              </button>
              <button
                onClick={handleRegisterPayment}
                disabled={registerPaymentMutation.isPending || !paymentAmount || parseInt(paymentAmount) <= 0}
                className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {registerPaymentMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPayAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => {
          setConfirmPayAll(null);
          setPayAllDate(new Date().toISOString().split('T')[0]);
        }}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Tout payer</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Marquer la facture {confirmPayAll.ref} comme intégralement payée&nbsp;?</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111111] mb-1">Date de paiement</label>
              <input
                type="date"
                value={payAllDate}
                onChange={(e) => setPayAllDate(e.target.value)}
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => {
                setConfirmPayAll(null);
                setPayAllDate(new Date().toISOString().split('T')[0]);
              }} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={() => handlePayAll(confirmPayAll)} disabled={markPaidMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {markPaidMutation.isPending ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
