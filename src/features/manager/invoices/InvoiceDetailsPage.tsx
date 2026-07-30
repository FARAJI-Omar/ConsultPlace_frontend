import { useParams, Link, useNavigate } from 'react-router-dom';
import { useInvoiceDetail, useMarkPaid, useDownloadPdf, useEmailInvoice, useCancelInvoice } from '../../../hooks/manager/useInvoices';
import { useTriggerPayout } from '../../../hooks/manager/usePayouts';
import { useSendReminder, useSetAutoReminder, useStopAutoReminder } from '../../../hooks/manager/useReminders';
import { useJobStatus } from '../../../hooks/manager/useJobStatus';
import { toast } from 'sonner';
import { FileText, Download, Mail, ClipboardList /*, XCircle */ } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../lib/apiClient';
import { formatDate, truncateFilename } from '../../../lib/utils';
import { Skeleton } from '../../../components/ui/skeleton';
import LoadingOverlay from '../../../components/common/LoadingOverlay';
import { downloadFile } from '../../../utils/downloadFile';
import { validateInvoiceEmail, storeJob, clearJob } from '../../../utils/email';
import type { StoredJob } from '../../../utils/email';

const statusBadge: Record<string, string> = {
  PENDING: 'bg-[#fef3c7] text-[#f59e0b]',
  PARTIAL_PAID: 'bg-[#ffedd5] text-[#f97316]',
  PAID: 'bg-[#d1fae5] text-[#10b981]',
  CANCELED: 'bg-[#e5e7eb] text-[#6b7280]',
};

const statusLabels: Record<string, string> = {
  PENDING: 'En attente',
  PARTIAL_PAID: 'Partiellement paye',
  PAID: 'Payé',
  CANCELED: 'Annulé',
};

