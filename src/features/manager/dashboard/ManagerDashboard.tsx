import { useState, useEffect } from 'react';
import { DollarSign, Bell, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardKPIs, useMonthlySummary, useAlerts, useUpdateAlertStatus } from '../../../hooks/manager/useTracking';
import { useTriggerPayout } from '../../../hooks/manager/usePayouts';
import { useSendReminder } from '../../../hooks/manager/useReminders';
import { useJobStatus } from '../../../hooks/manager/useJobStatus';
import { useInvoiceDetail } from '../../../hooks/manager/useInvoices';
import { validateInvoiceEmail, storeJob, clearJob } from '../../../utils/email';
import type { StoredJob } from '../../../utils/email';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../../../components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts';
import { SkeletonCard } from '../../../components/ui/skeleton';
import { toast } from 'sonner';
import { formatDate } from '../../../lib/utils';
import LoadingOverlay from '../../../components/common/LoadingOverlay';
import type { AlertItem } from '../../../types/manager';

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function ManagerDashboard() {
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: monthlySummary } = useMonthlySummary();
  const { data: alerts } = useAlerts();
  const updateStatus = useUpdateAlertStatus();
  const payoutMutation = useTriggerPayout();
  const sendReminderMutation = useSendReminder();

  const [payoutAlert, setPayoutAlert] = useState<AlertItem | null>(null);
  const [payoutMode, setPayoutMode] = useState<'DH' | '%'>('DH');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutComment, setPayoutComment] = useState('');
  const [reminderAlert, setReminderAlert] = useState<AlertItem | null>(null);

  const reminderInvoiceId = reminderAlert?.payload.entityType === 'INVOICE' ? reminderAlert.payload.entityId : null;
  const { data: invoiceDetail } = useInvoiceDetail(reminderInvoiceId);
  const payoutInvoiceId = payoutAlert?.payload.entityType === 'INVOICE' ? payoutAlert.payload.entityId : null;
  const { data: payoutInvoice } = useInvoiceDetail(payoutInvoiceId);
  const consultantPayoutRest = payoutInvoice?.data?.consultantPayoutRest ?? 0;

  const queryClient = useQueryClient();
  const [pendingJob, setPendingJob] = useState<StoredJob | null>(null);
  const jobStatusQuery = useJobStatus(pendingJob?.jobId ?? null);

  useEffect(() => {
    if (!jobStatusQuery.data || !pendingJob) return;
    const d = jobStatusQuery.data.data;
    if (d.status === 'COMPLETED') {
      toast.success('Relance envoyée avec succès');
      clearJob(pendingJob.jobId);
      setPendingJob(null);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } else if (d.status === 'FAILED') {
      toast.error(`Échec d'envoi : ${d.lastError ?? 'Erreur inconnue'}`, {
        action: {
          label: 'Réessayer',
          onClick: () => {
            sendReminderMutation.mutate(pendingJob.invoiceId, {
              onSuccess: (res) => {
                const j: StoredJob = { ...pendingJob, jobId: res.data.jobId };
                storeJob(j);
                setPendingJob(j);
                toast("Relance mise en file d'attente...");
              },
            });
          },
        },
      });
      clearJob(pendingJob.jobId);
      setPendingJob(null);
    }
  }, [jobStatusQuery.data, pendingJob, queryClient, sendReminderMutation]);

  const handleResolve = (id: number) => {
    updateStatus.mutate(
      { id, status: 'RESOLVED' },
      {
        onSuccess: () => toast.success('Alerte résolue'),
        onError: () => toast.error("Erreur lors de la résolution de l'alerte"),
      },
    );
  };

  const handlePayout = () => {
    if (!payoutAlert) return;
    if (payoutAlert.payload.entityType !== 'INVOICE') {
      toast.error("Impossible de déterminer la facture associée");
      return;
    }
    const invoiceId = payoutAlert.payload.entityId;
    const parsed = parseFloat(payoutAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }
    if (payoutMode === 'DH' && parsed > consultantPayoutRest) {
      toast.error("Le montant ne peut pas dépasser le restant dû");
      return;
    }
    const dhAmount = payoutMode === '%'
      ? Math.round(consultantPayoutRest * parsed / 100 * 100) / 100
      : parsed;
    payoutMutation.mutate(
      { invoiceId, amount: dhAmount, comment: payoutComment || undefined },
      {
        onSuccess: () => {
          toast.success('Paiement déclenché');
          setPayoutAlert(null);
          setPayoutAmount('');
          setPayoutComment('');
          handleResolve(payoutAlert.id);
        },
        onError: (err) => {
          const msg =
            (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
            "Erreur lors du paiement";
          toast.error(msg);
        },
      },
    );
  };

  const handleSendReminder = () => {
    if (!reminderAlert) return;
    if (!reminderInvoiceId) {
      toast.error("Impossible de déterminer la facture associée");
      return;
    }
    const email = invoiceDetail?.data?.client?.email;
    const error = validateInvoiceEmail(email);
    if (error) { toast.error(error); return; }
    toast("Relance mise en file d'attente...");
    sendReminderMutation.mutate(reminderInvoiceId, {
      onSuccess: (res) => {
        const job: StoredJob = { jobId: res.data.jobId, invoiceId: reminderInvoiceId, type: 'reminder', invoiceRef: `#${reminderInvoiceId}` };
        storeJob(job);
        setPendingJob(job);
        setReminderAlert(null);
        handleResolve(reminderAlert.id);
      },
      onError: (err) => {
        toast.error(
          (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
          "Erreur lors de l'envoi de la relance",
        );
      },
    });
  };

  const criticalAlerts = alerts?.critical?.filter((a) => a.status === 'ACTIVE') ?? [];

  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const summary = monthlySummary;
  const clients = summary?.clients ?? [];

  const chartConfig: ChartConfig = {};
  for (const c of clients) {
    chartConfig[c.clientName] = { label: c.clientName };
  }

  const isLoadingOverlay = updateStatus.isPending || payoutMutation.isPending;

  return (
    <LoadingOverlay isLoading={isLoadingOverlay}>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#111111]">
          Tableau de bord
        </h1>
        <p className="text-sm text-[#6b7280] mt-1 italic">Année: {new Date().getFullYear()}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpisLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : <>
              <div className="rounded-[12px] bg-white border border-[#e5e7eb] p-4 md:p-6">
                <p className="text-xs md:text-sm font-medium text-[#6b7280]">Factures en attente</p>
                <p className="mt-1 md:mt-2 text-lg md:text-3xl font-semibold text-[#111111]">{kpis?.pendingInvoices ?? 0}</p>
              </div>
              <div className="rounded-[12px] bg-white border border-[#e5e7eb] p-4 md:p-6">
                <p className="text-xs md:text-sm font-medium text-[#6b7280]">CA facturé (HT)</p>
                <p className="mt-1 md:mt-2 text-lg md:text-3xl font-semibold text-[#111111]">{(kpis?.totalPaid ?? 0).toLocaleString()} DH</p>
              </div>
              <div className="rounded-[12px] bg-white border border-[#e5e7eb] p-4 md:p-6">
                <p className="text-xs md:text-sm font-medium text-[#6b7280]">Encaissé (TTC)</p>
                <p className="mt-1 md:mt-2 text-lg md:text-3xl font-semibold text-[#111111]">{(kpis?.totalReceived ?? 0).toLocaleString()} DH</p>
              </div>
              <div className="rounded-[12px] bg-white border border-[#e5e7eb] p-4 md:p-6">
                <p className="text-xs md:text-sm font-medium text-[#6b7280]">En attente (TTC)</p>
                <p className="mt-1 md:mt-2 text-lg md:text-3xl font-semibold text-[#111111]">{(kpis?.totalPendingInvoices ?? 0).toLocaleString()} DH</p>
              </div>
            </>
        }
      </div>

      <div className="rounded-[12px] bg-[#fef2f2] p-4">
        <h2 className="text-lg font-semibold text-[#111111]">Alertes critiques</h2>
        {criticalAlerts.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b7280]">Aucune alerte critique</p>
        ) : (
          <div className="mt-4 space-y-3">
            {criticalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-3 gap-3"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#ef4444]" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#111111]">{alert.title}</p>
                      <p className="text-xs text-[#6b7280] break-words">{alert.message}</p>
                      <p className="mt-1 text-xs text-[#898989]">
                        {formatDate(alert.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {alert.payload.entityType === 'INVOICE' && (
                      <>
                        {alert.event === 'LATE_PAYOUT' && (
                          <button
                            onClick={() => {
                              setPayoutAlert(alert);
                setPayoutAmount('80');
                              setPayoutComment('');
                            }}
                            disabled={payoutMutation.isPending}
                            className="inline-flex items-center gap-1 cursor-pointer rounded-[8px] bg-[#ff0000] px-3 py-1.5 text-sm font-semibold text-[#ffffff] transition-opacity hover:opacity-40 disabled:opacity-50"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Payer le consultant</span>
                            <span className="md:hidden">Payer</span>
                          </button>
                        )}
                        {alert.event === 'LATE_INVOICE' && (
                          <button
                            onClick={() => setReminderAlert(alert)}
                            disabled={sendReminderMutation.isPending}
                            className="inline-flex items-center gap-1 cursor-pointer rounded-[8px] bg-[#ff0000] px-3 py-1.5 text-sm font-semibold text-[#ffffff] transition-opacity hover:opacity-40 disabled:opacity-50"
                          >
                            <Bell className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Envoyer une relance</span>
                            <span className="md:hidden">Relance</span>
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => handleResolve(alert.id)}
                      disabled={updateStatus.isPending}
                      className="cursor-pointer rounded-full border border-[#ef4444] p-1 text-[#ef4444] transition-colors hover:bg-[#fef2f2] disabled:opacity-40"
                      title="Résoudre"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>

      {clients.length > 0 && (
        <div className="rounded-[12px] bg-white p-4">
          <h2 className="text-lg font-semibold text-[#111111] mb-4">
            Répartition CA par client ({monthNames[(summary!.month || 1) - 1]} {summary!.year})
          </h2>
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <BarChart data={clients} margin={{ top: 8, left: 8, right: 8, bottom: 8 }}>
              <XAxis dataKey="clientName" tickLine={false} axisLine={false} tick={{ fontSize: 14 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
              <Bar dataKey="totalRevenue" radius={[4, 4, 0, 0]} maxBarSize={120}>
                {clients.map((_, idx) => (
                  <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      )}

      {payoutAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Payer le consultant</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Facture #{payoutAlert.payload.entityId}</p>

            <p className="mb-3 text-sm text-[#6b7280]">
              Reste à payer (TTC) : <span className="font-bold bg-green-500/20 px-4 py-1 rounded text-[#111111]">{consultantPayoutRest.toLocaleString()} DH</span>
            </p>

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
                    onClick={() => { setPayoutMode('DH'); setPayoutAmount(String(consultantPayoutRest)); }}
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
                  Montant calculé : {Math.round(consultantPayoutRest * parseFloat(payoutAmount) / 100 * 100) / 100} DH
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
              <button onClick={() => setPayoutAlert(null)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button
                onClick={handlePayout}
                disabled={payoutMutation.isPending || !payoutAmount || parseFloat(payoutAmount) <= 0 || parseFloat(payoutAmount) > (payoutMode === 'DH' ? consultantPayoutRest : 100)}
                className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-70 disabled:opacity-50"
              >
                {payoutMutation.isPending ? 'Traitement...' : 'Confirmer le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reminderAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Envoyer une relance</h2>
            <p className="mb-6 text-sm text-[#6b7280]">
              Envoyer une relance pour la facture #{reminderInvoiceId} à {invoiceDetail?.data?.client?.email ?? '...'}&nbsp;?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setReminderAlert(null)} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handleSendReminder} disabled={sendReminderMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-70 disabled:opacity-50">
                {sendReminderMutation.isPending ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </LoadingOverlay>
  );
}
