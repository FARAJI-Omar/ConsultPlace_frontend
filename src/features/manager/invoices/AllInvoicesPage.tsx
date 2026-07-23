import { useState, useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../../components/common/DataTable';
import { useInvoices, useMarkPaid, useDownloadPdf, useGenerateInvoice, useCancelInvoice, useEmailInvoice, useContractRates } from '../../../hooks/manager/useInvoices';
import { useTriggerPayout } from '../../../hooks/manager/usePayouts';
import { useSendReminder, useSetAutoReminder, useStopAutoReminder } from '../../../hooks/manager/useReminders';
import { useJobStatus } from '../../../hooks/manager/useJobStatus';
import { useManagerTimesheets } from '../../../hooks/manager/useManagerTimesheets';
import { useGetBdcsByMission } from '../../../hooks/useBdc';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import apiClient from '../../../lib/apiClient';
import LoadingOverlay from '../../../components/common/LoadingOverlay';
import { validateInvoiceEmail, storeJob, clearJob } from '../../../utils/email';
import type { StoredJob } from '../../../utils/email';
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
  const [clientFilter, setClientFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [generateModal, setGenerateModal] = useState(false);
  const [generateTimesheetId, setGenerateTimesheetId] = useState('');
  const [vatRate, setVatRate] = useState('20');
  const [selectedBdcIds, setSelectedBdcIds] = useState<number[]>([]);
  const [delai, setDelai] = useState('');
  const [appliedDailyRate, setAppliedDailyRate] = useState('');
  const [customRate, setCustomRate] = useState('');
  const [showCustomRate, setShowCustomRate] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState<number | null>(null);
  const [confirmMarkPaid, setConfirmMarkPaid] = useState<Invoice | null>(null);
  const [markPaidDate, setMarkPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [markPaidComment, setMarkPaidComment] = useState('');
  const [confirmSendReminder, setConfirmSendReminder] = useState<Invoice | null>(null);
  const [confirmStopReminder, setConfirmStopReminder] = useState<Invoice | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<Invoice | null>(null);
  const [confirmGenerate, setConfirmGenerate] = useState(false);

  const [payoutModal, setPayoutModal] = useState<Invoice | null>(null);
  const [payoutMode, setPayoutMode] = useState<'DH' | '%'>('DH');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutComment, setPayoutComment] = useState('');
  const [payoutConsultantId, setPayoutConsultantId] = useState<number | ''>('');
  const [reminderModal, setReminderModal] = useState<Invoice | null>(null);
  const [reminderFrequency, setReminderFrequency] = useState<'7' | '15' | '30'>('15');

  const monthParam = monthFilter ? monthFilter.replace('-', '/') : undefined;
  const { data, isLoading } = useInvoices(page, limit, statusFilter || undefined, clientFilter || undefined, monthParam);

  const { data: clientNames } = useQuery({
    queryKey: ['client-names'],
    queryFn: () =>
      apiClient.get<{ data: { id: number; raison_sociale: string }[] }>('/clients/names').then((r) => r.data.data),
  });
  const clientOptions = useMemo(
    () => (clientNames ?? []).map((c) => c.raison_sociale).sort((a, b) => a.localeCompare(b, 'fr')),
    [clientNames],
  );
  const validTimesheetsQuery = useManagerTimesheets(1, 1000, 'VALIDE');
  const { data: contractRates, isLoading: ratesLoading } = useContractRates(generateTimesheetId ? parseInt(generateTimesheetId, 10) : null);
  const markPaidMutation = useMarkPaid();
  const downloadPdfMutation = useDownloadPdf();
  const emailMutation = useEmailInvoice();
  const generateMutation = useGenerateInvoice();
  const cancelMutation = useCancelInvoice();
  const payoutMutation = useTriggerPayout();
  const sendReminderMutation = useSendReminder();
  const setAutoReminderMutation = useSetAutoReminder();
  const stopAutoReminderMutation = useStopAutoReminder();

  const validTimesheets = validTimesheetsQuery.data?.data ?? [];
  const selectedTimesheet = validTimesheets.find(ts => ts.id === parseInt(generateTimesheetId, 10));
  const missionId = selectedTimesheet?.mission.id;
  const timesheetDays = selectedTimesheet?.days ?? 0;

  const { data: bdcsData } = useGetBdcsByMission(missionId);
  const availableBdcs = (bdcsData ?? []).filter((b) => b.isActive || selectedBdcIds.includes(b.id));
  const sortedBdcs = [...availableBdcs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const selectedBdcTotalDays = availableBdcs
    .filter((b) => selectedBdcIds.includes(b.id))
    .reduce((sum, b) => sum + b.daysLeft, 0);
  const bdcWarning = selectedBdcIds.length > 0 && selectedBdcTotalDays < timesheetDays
    ? `Jours insuffisants : ${selectedBdcTotalDays} disponible(s) vs ${timesheetDays} requis`
    : '';

  const bdcBreakdown = useMemo(() => {
    const result: { bdc: string; days: number }[] = [];
    if (selectedBdcIds.length === 0 || !timesheetDays) return result;
    const selected = sortedBdcs.filter((b) => selectedBdcIds.includes(b.id));
    let remaining = timesheetDays;
    for (const b of selected) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, b.daysLeft);
      result.push({ bdc: b.bdc, days: take });
      remaining -= take;
    }
    return result;
  }, [sortedBdcs, selectedBdcIds, timesheetDays]);

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

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((s: number) => { setLimit(s); setPage(1); }, []);

  const handleMarkPaid = (invoice: Invoice, paymentDate: string) => {
    if (paymentDate < invoice.issueDate.split('T')[0]) {
      toast.error(`La date de paiement ne peut pas être antérieure à la date d'émission de la facture (${invoice.issueDate.split('T')[0]})`);
      return;
    }
    markPaidMutation.mutate(
      { invoiceId: invoice.id, paymentDate, comment: markPaidComment || undefined },
      {
        onSuccess: () => {
          toast.success(`Facture ${invoice.ref} marquée comme payée`);
          setConfirmMarkPaid(null);
          if (invoice.reminderFrequency) {
            stopAutoReminderMutation.mutate(invoice.id);
          }
        },
        onError: (err) => toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Erreur lors du marquage"),
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
    if (payoutMode === 'DH' && parsed > payoutBase) {
      toast.error("Le montant ne peut pas dépasser le restant dû");
      return;
    }
    const dhAmount = payoutMode === '%'
      ? Math.round(payoutBase * parsed / 100 * 100) / 100
      : parsed;
    payoutMutation.mutate(
      { invoiceId: payoutModal.id, consultantId: Number(payoutConsultantId) || undefined, amount: dhAmount, comment: payoutComment || undefined },
      {
        onSuccess: () => {
          toast.success(`Paiement déclenché pour ${payoutModal.ref}`);
          setPayoutModal(null);
          setPayoutAmount('');
          setPayoutComment('');
          setPayoutConsultantId('');
        },
        onError: (err) => {
          const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
          toast.error(axiosErr.response?.data?.error?.message ?? "Erreur lors du paiement");
        },
      },
    );
  };

  const handleEmailInvoice = (inv: Invoice) => {
    const error = validateInvoiceEmail(inv.client?.email);
    if (error) { toast.error(error); setConfirmEmail(null); return; }
    setConfirmEmail(null);
    toast("Email mis en file d'attente...");
    emailMutation.mutate(inv.id, {
      onSuccess: (res) => {
        const job: StoredJob = { jobId: res.data.jobId, invoiceId: inv.id, type: 'email', invoiceRef: inv.ref };
        storeJob(job);
        setPendingJob(job);
      },
      onError: (err) => {
        toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Erreur lors de l'envoi");
      },
    });
  };

  const handleSendReminder = (invoice: Invoice) => {
    const error = validateInvoiceEmail(invoice.client?.email);
    if (error) { toast.error(error); return; }
    toast("Relance mise en file d'attente...");
    sendReminderMutation.mutate(invoice.id, {
      onSuccess: (res) => {
        const job: StoredJob = { jobId: res.data.jobId, invoiceId: invoice.id, type: 'reminder', invoiceRef: invoice.ref };
        storeJob(job);
        setPendingJob(job);
        setConfirmSendReminder(null);
      },
      onError: (err) => {
        toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Erreur lors de l'envoi");
      },
    });
  };

  const handleSetAutoReminder = (invoice: Invoice) => {
    setReminderModal(invoice);
    setReminderFrequency('15');
  };

  const handleConfirmAutoReminder = () => {
    if (!reminderModal) return;
    const error = validateInvoiceEmail(reminderModal.client?.email);
    if (error) { toast.error(error); return; }
    setAutoReminderMutation.mutate(
      { invoiceId: reminderModal.id, payload: { frequency: parseInt(reminderFrequency, 10) as 7 | 15 | 30 } },
      {
        onSuccess: () => {
          toast.success(`Relance automatique configurée (${reminderFrequency} jours)`);
          setReminderModal(null);
        },
        onError: (err) => toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Erreur lors de la configuration"),
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
    const payload: Record<string, unknown> = { timesheetId: id, vatRate: parseFloat(vatRate) || 20 };
    const delaiNum = parseInt(delai, 10);
    if (!isNaN(delaiNum) && delaiNum > 0) payload.delai = delaiNum;
    const rateNum = showCustomRate ? parseFloat(customRate) : parseFloat(appliedDailyRate);
    if (!isNaN(rateNum) && rateNum > 0) payload.appliedDailyRate = rateNum;
    if (selectedBdcIds.length > 0) {
      payload.bdcAssignments = selectedBdcIds.map((bdcId) => ({ timesheetId: id, bdcId }));
    }
    generateMutation.mutate(
      payload as unknown as Parameters<typeof generateMutation.mutate>[0],
      {
        onSuccess: () => {
          toast.success('Facture générée avec succès');
          setGenerateModal(false);
          setConfirmGenerate(false);
          setGenerateTimesheetId('');
          setVatRate('20');
          setSelectedBdcIds([]);
          setDelai('');
          setAppliedDailyRate('');
          setCustomRate('');
          setShowCustomRate(false);
        },
        onError: (err: unknown) => {
          const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
          toast.error(axiosErr.response?.data?.error?.message ?? 'Erreur lors de la génération');
        },
      },
    );
  };

  // const cancelDisabled = (status: string) => status === 'PAID' || status === 'PARTIAL_PAID';

  const columns: Column<Invoice>[] = [
    { key: '#', label: '#', render: (_item, idx) => String(idx + 1) },
    { key: 'ref', label: 'Réf', render: (inv) => <Link to={`/manager/invoices/${inv.id}`} className="text-[#3b82f6] hover:underline">{inv.ref}</Link> },
    { key: 'month', label: 'Mois', render: (inv) => inv.months ? (
      <div className="flex flex-col text-gray-600 ">{inv.months.map((m, i) => <span key={`${m}-${i}`}>{m}</span>)}</div>
    ) : (inv.timesheet?.month ?? '-') },
    { key: 'client', label: 'Client', render: (inv) => (
      <span className="inline-block rounded-[6px] bg-[#EFF6FF] px-2.5 py-1 text-sm font-medium text-[#111111]">{inv.client?.raison_sociale ?? '-'}</span>
    ) },
    { key: 'consultant', label: 'Consultant', render: (inv) => {
      if (inv.consultantsPayouts && inv.consultantsPayouts.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {inv.consultantsPayouts.map((cp) => {
              const consultant = inv.consultants?.find((c) => c.id === cp.consultantId);
              const name = consultant?.name ?? `Consultant #${cp.consultantId}`;
              return (
                <span key={cp.consultantId} className="inline-block rounded-[6px] bg-[#ffea002e] px-2.5 py-1 text-sm font-medium text-[#111111]">
                  {name}
                </span>
              );
            })}
          </div>
        );
      }
      if (inv.consultantPayouts && inv.consultantPayouts.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {inv.consultantPayouts.map((cp) => {
              const consultant = inv.consultants?.find((c) => c.id === cp.consultantId);
              const name = consultant?.name ?? `Consultant #${cp.consultantId}`;
              return (
                <span key={cp.consultantId} className="inline-block rounded-[6px] bg-[#ffea002e] px-2.5 py-1 text-sm font-medium text-[#111111]">
                  {name}
                </span>
              );
            })}
          </div>
        );
      }
      return (
        <span className="inline-block rounded-[6px] bg-[#ffea002e] px-2.5 py-1 text-sm font-medium text-[#111111]">
          {inv.consultants?.map((c) => c.name).join(', ') ?? inv.consultant?.name ?? '-'}
        </span>
      );
    } },
    { key: 'amount', label: 'Montant HT', render: (inv) => `${(inv.amount ?? 0).toLocaleString()} DH` },
    { key: 'vat', label: 'TVA', render: (inv) => `${(inv.vat ?? 0).toLocaleString()} DH (${inv.vatRate ?? 0}%)` },
    { key: 'total', label: 'Total TTC', render: (inv) => `${(inv.total ?? 0).toLocaleString()} DH` },
    {
      key: 'status',
      label: 'Statut',
      render: (inv) => (
        <div>
          <div>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[inv.status] || 'bg-[#e5e7eb] text-[#6b7280]'}`}>
              {statusLabels[inv.status] || inv.status}
            </span>
          </div>
          {inv.daysLate != null && inv.daysLate >= 15 && (
            <div className="mt-0.5 text-left ml-1">
              {inv.status === 'PAID' ? (
                <span className="text-xs font-medium text-[#10b981]">+{inv.daysLate} j</span>
              ) : inv.status === 'PENDING' || inv.status === 'PARTIAL_PAID' ? (
                <span className="text-xs font-medium text-[#ef4444]">en retard {inv.daysLate}j</span>
              ) : null}
            </div>
          )}
        </div>
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
              className="cursor-pointer rounded-[8px] border border-[#bdbdbd] bg-[#ffffff] px-2 py-1 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db]"
            >
              Marquer payée
            </button>
          )}
          {(inv.consultantPayoutRest ?? 0) <= 0
            ? (
              <span className="inline-flex items-center rounded-[8px] bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                Le consultant est rémunéré.
              </span>
            )
            : (
              <button
                onClick={() => setPayoutModal(inv)}
                disabled={payoutMutation.isPending}
                className="cursor-pointer rounded-[8px] border border-[#bdbdbd] bg-[#ffffff] px-2 py-1 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db]"
              >
                Payer consultant
              </button>
            )}
          <button
            onClick={() => handleDownloadPdf(inv.id)}
            disabled={downloadPdfMutation.isPending}
            className="cursor-pointer rounded-[8px] border border-[#bdbdbd] bg-[#ffffff] px-2 py-1 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db]"
          >
            Télécharger PDF
          </button>
          {inv.status !== 'CANCELED' && (
            <button
              onClick={() => setConfirmEmail(inv)}
              disabled={emailMutation.isPending}
              className={`group cursor-pointer rounded-[8px] border border-[#bdbdbd] bg-[#ffffff] px-2 py-1 text-xs font-medium transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db] ${inv.isSent ? 'text-green-500' : 'text-[#111111]'}`}
            >
              <span className="group-hover:hidden">{inv.isSent ? 'Facture envoyée' : 'Envoyer facture par email'}</span>
              <span className="hidden group-hover:inline">{inv.isSent ? 'Renvoyer l\'email' : 'Envoyer facture par email'}</span>
            </button>
          )}
          {(inv.status === 'PENDING' || inv.status === 'PARTIAL_PAID') && (
            <>
              <button
                onClick={() => setConfirmSendReminder(inv)}
                disabled={sendReminderMutation.isPending}
                className="cursor-pointer rounded-[8px] border border-[#bdbdbd] bg-[#ffffff] px-2 py-1 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db]"
              >
                Envoyer relance
              </button>
              {inv.reminderFrequency ? (
                <button
                  onClick={() => setConfirmStopReminder(inv)}
                  disabled={stopAutoReminderMutation.isPending}
                  className="cursor-pointer rounded-[8px] border border-[#bdbdbd] bg-[#ffffff] px-2 py-1 text-xs font-medium text-[#ef4444] transition-colors hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:text-[#d1d5db]"
                >
                  Arrêter relance auto
                </button>
              ) : (
                <button
                  onClick={() => handleSetAutoReminder(inv)}
                  disabled={setAutoReminderMutation.isPending}
                  className="cursor-pointer rounded-[8px] border border-[#bdbdbd] bg-[#ffffff] px-2 py-1 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db]"
                >
                  Relance auto
                </button>
              )}
            </>
          )}
          {/* {inv.status !== 'CANCELED' && (
            <button
              onClick={() => setCancelConfirm(inv.id)}
              disabled={cancelDisabled(inv.status)}
              className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-2 py-1 text-xs font-medium text-[#ef4444] transition-colors hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:text-[#d1d5db]"
            >
              Annuler
            </button>
          )} */}
        </div>
      ),
    },
  ];

  return (
    <LoadingOverlay isLoading={markPaidMutation.isPending || payoutMutation.isPending || generateMutation.isPending || cancelMutation.isPending || downloadPdfMutation.isPending || setAutoReminderMutation.isPending || stopAutoReminderMutation.isPending}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-[#6b7280]">Statut</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="">Tous</option>
            <option value="PENDING">En attente</option>
            <option value="PARTIAL_PAID">Partiellement payé</option>
            <option value="PAID">Payé</option>
            <option value="CANCELED">Annulé</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-[#6b7280]">Client</label>
          <select
            value={clientFilter}
            onChange={(e) => { setClientFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] min-w-[180px]"
          >
            <option value="">Tous les clients</option>
            {clientOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-[#6b7280]">Mois</label>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setGenerateModal(true)}
          className="cursor-pointer rounded-[8px] bg-[#003ea8] px-4 py-2 text-sm font-medium text-[#ffffff] transition-colors hover:bg-[#2563eb]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Générer une facture</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">Relevé validé <span className='text-gray-400 text-xs'>(mois | consultant | mission)</span></label>
                <select
                  value={generateTimesheetId}
                  onChange={(e) => {
                    setGenerateTimesheetId(e.target.value);
                    setSelectedBdcIds([]);
                    setAppliedDailyRate('');
                    setCustomRate('');
                    setShowCustomRate(false);
                  }}
                  className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                >
                  <option value="">Sélectionner un Relevé</option>
                  {validTimesheets.map((ts) => (
                    <option key={ts.id} value={ts.id}>
                      {ts.month} | {ts.consultant.name} | {ts.mission.title}
                    </option>
                  ))}
                </select>
              </div>
              {generateTimesheetId && (
                <div className="rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] p-3">
                  <label className="block text-sm font-medium text-[#111111] mb-2">Taux journalier appliqué <span className="text-xs text-[#6b7280]">(Contrat)</span></label>
                  {ratesLoading ? (
                    <p className="text-xs text-[#6b7280]">Chargement...</p>
                  ) : contractRates ? (
                    <div className="space-y-1">
                      <label className={`flex items-center gap-2 cursor-pointer rounded-[6px] border px-3 py-2 transition-colors ${!showCustomRate && appliedDailyRate === '' ? 'border-primary-blue bg-[#EFF6FF]' : 'border-[#e5e7eb] bg-[#ffffff] hover:bg-[#f3f4f6]'}`}>
                        <input
                          type="radio"
                          name="dailyRate"
                          checked={!showCustomRate && appliedDailyRate === ''}
                          onChange={() => { setAppliedDailyRate(''); setShowCustomRate(false); }}
                          className="cursor-pointer"
                        />
                        <span className="text-sm text-[#111111]">Taux actuel (contrat) — {contractRates.currentDailyRate.toLocaleString('fr-FR')} DH</span>
                      </label>
                      {contractRates.oldDailyRate > 0 && contractRates.oldDailyRate !== contractRates.currentDailyRate && (
                        <label className={`flex items-center gap-2 cursor-pointer rounded-[6px] border px-3 py-2 transition-colors ${!showCustomRate && appliedDailyRate === String(contractRates.oldDailyRate) ? 'border-primary-blue bg-[#EFF6FF]' : 'border-[#e5e7eb] bg-[#ffffff] hover:bg-[#f3f4f6]'}`}>
                          <input
                            type="radio"
                            name="dailyRate"
                            checked={!showCustomRate && appliedDailyRate === String(contractRates.oldDailyRate)}
                            onChange={() => { setAppliedDailyRate(String(contractRates.oldDailyRate)); setShowCustomRate(false); }}
                            className="cursor-pointer"
                          />
                          <span className="text-sm text-[#111111]">Taux initial — {contractRates.oldDailyRate.toLocaleString('fr-FR')} DH</span>
                        </label>
                      )}
                      <label className={`flex items-center gap-2 cursor-pointer rounded-[6px] border px-3 py-2 transition-colors ${showCustomRate ? 'border-primary-blue bg-[#EFF6FF]' : 'border-[#e5e7eb] bg-[#ffffff] hover:bg-[#f3f4f6]'}`}>
                        <input
                          type="radio"
                          name="dailyRate"
                          checked={showCustomRate}
                          onChange={() => { setShowCustomRate(true); setAppliedDailyRate(''); }}
                          className="cursor-pointer"
                        />
                        <span className="text-sm text-[#111111]">Autre</span>
                      </label>
                      {showCustomRate && (
                        <input
                          type="number"
                          value={customRate}
                          onChange={(e) => setCustomRate(e.target.value)}
                          placeholder="Saisir un montant"
                          className="mt-1 w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                        />
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="number"
                        value={customRate}
                        onChange={(e) => setCustomRate(e.target.value)}
                        placeholder="Saisir un montant (facultatif)"
                        className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                      />
                      <p className="mt-1 text-xs text-[#6b7280]">Laissez vide pour utiliser le taux actuel du contrat</p>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">TVA (%)</label>
                <input
                  type="number"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  autoComplete="off"
                  className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">Délai (en jours)</label>
                <input
                  type="number"
                  value={delai}
                  onChange={(e) => setDelai(e.target.value)}
                  min="0"
                  placeholder="Facultatif"
                  autoComplete="off"
                  className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>
              {generateTimesheetId && (
                <div>
                  <label className="block text-sm font-medium text-[#111111] mb-1">Bons de commande (facultatif)</label>
                  {availableBdcs.length === 0 ? (
                    <p className="text-xs text-[#6b7280]">Aucun BDC disponible pour cette mission</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {sortedBdcs.map((bdc, idx) => {
                        const isSelected = selectedBdcIds.includes(bdc.id);
                        const remainingPct = bdc.totalDays > 0 ? Math.round((bdc.daysLeft / bdc.totalDays) * 100) : 0;
                        return (
                          <div
                            key={bdc.id}
                            onClick={() => {
                              setSelectedBdcIds((prev) =>
                                isSelected ? prev.filter((id) => id !== bdc.id) : [...prev, bdc.id],
                              );
                            }}
                            className={`cursor-pointer rounded-[6px] border p-2 transition-colors ${
                              isSelected ? 'border-primary-blue bg-[#EFF6FF]' : 'border-[#e5e7eb] bg-[#ffffff] hover:bg-[#f9fafb]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="h-4 w-4 cursor-pointer accent-primary-blue"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-[#111111]">{bdc.bdc}</p>
                                <p className="text-xs text-[#6b7280]">{bdc.daysLeft} / {bdc.totalDays} jours restants</p>
                              </div>
                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-500 text-[10px] font-bold text-blue-500">
                                {idx + 1}
                              </span>
                              <div className="h-1.5 w-12 rounded-full bg-[#e5e7eb]">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    remainingPct > 50 ? 'bg-[#10b981]' : remainingPct > 20 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
                                  }`}
                                  style={{ width: `${remainingPct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {bdcWarning && (
                    <p className="mt-2 text-xs text-[#f59e0b]">{bdcWarning}</p>
                  )}
                  {selectedBdcIds.length > 0 && !bdcWarning && (
                    <p className="mt-2 text-xs text-[#10b981]">
                      {selectedBdcTotalDays} jours disponibles sur {timesheetDays} requis
                    </p>
                  )}
                  {selectedBdcIds.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {bdcBreakdown.filter((b) => b.days > 0).map((b) => (
                        <p key={b.bdc} className="text-xs text-[#6b7280]">
                          {b.days} jours consommés du {b.bdc}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
                disabled={generateMutation.isPending || !generateTimesheetId || !!bdcWarning}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Payer le consultant</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Facture {payoutModal.ref}</p>

            <p className="mb-3 text-sm text-[#6b7280]">
              Reste à payer (TTC) : <span className="font-bold bg-green-500/20 px-4 py-1 rounded text-[#111111]">{(payoutModal.consultantPayoutRest ?? 0).toLocaleString()} DH</span>
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
                    : payoutModal.consultantPayouts?.map((cp) => {
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
              <label className="block text-sm font-medium text-[#111111] mb-1">Commentaire (optionnel)</label>
              <textarea
                value={payoutComment}
                onChange={(e) => setPayoutComment(e.target.value)}
                rows={2}
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] resize-none"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setPayoutModal(null); setPayoutComment(''); setPayoutConsultantId(''); }} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handlePayout} disabled={payoutMutation.isPending || !payoutAmount || parseFloat(payoutAmount) <= 0 || parseFloat(payoutAmount) > (payoutMode === 'DH' ? payoutBase : 100)} className="cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {payoutMutation.isPending ? 'Traitement...' : 'Confirmer le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Marquer comme payée</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Confirmer que la facture {confirmMarkPaid.ref} est payée&nbsp;?</p>
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
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => {
                setConfirmMarkPaid(null);
                setMarkPaidDate(new Date().toISOString().split('T')[0]);
                setMarkPaidComment('');
              }} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={() => handleMarkPaid(confirmMarkPaid, markPaidDate)} disabled={markPaidMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {markPaidMutation.isPending ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSendReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
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

      {confirmEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">{confirmEmail.isSent ? 'Renvoyer par email' : 'Envoyer par email'}</h2>
            <p className="mb-6 text-sm text-[#6b7280]">Envoyer {confirmEmail.ref} à {confirmEmail.client?.email ?? 'aucun email'}&nbsp;?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmEmail(null)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={() => handleEmailInvoice(confirmEmail)} disabled={emailMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {emailMutation.isPending ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Générer la facture</h2>
            <p className="mb-6 text-sm text-[#6b7280]">Créer une facture pour {selectedTimesheet ? `${selectedTimesheet.month} | ${selectedTimesheet.consultant.name} | ${selectedTimesheet.mission.title}` : `Relevé n°${generateTimesheetId}`} avec TVA à {vatRate}%{selectedBdcIds.length > 0 ? `, BDCs: ${selectedBdcIds.length} sélectionné(s)` : ''}{delai.trim() ? `, délai: ${delai.trim()} jours` : ''}&nbsp;?</p>
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
    </LoadingOverlay>
  );
}