export default function InvoiceDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const invoiceId = id ? Number(id) : null;
  const { data, isLoading } = useInvoiceDetail(invoiceId);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [confirmMarkPaid, setConfirmMarkPaid] = useState(false);
  const [markPaidDate, setMarkPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [markPaidComment, setMarkPaidComment] = useState('');
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [confirmSendReminder, setConfirmSendReminder] = useState(false);
  const [confirmStopReminder, setConfirmStopReminder] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutMode, setPayoutMode] = useState<'DH' | '%'>('DH');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutComment, setPayoutComment] = useState('');
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [payoutConsultantId, setPayoutConsultantId] = useState<number | ''>('');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState<'7' | '15' | '30'>('15');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptTitle, setReceiptTitle] = useState('');
  const [receiptTitleTouched, setReceiptTitleTouched] = useState(false);
  const [receiptDate, setReceiptDate] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const invoice = data?.data;

  const markPaidMutation = useMarkPaid();
  const downloadPdfMutation = useDownloadPdf();
  const emailMutation = useEmailInvoice();
  const cancelMutation = useCancelInvoice();
  const payoutMutation = useTriggerPayout();
  const sendReminderMutation = useSendReminder();
  const setAutoReminderMutation = useSetAutoReminder();
  const stopAutoReminderMutation = useStopAutoReminder();

  const queryClient = useQueryClient();
  const [pendingJob, setPendingJob] = useState<StoredJob | null>(null);
  const jobStatusQuery = useJobStatus(pendingJob?.jobId ?? null);

  useEffect(() => {
    if (!jobStatusQuery.data || !pendingJob) return;
    const d = jobStatusQuery.data.data;
    if (d.status === 'COMPLETED') {
      toast.success('Email envoyé avec succès');
      clearJob(pendingJob.jobId);
      setPendingJob(null);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } else if (d.status === 'FAILED') {
      toast.error(`Échec d'envoi : ${d.lastError ?? 'Erreur inconnue'}`, {
        action: {
          label: 'Réessayer',
          onClick: () => {
            if (pendingJob.type === 'email') {
              emailMutation.mutate(pendingJob.invoiceId, {
                onSuccess: (res) => {
                  const j: StoredJob = { ...pendingJob, jobId: res.data.jobId };
                  storeJob(j);
                  setPendingJob(j);
                  toast("Email mis en file d'attente...");
                },
              });
            } else {
              sendReminderMutation.mutate(pendingJob.invoiceId, {
                onSuccess: (res) => {
                  const j: StoredJob = { ...pendingJob, jobId: res.data.jobId };
                  storeJob(j);
                  setPendingJob(j);
                  toast("Relance mise en file d'attente...");
                },
              });
            }
          },
        },
      });
      clearJob(pendingJob.jobId);
      setPendingJob(null);
    }
  }, [jobStatusQuery.data, pendingJob, queryClient, emailMutation, sendReminderMutation]);

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
    if (invoice && markPaidDate < invoice.issueDate.split('T')[0]) {
      toast.error(`La date de paiement ne peut pas être antérieure à la date d'émission de la facture (${invoice.issueDate.split('T')[0]})`);
      return;
    }
    markPaidMutation.mutate(
      { invoiceId: invoice.id, paymentDate: markPaidDate, comment: markPaidComment || undefined },
      {
        onSuccess: () => {
          toast.success(`Facture ${invoice.ref} marquée comme payee`);
          setConfirmMarkPaid(false);
          setMarkPaidComment('');
          if (invoice.reminderFrequency) {
            stopAutoReminderMutation.mutate(invoice.id);
          }
        },
        onError: (err) => toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Erreur lors du marquage"),
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
    const error = validateInvoiceEmail(invoice.client?.email);
    if (error) { toast.error(error); setConfirmEmail(false); return; }
    setConfirmEmail(false);
    toast("Email mis en file d'attente...");
    emailMutation.mutate(invoice.id, {
      onSuccess: (res) => {
        const job: StoredJob = { jobId: res.data.jobId, invoiceId: invoice.id, type: 'email', invoiceRef: invoice.ref };
        storeJob(job);
        setPendingJob(job);
      },
      onError: (err) => {
        toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Erreur lors de l'envoi");
      },
    });
  };

  const handleSendReminder = () => {
    const error = validateInvoiceEmail(invoice.client?.email);
    if (error) { toast.error(error); return; }
    toast("Relance mise en file d'attente...");
    sendReminderMutation.mutate(invoice.id, {
      onSuccess: (res) => {
        const job: StoredJob = { jobId: res.data.jobId, invoiceId: invoice.id, type: 'reminder', invoiceRef: invoice.ref };
        storeJob(job);
        setPendingJob(job);
        setConfirmSendReminder(false);
      },
      onError: (err) => {
        toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Erreur lors de l'envoi");
      },
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

  const payoutRest = invoice.consultantPayoutRest ?? 0;
  const payoutBase = invoice.consultantsPayouts && payoutConsultantId
    ? (invoice.consultantsPayouts.find((cp) => cp.consultantId === payoutConsultantId)?.rest ?? payoutRest)
    : invoice.consultantPayouts && payoutConsultantId
      ? (invoice.consultantPayouts.find((cp) => cp.consultantId === payoutConsultantId)?.payoutAmount ?? payoutRest)
      : payoutRest;

  const handlePayout = () => {
    const parsed = parseFloat(payoutAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }
    if (payoutMode === 'DH' && parsed > payoutBase) {
      toast.error("Le montant ne peut pas dépasser le restant dû");
      return;
    }
    const dhAmount = payoutMode === '%'
      ? Math.round(payoutBase * parsed / 100 * 100) / 100
      : parsed;
    payoutMutation.mutate(
      { invoiceId: invoice.id, consultantId: Number(payoutConsultantId) || undefined, amount: dhAmount, paymentDate: payoutDate, comment: payoutComment || undefined },
      {
        onSuccess: () => {
          toast.success('Paiement déclenché');
          setShowPayoutModal(false);
          setPayoutAmount('');
          setPayoutComment('');
          setPayoutConsultantId('');
        },
        onError: (err) => {
          const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
          toast.error(axiosErr.response?.data?.error?.message ?? 'Erreur lors du paiement');
        },
      },
    );
  };

  const handleSetAutoReminder = () => {
    const error = validateInvoiceEmail(invoice.client?.email);
    if (error) { toast.error(error); return; }
    setAutoReminderMutation.mutate(
      { invoiceId: invoice.id, payload: { frequency: parseInt(reminderFrequency, 10) as 7 | 15 | 30 } },
      {
        onSuccess: () => {
          toast.success(`Relance automatique configurée (${reminderFrequency} jours)`);
          setShowReminderModal(false);
        },
        onError: (err) => toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Erreur lors de la configuration"),
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
    <LoadingOverlay isLoading={markPaidMutation.isPending || payoutMutation.isPending || downloadPdfMutation.isPending || cancelMutation.isPending || setAutoReminderMutation.isPending || stopAutoReminderMutation.isPending}>
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
        <h1 className="text-lg md:text-xl font-semibold text-[#111111]">Facture {invoice.ref}</h1>
        <div className="flex items-center gap-1.5">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[invoice.status] || ''}`}>
            {statusLabels[invoice.status] || invoice.status}
          </span>
          {invoice.daysLate != null && invoice.daysLate >= 15 && (
            invoice.status === 'PAID' ? (
              <span className="text-xs font-medium text-[#10b981]">+{invoice.daysLate} j</span>
            ) : invoice.status === 'PENDING' || invoice.status === 'PARTIAL_PAID' ? (
              <span className="text-xs font-medium text-[#ef4444]">en retard {invoice.daysLate} j</span>
            ) : null
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[12px] bg-[#0051ff09] border border-[#e5e7eb] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Informations</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[#6b7280]">Référence</span><span className="font-medium text-[#111111]">{invoice.ref}</span></div>
            <div className="flex justify-between"><span className="text-[#6b7280]">Date d'émission</span><span className="font-medium text-[#111111]">{formatDate(invoice.issueDate)}</span></div>
            <div className="flex justify-between"><span className="text-[#6b7280]">Date d'échéance</span><span className="font-medium text-[#111111]">{formatDate(invoice.dueDate)}</span></div>
            {invoice.paymentDate && <div className="flex justify-between border-t border-[#e5e7eb] pt-2"><span className="text-[#6b7280]">Date de paiement</span><span className="font-medium text-[#111111]">{formatDate(invoice.paymentDate)}</span></div>}
          </div>
        </div>

        <div className="rounded-[12px] bg-[#0051ff09] border border-[#e5e7eb] p-6">
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

        <div className="rounded-[12px] bg-[#ffffff] border border-[#e5e7eb] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Client</h2>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-[#111111]">{invoice.client?.raison_sociale}</p>
            <p className="text-[#6b7280]">{invoice.client?.email}</p>
          </div>
          {invoice.payments && invoice.payments.filter(p => p.type === 'CLIENT').length > 0 && (
            <div className="mt-4 border-t border-[#e5e7eb] pt-4">
              <h3 className="mb-2 text-sm font-semibold text-[#111111]">Historique des paiements Client</h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-[#6b7280]">#</th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-[#6b7280]">Réf</th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-[#6b7280]">Montant</th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-[#6b7280]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.filter(p => p.type === 'CLIENT').map((p, idx) => (
                    <tr key={p.id} className="border-b border-[#e5e7eb]">
                      <td className="px-2 py-1.5 text-xs text-[#6b7280]">{idx + 1}</td>
                      <td className="px-2 py-1.5 text-xs text-[#6b7280]">{p.ref}</td>
                      <td className="px-2 py-1.5 text-[#111111]">{(p.amount ?? 0).toLocaleString()} DH</td>
                      <td className="px-2 py-1.5 text-[#6b7280]">{formatDate(p.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 border-t border-[#e5e7eb] pt-4">
            <h3 className="mb-2 text-sm font-semibold text-[#111111]">Bons de commande consommés</h3>
            {(!invoice.bdcConsumptions || invoice.bdcConsumptions.length === 0) ? (
              <p className="text-sm text-[#6b7280]">Aucun bon de commande consommé</p>
            ) : (
              <div className="space-y-2">
                {invoice.bdcConsumptions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => navigate(`/manager/bons-de-commande/${c.bdcId}`)}
                    className="flex w-full items-center justify-between rounded-[6px] bg-[#f9fafb] px-3 py-2 text-left transition-colors hover:bg-[#eff6ff] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-[#3b82f6]" />
                      <span className="text-sm font-medium text-[#111111]">
                        {c.bdc?.bdc ?? 'BDC'}
                      </span>
                    </div>
                    <span className="text-sm text-[#6b7280]">{c.daysConsumed} jours</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[12px] bg-[#ffffff] border border-[#e5e7eb] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Consultant{invoice.consultantsPayouts && invoice.consultantsPayouts.length > 1 ? 's' : ''}</h2>
          {invoice.consultantsPayouts && invoice.consultantsPayouts.length > 0 ? (
            <div className="space-y-4 text-sm">
              {invoice.consultantsPayouts.map((cp) => {
                const consultant = invoice.consultants?.find((c) => c.id === cp.consultantId);
                const name = consultant?.name ?? `Consultant #${cp.consultantId}`;
                return (
                  <div key={cp.consultantId} className="rounded-[8px] border border-[#e5e7eb] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[#111111]">{name}</span>
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        cp.status === 'paye'
                          ? 'bg-green-100 text-green-700'
                          : cp.status === 'paiement_partiel'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-500'
                      }`}>
                        {cp.status === 'paye' ? 'Payé' : cp.status === 'paiement_partiel' ? 'Paiement partiel' : 'Non payé'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-[#6b7280]">Montant à payer (TTC)</span><span className="text-[#111111]">{cp.payoutAmount.toLocaleString()} DH</span></div>
                      <div className="flex justify-between"><span className="text-[#6b7280]">Payé</span><span className="text-[#111111]">{cp.paid.toLocaleString()} DH</span></div>
                      <div className="flex justify-between"><span className="text-[#6b7280]">Reste</span><span className={`font-medium ${cp.rest > 0 ? 'text-[#ef4444]' : 'text-[#111111]'}`}>{cp.rest.toLocaleString()} DH</span></div>
                    </div>
                    {cp.paymentHistory && cp.paymentHistory.length > 0 && (
                      <div className="mt-3 border-t border-[#e5e7eb] pt-3">
                        <p className="mb-1.5 text-xs font-semibold text-[#6b7280]">Historique des paiements</p>
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#e5e7eb]">
                              <th className="px-1.5 py-1 text-left font-medium text-[#6b7280]">#</th>
                              <th className="px-1.5 py-1 text-left font-medium text-[#6b7280]">Montant</th>
                              <th className="px-1.5 py-1 text-left font-medium text-[#6b7280]">Reste</th>
                              <th className="px-1.5 py-1 text-left font-medium text-[#6b7280]">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cp.paymentHistory.map((ph, idx) => (
                              <tr key={idx} className="border-b border-[#e5e7eb]">
                                <td className="px-1.5 py-1 text-[#6b7280]">{idx + 1}</td>
                                <td className="px-1.5 py-1 text-[#111111]">{(ph.amount ?? 0).toLocaleString()} DH</td>
                                <td className="px-1.5 py-1 text-[#111111]">{(ph.rest ?? 0).toLocaleString()} DH</td>
                                <td className="px-1.5 py-1 text-[#6b7280]">{formatDate(ph.date)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {invoice.consultants && invoice.consultants.length > 0 ? (
                <div>
                  {invoice.consultants.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <p className="font-medium text-[#111111]">{c.name}</p>
                      <p className="text-[#6b7280]">{c.email}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <p className="font-medium text-[#111111]">{invoice.consultant?.name}</p>
                  <p className="text-[#6b7280]">{invoice.consultant?.email}</p>
                </>
              )}
              <div className="flex justify-between border-t border-[#e5e7eb] pt-2">
                <span className="text-[#6b7280]">Montant à payer au consultant (TTC)</span>
                <span className="font-medium text-[#111111]">{(invoice.consultantPayout ?? 0).toLocaleString()} DH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280]">Statut</span>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  invoice.consultantPayoutStatus === 'paye'
                    ? 'bg-green-100 text-green-700'
                    : invoice.consultantPayoutStatus === 'paiement_partiel'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                }`}>
                  {invoice.consultantPayoutStatus === 'paye'
                    ? 'Payé'
                    : invoice.consultantPayoutStatus === 'paiement_partiel'
                      ? 'Paiement partiel'
                      : 'Non payé'}
                </span>
              </div>
            </div>
          )}
          {!invoice.consultantsPayouts && invoice.consultantPayments && invoice.consultantPayments.length > 0 && (
            <div className="mt-4 border-t border-[#e5e7eb] pt-4">
              <h3 className="mb-2 text-sm font-semibold text-[#111111]">Historique des paiements Consultant</h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-[#6b7280]">#</th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-[#6b7280]">Montant</th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-[#6b7280]">Reste</th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-[#6b7280]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.consultantPayments.map((cp, idx) => (
                    <tr key={idx} className="border-b border-[#e5e7eb]">
                      <td className="px-2 py-1.5 text-xs text-[#6b7280]">{idx + 1}</td>
                      <td className="px-2 py-1.5 text-[#111111]">{(cp.amount ?? 0).toLocaleString()} DH</td>
                      <td className="px-2 py-1.5 text-[#111111]">{(cp.rest ?? 0).toLocaleString()} DH</td>
                      <td className="px-2 py-1.5 text-[#6b7280]">{formatDate(cp.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {(() => {
        const docGroups: { label: string; types: string[] }[] = [
          { label: 'Facture PDF', types: ['INVOICE', 'INVOICE_PDF'] },
          { label: 'Documents BDC & Mission', types: ['BDC_DOC', 'MISSION_DOC'] },
          { label: 'Pièces justificatives Consultant', types: ['CONSULTANT_FACTURE', 'PROOF'] },
        ];
        const docs = invoice.documents ?? [];
        const others = docs.filter((d) => !docGroups.some((g) => g.types.includes(d.type)));
        const grouped = docGroups.map((g) => ({
          label: g.label,
          items: docs.filter((d) => g.types.includes(d.type)),
        })).concat(others.length > 0 ? [{ label: 'Autres', items: others }] : []);
        const hasAny = grouped.some((g) => g.items.length > 0) || (invoice.receipts?.length ?? 0) > 0;
        return (
          <div className="rounded-[12px] bg-[#ffffff] border border-[#e5e7eb] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Documents associés</h2>
            {!hasAny ? (
              <p className="text-sm text-[#6b7280]">Aucun document trouvé</p>
            ) : (
              <div className="space-y-6">
                {grouped.map((group) =>
                  group.items.length > 0 ? (
                    <div key={group.label}>
                      <h3 className="mb-3 text-sm font-semibold text-[#111111]">{group.label}</h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {group.items.map((doc, i) => {
                          const filename = doc.url.split('/').pop() || `Document ${i + 1}`;
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-3 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-3"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#eff6ff]">
                                <FileText className="h-5 w-5 text-[#3b82f6]" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="truncate text-xs md:text-sm font-medium text-[#111111] hover:underline"
                                >
                                  {truncateFilename(filename)}
                                </a>
                              </div>
                              <button
                                type="button"
                                onClick={() => downloadFile(doc.url, filename)}
                                title="Telecharger"
                                className="cursor-pointer rounded p-2 text-[#6b7280] transition-colors hover:bg-[#4cd64e4d] hover:text-[#111111]"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null
                )}
                {(invoice.receipts?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-[#111111]">Accusé de réception</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {invoice.receipts?.map((receipt) => {
                        const filename = receipt.filename;
                        return (
                          <div
                            key={receipt.id}
                            className="flex items-center gap-3 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-3"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#eff6ff]">
                              <FileText className="h-5 w-5 text-[#3b82f6]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <a
                                href={receipt.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate text-xs md:text-sm font-medium text-[#111111] hover:underline"
                              >
                                {receipt.title}
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => downloadFile(receipt.url, filename)}
                              title="Telecharger"
                              className="cursor-pointer rounded p-2 text-[#6b7280] transition-colors hover:bg-[#4cd64e4d] hover:text-[#111111]"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      <div className="flex flex-wrap gap-3">
        {(invoice.status === 'PENDING' || invoice.status === 'PARTIAL_PAID') && (
          <button
            onClick={() => setConfirmMarkPaid(true)}
            disabled={markPaidMutation.isPending}
            className="inline-flex items-center gap-2 cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Marquer payee
          </button>
        )}
        {payoutRest <= 0
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
          onClick={() => setConfirmEmail(true)}
          disabled={emailMutation.isPending}
          className={`group inline-flex items-center gap-2 cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm font-medium transition-colors hover:bg-[#f3f4f6] ${invoice.isSent ? 'text-green-500' : 'text-[#111111]'}`}
        >
          <Mail className="h-4 w-4" />
          <span className="group-hover:hidden">{invoice.isSent ? 'Facture envoyée' : 'Envoyer facture par email'}</span>
          <span className="hidden group-hover:inline">{invoice.isSent ? 'Renvoyer l\'email' : 'Envoyer facture par email'}</span>
        </button>
        {(invoice.receipts?.length ?? 0) > 0
          ? (
            <span className="inline-flex items-center rounded-[8px] bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              Accusé de réception ✔
            </span>
          )
          : (
            <button
              onClick={() => { setReceiptTitle(`Accusé de réception - facture ${invoice.ref}`); setReceiptTitleTouched(false); setReceiptDate(''); setReceiptFile(null); setShowReceiptModal(true); }}
              className="inline-flex items-center gap-2 cursor-pointer rounded-[8px] border border-[#e5e7eb] bg-red-100/60 px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
            >
              Accusé de réception
            </button>
          )}
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
        {/* {invoice.status !== 'CANCELED' && (
          <button
            onClick={() => setCancelConfirm(true)}
            disabled={cancelMutation.isPending || invoice.status === 'PAID' || invoice.status === 'PARTIAL_PAID'}
            className="inline-flex items-center gap-2 cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm font-medium text-[#ef4444] transition-colors hover:bg-[#fef2f2] disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Annuler
          </button>
        )} */}
      </div>

      {cancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Payer le consultant</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Facture {invoice.ref}</p>

            <p className="mb-3 text-sm text-[#6b7280]">
              Reste à payer : <span className="font-bold bg-green-500/20 px-4 py-1 rounded text-[#111111]">{payoutRest.toLocaleString()} DH</span>
            </p>

            {(invoice.consultantsPayouts && invoice.consultantsPayouts.length > 0 || invoice.consultantPayouts && invoice.consultantPayouts.length > 0) && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#111111] mb-1">Consultant</label>
                <select
                  value={payoutConsultantId}
                  onChange={(e) => setPayoutConsultantId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                >
                  <option value="">Sélectionner un consultant</option>
                  {invoice.consultantsPayouts && invoice.consultantsPayouts.length > 0
                    ? invoice.consultantsPayouts.filter((cp) => cp.rest > 0).map((cp) => {
                        const consultant = invoice.consultants?.find((c) => c.id === cp.consultantId);
                        const name = consultant?.name ?? `Consultant #${cp.consultantId}`;
                        return (
                          <option key={cp.consultantId} value={cp.consultantId}>
                            {name} — reste {cp.rest.toLocaleString()} DH
                          </option>
                        );
                      })
                    : invoice.consultantPayouts?.map((cp) => {
                        const consultant = invoice.consultants?.find((c) => c.id === cp.consultantId);
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

            <div>
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
              <label className="block text-sm font-medium text-[#111111] mb-1">Date de paiement</label>
              <input
                type="date"
                value={payoutDate}
                onChange={(e) => setPayoutDate(e.target.value)}
                autoComplete="off"
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-[#111111] mb-1">Commentaire (optionnel)</label>
              <textarea
                value={payoutComment}
                onChange={(e) => setPayoutComment(e.target.value)}
                rows={2}
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] resize-none"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowPayoutModal(false)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handlePayout} disabled={payoutMutation.isPending || !payoutAmount || parseFloat(payoutAmount) <= 0 || parseFloat(payoutAmount) > (payoutMode === 'DH' ? payoutBase : 100)} className="cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {payoutMutation.isPending ? 'Traitement...' : 'Confirmer le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Marquer comme payee</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Confirmer que la facture {invoice.ref} est payee&nbsp;?</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111111] mb-1">Date de paiement</label>
              <input
                type="date"
                value={markPaidDate}
                onChange={(e) => setMarkPaidDate(e.target.value)}
                autoComplete="off"
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111111] mb-1">Commentaire (optionnel)</label>
              <textarea
                value={markPaidComment}
                onChange={(e) => setMarkPaidComment(e.target.value)}
                rows={2}
                placeholder="Ajouter un commentaire..."
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => {
                setConfirmMarkPaid(false);
                setMarkPaidDate(new Date().toISOString().split('T')[0]);
                setMarkPaidComment('');
              }} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handleMarkPaid} disabled={markPaidMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {markPaidMutation.isPending ? 'Traitement...' : 'Confirmer'}
              </button>
        </div>
      </div>
    </div>
  )}

      {confirmEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">{invoice.isSent ? 'Renvoyer par email' : 'Envoyer par email'}</h2>
            <p className="mb-6 text-sm text-[#6b7280]">Envoyer {invoice.ref} à {invoice.client?.email ?? 'aucun email'}&nbsp;?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmEmail(false)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handleEmail} disabled={emailMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {emailMutation.isPending ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Accusé de réception</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Facture {invoice.ref}</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111111] mb-1">Titre</label>
              <input
                type="text"
                value={receiptTitle}
                onChange={(e) => { setReceiptTitle(e.target.value); setReceiptTitleTouched(true); }}
                onBlur={() => setReceiptTitleTouched(true)}
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              />
              {receiptTitleTouched && !receiptTitle.trim() && <p className="mt-1 text-xs text-red-500">Le titre est requis</p>}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111111] mb-1">Date (optionnelle)</label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111111] mb-1">Document</label>
              {receiptFile ? (
                <div className="flex items-center gap-3 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-3">
                  <FileText className="h-5 w-5 text-[#3b82f6]" />
                  <span className="flex-1 truncate text-sm text-[#111111]">{receiptFile.name}</span>
                  <button
                    onClick={() => setReceiptFile(null)}
                    className="cursor-pointer text-sm text-[#ef4444] hover:underline"
                  >
                    Retirer 
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; }}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setReceiptFile(f); }}
                  onClick={() => document.getElementById('detail-receipt-file-input')?.click()}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-[8px] border-2 border-dashed border-[#d1d5db] p-4 text-center transition-colors hover:border-[#3b82f6]"
                >
                  <p className="text-xs text-[#6b7280]">Glissez-déposez un fichier ici</p>
                  <p className="text-xs text-[#9ca3af]">ou cliquez pour sélectionner</p>
                  <p className="mt-1 text-xs text-[#9ca3af]">PDF, JPG, PNG (max 10 Mo)</p>
                </div>
              )}
              <input
                id="detail-receipt-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setReceiptFile(f); }}
                className="hidden"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowReceiptModal(false); setReceiptFile(null); }} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button
                onClick={async () => {
                  if (!receiptFile) return;
                  setReceiptUploading(true);
                  try {
                    const formData = new FormData();
                    formData.append('file', receiptFile);
                    formData.append('title', receiptTitle);
                    if (receiptDate) formData.append('date', receiptDate);
                    await apiClient.post(`/invoices/${invoice.id}/receipt`, formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    toast.success('Accusé de réception enregistré');
                    queryClient.invalidateQueries({ queryKey: ['invoices', invoice.id] });
                    setShowReceiptModal(false);
                    setReceiptFile(null);
                  } catch (err: any) {
                    toast.error(err?.response?.data?.error?.message ?? "Erreur lors de l'envoi");
                  } finally {
                    setReceiptUploading(false);
                  }
                }}
                disabled={!receiptFile || !receiptTitle.trim() || receiptUploading}
                className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {receiptUploading ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSendReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
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
    </LoadingOverlay>
  );
}
