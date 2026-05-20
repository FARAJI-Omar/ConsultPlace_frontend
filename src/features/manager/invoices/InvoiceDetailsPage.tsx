import { useParams, Link } from 'react-router-dom';
import { useInvoiceDetail, useMarkPaid, useDownloadPdf, useEmailInvoice, useCancelInvoice } from '../../../hooks/manager/useInvoices';
import { useTriggerPayout } from '../../../hooks/manager/usePayouts';
import { useSendReminder, useSetAutoReminder, useStopAutoReminder } from '../../../hooks/manager/useReminders';
import { toast } from 'sonner';
import { FileText, Download, Mail, XCircle } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '../../../lib/utils';
import { Skeleton } from '../../../components/ui/skeleton';

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

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = id ? Number(id) : null;
  const { data, isLoading } = useInvoiceDetail(invoiceId);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [confirmMarkPaid, setConfirmMarkPaid] = useState(false);
  const [markPaidDate, setMarkPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmSendReminder, setConfirmSendReminder] = useState(false);
  const [confirmStopReminder, setConfirmStopReminder] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutPercentage, setPayoutPercentage] = useState('80');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState<'7' | '15' | '30'>('15');
  const invoice = data?.data;

  const markPaidMutation = useMarkPaid();
  const downloadPdfMutation = useDownloadPdf();
  const emailMutation = useEmailInvoice();
  const cancelMutation = useCancelInvoice();
  const payoutMutation = useTriggerPayout();
  const sendReminderMutation = useSendReminder();
  const setAutoReminderMutation = useSetAutoReminder();
  const stopAutoReminderMutation = useStopAutoReminder();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[12px] bg-[#f5f5f5] p-6">
              <Skeleton className="mb-4 h-5 w-28" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-36" />
          ))}
        </div>
      </div>
    );
  }

  if (!invoice) return <p className="text-sm text-[#6b7280]">Facture introuvable</p>;

  const handleMarkPaid = () => {
    markPaidMutation.mutate(
      { invoiceId: invoice.id, paymentDate: markPaidDate },
      {
        onSuccess: () => {
          toast.success(`Facture ${invoice.ref} marquée comme payée`);
          setConfirmMarkPaid(false);
        },
        onError: () => toast.error("Erreur lors du marquage"),
      },
    );
  };

  const handleDownload = () => {
    downloadPdfMutation.mutate(invoice.id, {
      onSuccess: () => toast.success('Téléchargement démarré'),
      onError: () => toast.error('Erreur lors du téléchargement'),
    });
  };

  const handleEmail = () => {
    emailMutation.mutate(invoice.id, {
      onSuccess: (res) => toast.success(`Email envoyé à ${res.data.sentTo}`),
      onError: () => toast.error("Erreur lors de l'envoi"),
    });
  };

  const handleCancel = () => {
    cancelMutation.mutate(invoice.id, {
      onSuccess: () => {
        toast.success('Facture annulée');
        setCancelConfirm(false);
      },
      onError: () => toast.error("Erreur lors de l'annulation"),
    });
  };

  const handlePayout = () => {
    payoutMutation.mutate(
      { invoiceId: invoice.id, payoutPercentage: parseFloat(payoutPercentage) || 80 },
      {
        onSuccess: () => {
          toast.success('Paiement déclenché');
          setShowPayoutModal(false);
          setPayoutPercentage('80');
        },
        onError: () => toast.error('Erreur lors du paiement'),
      },
    );
  };

  const handleSendReminder = () => {
    sendReminderMutation.mutate(invoice.id, {
      onSuccess: (res) => {
        toast.success(`Relance envoyée à ${res.data.sentTo}`);
        setConfirmSendReminder(false);
      },
      onError: () => toast.error("Erreur lors de l'envoi"),
    });
  };

  const handleSetAutoReminder = () => {
    setAutoReminderMutation.mutate(
      { invoiceId: invoice.id, payload: { frequency: parseInt(reminderFrequency, 10) as 7 | 15 | 30 } },
      {
        onSuccess: () => {
          toast.success(`Relance automatique configurée (${reminderFrequency} jours)`);
          setShowReminderModal(false);
        },
        onError: () => toast.error('Erreur lors de la configuration'),
      },
    );
  };

  const handleStopAutoReminder = () => {
    stopAutoReminderMutation.mutate(invoice.id, {
      onSuccess: () => {
        toast.success('Relance automatique arrêtée');
        setConfirmStopReminder(false);
      },
      onError: () => toast.error("Erreur lors de l'arrêt"),
    });
  };

  const totalPaid = invoice.paid ?? invoice.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const remaining = invoice.rest ?? (invoice.total ?? 0) - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/manager/invoices"
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-1.5 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>
        <h1 className="text-2xl font-semibold text-[#111111]">Facture {invoice.ref}</h1>
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[invoice.status] || ''}`}>
          {statusLabels[invoice.status] || invoice.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Informations</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[#6b7280]">Référence</span><span className="font-medium text-[#111111]">{invoice.ref}</span></div>
            <div className="flex justify-between"><span className="text-[#6b7280]">Date d'émission</span><span className="font-medium text-[#111111]">{formatDate(invoice.issueDate)}</span></div>
            <div className="flex justify-between"><span className="text-[#6b7280]">Date d'échéance</span><span className="font-medium text-[#111111]">{formatDate(invoice.dueDate)}</span></div>
            {invoice.paymentDate && <div className="flex justify-between"><span className="text-[#6b7280]">Date de paiement</span><span className="font-medium text-[#111111]">{formatDate(invoice.paymentDate)}</span></div>}
          </div>
        </div>

        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Montants</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[#6b7280]">Montant HT</span><span className="font-medium text-[#111111]">{(invoice.amount ?? 0).toLocaleString()} DH</span></div>
            <div className="flex justify-between"><span className="text-[#6b7280]">TVA ({invoice.vatRate ?? 0}%)</span><span className="font-medium text-[#111111]">{(invoice.vat ?? 0).toLocaleString()} DH</span></div>
            <div className="flex justify-between border-t border-[#e5e7eb] pt-2"><span className="font-medium text-[#111111]">Total TTC</span><span className="font-semibold text-[#111111]">{(invoice.total ?? 0).toLocaleString()} DH</span></div>
            {invoice.status !== 'PAID' && invoice.status !== 'CANCELED' && (
              <div className="flex justify-between border-t border-[#e5e7eb] pt-2"><span className="text-[#6b7280]">Reste dû</span><span className="font-medium text-[#ef4444]">{remaining.toLocaleString()} DH</span></div>
            )}
          </div>
        </div>

        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Client</h2>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-[#111111]">{invoice.client?.raison_sociale}</p>
            <p className="text-[#6b7280]">{invoice.client?.email}</p>
          </div>
        </div>

        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Consultant</h2>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-[#111111]">{invoice.consultant?.name}</p>
            <p className="text-[#6b7280]">{invoice.consultant?.email}</p>
          </div>
        </div>
      </div>

      {invoice.timesheet && (
        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Relevé associé</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[#6b7280]">Mission</span><span className="font-medium text-[#111111]">{invoice.timesheet.mission.title}</span></div>
            <div className="flex justify-between"><span className="text-[#6b7280]">Mois</span><span className="font-medium text-[#111111]">{invoice.timesheet.month}</span></div>
            <div className="flex justify-between"><span className="text-[#6b7280]">Jours</span><span className="font-medium text-[#111111]">{invoice.timesheet.days}</span></div>
          </div>
        </div>
      )}

      {invoice.payments && invoice.payments.length > 0 && (
        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Historique des paiements</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Réf</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Montant</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Date</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id} className="border-b border-[#e5e7eb]">
                    <td className="px-3 py-2 text-xs text-[#6b7280]">{p.ref}</td>
                    <td className="px-3 py-2 text-[#111111]">{(p.amount ?? 0).toLocaleString()} DH</td>
                    <td className="px-3 py-2 text-[#6b7280]">{formatDate(p.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {invoice.documents && invoice.documents.length > 0 && (
        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Documents</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {invoice.documents.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-3 transition-colors hover:bg-[#f9fafb]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#eff6ff]">
                  <FileText className="h-5 w-5 text-[#3b82f6]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#111111]">Document {i + 1}</p>
                </div>
                <Download className="h-4 w-4 shrink-0 text-[#6b7280]" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {(invoice.status === 'PENDING' || invoice.status === 'PARTIAL_PAID') && (
          <button
            onClick={() => setConfirmMarkPaid(true)}
            disabled={markPaidMutation.isPending}
            className="inline-flex items-center gap-2 cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Marquer payée
          </button>
        )}
        {invoice.status === 'PAID' && (
          invoice.payments?.some((p) => p.type === 'CONSULTANT' && p.status === 'COMPLETED')
            ? (
              <span className="inline-flex items-center rounded-[8px] bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                Le consultant est rémunéré.
              </span>
            )
            : (
              <button
                onClick={() => setShowPayoutModal(true)}
                disabled={payoutMutation.isPending}
                className="inline-flex items-center gap-2 cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Payer consultant
              </button>
            )
        )}
        <button
          onClick={handleDownload}
          disabled={downloadPdfMutation.isPending}
          className="inline-flex items-center gap-2 cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          <Download className="h-4 w-4" />
          Télécharger PDF
        </button>
        <button
          onClick={handleEmail}
          disabled={emailMutation.isPending}
          className="inline-flex items-center gap-2 cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          <Mail className="h-4 w-4" />
          Envoyer par email
        </button>
        {(invoice.status === 'PENDING' || invoice.status === 'PARTIAL_PAID') && (
          <>
            <button
              onClick={() => setConfirmSendReminder(true)}
              disabled={sendReminderMutation.isPending}
              className="inline-flex items-center gap-2 cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
            >
              Envoyer relance
            </button>
            {invoice.reminderFrequency ? (
              <button
                onClick={() => setConfirmStopReminder(true)}
                disabled={stopAutoReminderMutation.isPending}
                className="inline-flex items-center gap-2 cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm font-medium text-[#ef4444] transition-colors hover:bg-[#fef2f2] disabled:opacity-50"
              >
                Arrêter relance auto
              </button>
            ) : (
              <button
                onClick={() => setShowReminderModal(true)}
                disabled={setAutoReminderMutation.isPending}
                className="inline-flex items-center gap-2 cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Relance auto
              </button>
            )}
          </>
        )}
        {invoice.status !== 'CANCELED' && (
          <button
            onClick={() => setCancelConfirm(true)}
            disabled={cancelMutation.isPending || invoice.status === 'PAID' || invoice.status === 'PARTIAL_PAID'}
            className="inline-flex items-center gap-2 cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm font-medium text-[#ef4444] transition-colors hover:bg-[#fef2f2] disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Annuler
          </button>
        )}
      </div>

      {cancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setCancelConfirm(false); }}
        >
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Annuler la facture</h2>
            <p className="mb-6 text-sm text-[#6b7280]">Êtes-vous sûr de vouloir annuler cette facture&nbsp;?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelConfirm(false)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handleCancel} disabled={cancelMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#ef4444] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {cancelMutation.isPending ? 'Annulation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setShowPayoutModal(false)}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Payer le consultant</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Facture {invoice.ref}</p>
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
              <button onClick={() => setShowPayoutModal(false)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handlePayout} disabled={payoutMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {payoutMutation.isPending ? 'Traitement...' : 'Confirmer le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setShowReminderModal(false)}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Configurer la relance automatique</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Facture {invoice.ref}</p>
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
              <button onClick={() => setShowReminderModal(false)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handleSetAutoReminder} disabled={setAutoReminderMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {setAutoReminderMutation.isPending ? 'Configuration...' : 'Activer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmMarkPaid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => {
          setConfirmMarkPaid(false);
          setMarkPaidDate(new Date().toISOString().split('T')[0]);
        }}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Marquer comme payée</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Confirmer que la facture {invoice.ref} est payée&nbsp;?</p>
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
                setConfirmMarkPaid(false);
                setMarkPaidDate(new Date().toISOString().split('T')[0]);
              }} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handleMarkPaid} disabled={markPaidMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {markPaidMutation.isPending ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSendReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setConfirmSendReminder(false)}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Envoyer une relance</h2>
            <p className="mb-6 text-sm text-[#6b7280]">Envoyer un email de relance pour {invoice.ref}&nbsp;?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmSendReminder(false)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handleSendReminder} disabled={sendReminderMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {sendReminderMutation.isPending ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmStopReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setConfirmStopReminder(false)}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Arrêter la relance automatique</h2>
            <p className="mb-6 text-sm text-[#6b7280]">Confirmer l'arrêt des relances automatiques pour {invoice.ref}&nbsp;?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmStopReminder(false)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handleStopAutoReminder} disabled={stopAutoReminderMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#ef4444] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {stopAutoReminderMutation.isPending ? 'Arrêt...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
