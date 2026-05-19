import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../../components/common/DataTable';
import { useInvoices, useMarkPaid, useDownloadPdf, useGenerateInvoice, useCancelInvoice } from '../../../hooks/manager/useInvoices';
import { useTriggerPayout } from '../../../hooks/manager/usePayouts';
import { useSendReminder, useSetAutoReminder, useStopAutoReminder } from '../../../hooks/manager/useReminders';
import { useManagerTimesheets } from '../../../hooks/manager/useManagerTimesheets';
import { toast } from 'sonner';
import type { Column } from '../../../components/common/DataTable';
import type { Invoice } from '../../../types/manager';

const statusBadge: Record<string, string> = {
  PENDING: 'bg-[#fef3c7] text-[#f59e0b]',
  PARTIAL_PAID: 'bg-[#ffedd5] text-[#f97316]',
  PAID: 'bg-[#d1fae5] text-[#10b981]',
  CANCELED: 'bg-[#e5e7eb] text-[#6b7280]',
};

const statusLabels: Record<string, string> = {
  PENDING: 'En attente',
  PARTIAL_PAID: 'Partiellement payé',
  PAID: 'Payé',
  CANCELED: 'Annulé',
};

export default function AllInvoicesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [generateModal, setGenerateModal] = useState(false);
  const [generateTimesheetId, setGenerateTimesheetId] = useState('');
  const [vatRate, setVatRate] = useState('20');
  const [cancelConfirm, setCancelConfirm] = useState<number | null>(null);
  const [confirmMarkPaid, setConfirmMarkPaid] = useState<Invoice | null>(null);
  const [markPaidDate, setMarkPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmSendReminder, setConfirmSendReminder] = useState<Invoice | null>(null);
  const [confirmStopReminder, setConfirmStopReminder] = useState<Invoice | null>(null);
  const [confirmGenerate, setConfirmGenerate] = useState(false);

  const [payoutModal, setPayoutModal] = useState<Invoice | null>(null);
  const [payoutPercentage, setPayoutPercentage] = useState('80');
  const [reminderModal, setReminderModal] = useState<Invoice | null>(null);
  const [reminderFrequency, setReminderFrequency] = useState<'7' | '15' | '30'>('15');

  const { data, isLoading } = useInvoices(page, limit, statusFilter || undefined);
  const validTimesheetsQuery = useManagerTimesheets(1, 1000, 'VALIDE');
  const markPaidMutation = useMarkPaid();
  const downloadPdfMutation = useDownloadPdf();
  const generateMutation = useGenerateInvoice();
  const cancelMutation = useCancelInvoice();
  const payoutMutation = useTriggerPayout();
  const sendReminderMutation = useSendReminder();
  const setAutoReminderMutation = useSetAutoReminder();
  const stopAutoReminderMutation = useStopAutoReminder();

  const validTimesheets = validTimesheetsQuery.data?.data ?? [];
  const selectedTimesheet = validTimesheets.find(ts => ts.id === parseInt(generateTimesheetId, 10));

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((s: number) => { setLimit(s); setPage(1); }, []);

  const handleMarkPaid = (invoice: Invoice, paymentDate: string) => {
    markPaidMutation.mutate(
      { invoiceId: invoice.id, paymentDate },
      {
        onSuccess: () => {
          toast.success(`Facture ${invoice.ref} marquée comme payée`);
          setConfirmMarkPaid(null);
        },
        onError: () => toast.error("Erreur lors du marquage"),
      },
    );
  };

  const handleDownloadPdf = (id: number) => {
    downloadPdfMutation.mutate(id, {
      onSuccess: () => toast.success('Téléchargement démarré'),
      onError: () => toast.error('Erreur lors du téléchargement'),
    });
  };

  const handleCancelInvoice = () => {
    if (cancelConfirm === null) return;
    cancelMutation.mutate(cancelConfirm, {
      onSuccess: () => {
        toast.success('Facture annulée');
        setCancelConfirm(null);
      },
      onError: () => toast.error("Erreur lors de l'annulation"),
    });
  };

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

  const handleSendReminder = (invoice: Invoice) => {
    sendReminderMutation.mutate(invoice.id, {
      onSuccess: () => {
        toast.success(`Relance envoyée pour ${invoice.ref}`);
        setConfirmSendReminder(null);
      },
      onError: () => toast.error("Erreur lors de l'envoi"),
    });
  };

  const handleSetAutoReminder = (invoice: Invoice) => {
    setReminderModal(invoice);
    setReminderFrequency('15');
  };

  const handleConfirmAutoReminder = () => {
    if (!reminderModal) return;
    setAutoReminderMutation.mutate(
      { invoiceId: reminderModal.id, payload: { frequency: parseInt(reminderFrequency, 10) as 7 | 15 | 30 } },
      {
        onSuccess: () => {
          toast.success(`Relance automatique configurée (${reminderFrequency} jours)`);
          setReminderModal(null);
        },
        onError: () => toast.error("Erreur lors de la configuration"),
      },
    );
  };

  const handleStopAutoReminder = (invoice: Invoice) => {
    stopAutoReminderMutation.mutate(invoice.id, {
      onSuccess: () => {
        toast.success(`Relance automatique arrêtée`);
        setConfirmStopReminder(null);
      },
      onError: () => toast.error("Erreur lors de l'arrêt"),
    });
  };

  const handleGenerateInvoice = () => {
    const id = parseInt(generateTimesheetId, 10);
    if (isNaN(id)) return;
    generateMutation.mutate(
      { timesheetId: id, vatRate: parseFloat(vatRate) || 20 },
      {
        onSuccess: () => {
          toast.success('Facture générée avec succès');
          setGenerateModal(false);
          setConfirmGenerate(false);
          setGenerateTimesheetId('');
          setVatRate('20');
        },
        onError: () => toast.error("Erreur lors de la génération"),
      },
    );
  };

  const cancelDisabled = (status: string) => status === 'PAID' || status === 'PARTIAL_PAID';

  const columns: Column<Invoice>[] = [
    { key: 'ref', label: 'Réf', render: (inv) => <Link to={`/manager/invoices/${inv.id}`} className="text-[#3b82f6] hover:underline">{inv.ref}</Link> },
    { key: 'client', label: 'Client', render: (inv) => inv.client?.raison_sociale ?? '-' },
    { key: 'amount', label: 'Montant HT', render: (inv) => `${(inv.amount ?? 0).toLocaleString()} DH` },
    { key: 'vat', label: 'TVA', render: (inv) => `${(inv.vat ?? 0).toLocaleString()} DH (${inv.vatRate ?? 0}%)` },
    { key: 'total', label: 'Total TTC', render: (inv) => `${(inv.total ?? 0).toLocaleString()} DH` },
    {
      key: 'status',
      label: 'Statut',
      render: (inv) => (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[inv.status] || 'bg-[#e5e7eb] text-[#6b7280]'}`}>
          {statusLabels[inv.status] || inv.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (inv) => (
        <div className="flex gap-1.5 flex-wrap">
          {(inv.status === 'PENDING' || inv.status === 'PARTIAL_PAID') && (
            <button
              onClick={() => setConfirmMarkPaid(inv)}
              disabled={markPaidMutation.isPending}
              className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-2 py-1 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db]"
            >
              Marquer payée
            </button>
          )}
          {inv.status === 'PAID' && (
            inv.payments?.some((p) => p.type === 'CONSULTANT' && p.status === 'COMPLETED')
              ? (
                <span className="inline-flex items-center rounded-[8px] bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                  Le consultant est rémunéré.
                </span>
              )
              : (
                <button
                  onClick={() => setPayoutModal(inv)}
                  disabled={payoutMutation.isPending}
                  className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-2 py-1 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db]"
                >
                  Payer consultant
                </button>
              )
          )}
          <button
            onClick={() => handleDownloadPdf(inv.id)}
            disabled={downloadPdfMutation.isPending}
            className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-2 py-1 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db]"
          >
            Télécharger PDF
          </button>
          {(inv.status === 'PENDING' || inv.status === 'PARTIAL_PAID') && (
            <>
              <button
                onClick={() => setConfirmSendReminder(inv)}
                disabled={sendReminderMutation.isPending}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-2 py-1 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db]"
              >
                Envoyer relance
              </button>
              {inv.reminderFrequency ? (
                <button
                  onClick={() => setConfirmStopReminder(inv)}
                  disabled={stopAutoReminderMutation.isPending}
                  className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-2 py-1 text-xs font-medium text-[#ef4444] transition-colors hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:text-[#d1d5db]"
                >
                  Arrêter relance auto
                </button>
              ) : (
                <button
                  onClick={() => handleSetAutoReminder(inv)}
                  disabled={setAutoReminderMutation.isPending}
                  className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-2 py-1 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db]"
                >
                  Relance auto
                </button>
              )}
            </>
          )}
          {inv.status !== 'CANCELED' && (
            <button
              onClick={() => setCancelConfirm(inv.id)}
              disabled={cancelDisabled(inv.status)}
              className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-2 py-1 text-xs font-medium text-[#ef4444] transition-colors hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:text-[#d1d5db]"
            >
              Annuler
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#6b7280]">Statut:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="">Tous</option>
            <option value="PENDING">En attente</option>
            <option value="PARTIAL_PAID">Partiellement payé</option>
            <option value="PAID">Payé</option>
            <option value="CANCELED">Annulé</option>
          </select>
        </div>
        <button
          onClick={() => setGenerateModal(true)}
          className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-colors hover:bg-[#2563eb]"
        >
          Générer une facture
        </button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        pagination={data?.pagination ?? { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: limit }}
        isLoading={isLoading}
        isEmpty={!isLoading && (data?.data?.length ?? 0) === 0}
        emptyMessage="Aucune facture trouvée"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {generateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setGenerateModal(false)}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Générer une facture</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">CRA validé</label>
                <select
                  value={generateTimesheetId}
                  onChange={(e) => setGenerateTimesheetId(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                >
                  <option value="">Sélectionner un CRA</option>
                  {validTimesheets.map((ts) => (
                    <option key={ts.id} value={ts.id}>
                      {ts.month} | {ts.consultant.name} | {ts.mission.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">TVA (%)</label>
                <input
                  type="number"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setGenerateModal(false)}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Annuler
              </button>
              <button
                onClick={() => setConfirmGenerate(true)}
                disabled={generateMutation.isPending || !generateTimesheetId}
                className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Générer
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelConfirm !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setCancelConfirm(null); }}
        >
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Annuler la facture</h2>
            <p className="mb-6 text-sm text-[#6b7280]">Êtes-vous sûr de vouloir annuler cette facture&nbsp;?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Annuler
              </button>
              <button
                onClick={handleCancelInvoice}
                disabled={cancelMutation.isPending}
                className="cursor-pointer rounded-[8px] bg-[#ef4444] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Annulation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {reminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setReminderModal(null)}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Configurer la relance automatique</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Facture {reminderModal.ref}</p>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">Fréquence</label>
              <select
                value={reminderFrequency}
                onChange={(e) => setReminderFrequency(e.target.value as '7' | '15' | '30')}
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              >
                <option value="7">Tous les 7 jours</option>
                <option value="15">Tous les 15 jours</option>
                <option value="30">Tous les 30 jours</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setReminderModal(null)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handleConfirmAutoReminder} disabled={setAutoReminderMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {setAutoReminderMutation.isPending ? 'Configuration...' : 'Activer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmMarkPaid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => {
          setConfirmMarkPaid(null);
          setMarkPaidDate(new Date().toISOString().split('T')[0]);
        }}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Marquer comme payée</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Confirmer que la facture {confirmMarkPaid.ref} est payée&nbsp;?</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111111] mb-1">Date de paiement</label>
              <input
                type="date"
                value={markPaidDate}
                onChange={(e) => setMarkPaidDate(e.target.value)}
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => {
                setConfirmMarkPaid(null);
                setMarkPaidDate(new Date().toISOString().split('T')[0]);
              }} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={() => handleMarkPaid(confirmMarkPaid, markPaidDate)} disabled={markPaidMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {markPaidMutation.isPending ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSendReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setConfirmSendReminder(null)}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Envoyer une relance</h2>
            <p className="mb-6 text-sm text-[#6b7280]">Envoyer un email de relance pour {confirmSendReminder.ref}&nbsp;?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmSendReminder(null)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={() => handleSendReminder(confirmSendReminder)} disabled={sendReminderMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {sendReminderMutation.isPending ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmStopReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setConfirmStopReminder(null)}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Arrêter la relance automatique</h2>
            <p className="mb-6 text-sm text-[#6b7280]">Confirmer l'arrêt des relances automatiques pour {confirmStopReminder.ref}&nbsp;?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmStopReminder(null)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={() => handleStopAutoReminder(confirmStopReminder)} disabled={stopAutoReminderMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#ef4444] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {stopAutoReminderMutation.isPending ? 'Arrêt...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setConfirmGenerate(false)}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Générer la facture</h2>
            <p className="mb-6 text-sm text-[#6b7280]">Créer une facture pour {selectedTimesheet ? `${selectedTimesheet.month} | ${selectedTimesheet.consultant.name} | ${selectedTimesheet.mission.title}` : `CRA n°${generateTimesheetId}`} avec TVA à {vatRate}%&nbsp;?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmGenerate(false)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handleGenerateInvoice} disabled={generateMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {generateMutation.isPending ? 'Génération...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
