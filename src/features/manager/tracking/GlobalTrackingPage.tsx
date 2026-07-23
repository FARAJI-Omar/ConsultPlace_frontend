import { useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Eye, FileDown, MoreVertical } from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import { DataTable } from '../../../components/common/DataTable';
import { useGlobalTracking, exportTrackingCSV } from '../../../hooks/manager/useAdvancedTracking';
import { useMarkPaid, useEmailInvoice, useInvoiceDetail } from '../../../hooks/manager/useInvoices';
import { useSendReminder } from '../../../hooks/manager/useReminders';
import { useTriggerPayout } from '../../../hooks/manager/usePayouts';
import { useJobStatus } from '../../../hooks/manager/useJobStatus';
import { validateInvoiceEmail, storeJob, clearJob } from '../../../utils/email';
import type { StoredJob } from '../../../utils/email';
import apiClient from '../../../lib/apiClient';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Column } from '../../../components/common/DataTable';
import type { TrackingRow } from '../../../types/manager';

const statusOptions = [
  { value: '', label: 'Tous' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'PARTIAL_PAID', label: 'Partiellement payé' },
  { value: 'PAID', label: 'Payé' },
  { value: 'CANCELED', label: 'Annulé' },
];

const currentYear = new Date().getFullYear();

const periodeOptions = [
  { value: '', label: 'Toute période' },
  { value: 'Q1', label: `Q1 ${currentYear}` },
  { value: 'Q2', label: `Q2 ${currentYear}` },
  { value: 'Q3', label: `Q3 ${currentYear}` },
  { value: 'Q4', label: `Q4 ${currentYear}` },
  { value: '3M', label: '3 derniers mois' },
  { value: 'CUSTOM', label: 'Personnalisée' },
];

function computeDateRange(
  periode: string,
  customStart: string,
  customEnd: string,
): { startDate?: string; endDate?: string } {
  const year = currentYear;
  switch (periode) {
    case 'Q1':
      return {
        startDate: `${year}-01-01T00:00:00.000Z`,
        endDate: `${year}-03-31T23:59:59.000Z`,
      };
    case 'Q2':
      return {
        startDate: `${year}-04-01T00:00:00.000Z`,
        endDate: `${year}-06-30T23:59:59.000Z`,
      };
    case 'Q3':
      return {
        startDate: `${year}-07-01T00:00:00.000Z`,
        endDate: `${year}-09-30T23:59:59.000Z`,
      };
    case 'Q4':
      return {
        startDate: `${year}-10-01T00:00:00.000Z`,
        endDate: `${year}-12-31T23:59:59.000Z`,
      };
    case '3M': {
      const now = new Date();
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return {
        startDate: threeMonthsAgo.toISOString(),
        endDate: now.toISOString(),
      };
    }
    case 'CUSTOM': {
      const result: Record<string, string> = {};
      if (customStart) {
        const [sd, sm, sy] = customStart.split('/');
        result.startDate = `${sy}-${sm}-${sd}T00:00:00.000Z`;
      }
      if (customEnd) {
        const [ed, em, ey] = customEnd.split('/');
        result.endDate = `${ey}-${em}-${ed}T23:59:59.000Z`;
      }
      return result;
    }
    default:
      return {};
  }
}

export default function GlobalTrackingPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [periodeFilter, setPeriodeFilter] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const [exporting, setExporting] = useState(false);
  const [detailRow, setDetailRow] = useState<TrackingRow | null>(null);
  const [openMenu, setOpenMenu] = useState<{ rowId: number; x: number; y: number } | null>(null);
  const { data: menuInvoiceRes } = useInvoiceDetail(openMenu?.rowId ?? null);
  const menuInvoice = menuInvoiceRes?.data ?? null;

  const [actionType, setActionType] = useState<'markPaid' | 'email' | 'reminder' | 'payout' | null>(null);
  const [actionInvoiceId, setActionInvoiceId] = useState<number | null>(null);
  const { data: actionInvoiceRes } = useInvoiceDetail(actionInvoiceId);
  const actionInvoice = actionInvoiceRes?.data ?? null;

  const [markPaidDate, setMarkPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [markPaidComment, setMarkPaidComment] = useState('');
  const [payoutMode, setPayoutMode] = useState<'DH' | '%'>('DH');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutComment, setPayoutComment] = useState('');
  const [payoutConsultantId, setPayoutConsultantId] = useState<number | ''>('');
  const [pendingJob, setPendingJob] = useState<StoredJob | null>(null);

  const queryClient = useQueryClient();
  const markPaidMutation = useMarkPaid();
  const emailMutation = useEmailInvoice();
  const sendReminderMutation = useSendReminder();
  const payoutMutation = useTriggerPayout();
  const jobStatusQuery = useJobStatus(pendingJob?.jobId ?? null);

  useEffect(() => {
    if (!jobStatusQuery.data || !pendingJob) return;
    const d = jobStatusQuery.data.data;
    if (d.status === 'COMPLETED') {
      toast.success(pendingJob.type === 'email' ? 'Email envoyé avec succès' : 'Relance envoyée avec succès');
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

  const closeActionModal = () => {
    setActionType(null);
    setActionInvoiceId(null);
    setMarkPaidDate(new Date().toISOString().split('T')[0]);
    setMarkPaidComment('');
    setPayoutAmount('');
    setPayoutComment('');
    setPayoutConsultantId('');
  };

  const handleMarkPaid = () => {
    if (!actionInvoice) return;
    if (markPaidDate < actionInvoice.issueDate.split('T')[0]) {
      toast.error(`La date de paiement ne peut pas être antérieure à la date d'émission de la facture (${actionInvoice.issueDate.split('T')[0]})`);
      return;
    }
    markPaidMutation.mutate(
      { invoiceId: actionInvoice.id, paymentDate: markPaidDate, comment: markPaidComment || undefined },
      {
        onSuccess: () => {
          queryClient.setQueriesData({ queryKey: ['tracking-global'] }, (old: { data: TrackingRow[] } | undefined) => {
            if (!old) return old;
            return { ...old, data: old.data.map((r) => r.id === actionInvoice.id ? {
              ...r,
              status: 'PAID',
              clientStatus: 'PAID',
              paymentDate: markPaidDate,
              consultantStatus: r.grouped ? r.consultants.map(() => 'PAYE') : 'PAYE',
              consultants: r.consultants.map((c) => ({ ...c, consultantStatus: 'PAYE' })),
            } : r) };
          });
          queryClient.invalidateQueries({ queryKey: ['tracking-global'] });
          toast.success(`Facture ${actionInvoice.ref} marquée comme payée`);
          closeActionModal();
        },
        onError: (err) => toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Erreur lors du marquage"),
      },
    );
  };

  const handleEmailInvoice = () => {
    if (!actionInvoice) return;
    const error = validateInvoiceEmail(actionInvoice.client?.email);
    if (error) { toast.error(error); closeActionModal(); return; }
    closeActionModal();
    toast("Email mis en file d'attente...");
    emailMutation.mutate(actionInvoice.id, {
      onSuccess: (res) => {
        queryClient.setQueriesData({ queryKey: ['tracking-global'] }, (old: { data: TrackingRow[] } | undefined) => {
          if (!old) return old;
          return { ...old, data: old.data.map((r) => r.id === actionInvoice.id ? { ...r, isSent: true } : r) };
        });
        queryClient.invalidateQueries({ queryKey: ['tracking-global'] });
        const job: StoredJob = { jobId: res.data.jobId, invoiceId: actionInvoice.id, type: 'email', invoiceRef: actionInvoice.ref };
        storeJob(job);
        setPendingJob(job);
      },
      onError: (err) => {
        toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Erreur lors de l'envoi");
      },
    });
  };

  const handleSendReminder = () => {
    if (!actionInvoice) return;
    const error = validateInvoiceEmail(actionInvoice.client?.email);
    if (error) { toast.error(error); closeActionModal(); return; }
    closeActionModal();
    toast("Relance mise en file d'attente...");
    sendReminderMutation.mutate(actionInvoice.id, {
      onSuccess: (res) => {
        const job: StoredJob = { jobId: res.data.jobId, invoiceId: actionInvoice.id, type: 'reminder', invoiceRef: actionInvoice.ref };
        storeJob(job);
        setPendingJob(job);
      },
      onError: (err) => {
        toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Erreur lors de l'envoi");
      },
    });
  };

  const payoutRest = actionInvoice?.consultantPayoutRest ?? 0;
  const payoutBase = actionInvoice?.consultantsPayouts && payoutConsultantId
    ? (actionInvoice.consultantsPayouts.find((cp) => cp.consultantId === payoutConsultantId)?.rest ?? payoutRest)
    : actionInvoice?.consultantPayouts && payoutConsultantId
      ? (actionInvoice.consultantPayouts.find((cp) => cp.consultantId === payoutConsultantId)?.payoutAmount ?? payoutRest)
      : payoutRest;

  const handlePayout = () => {
    if (!actionInvoice) return;
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
      { invoiceId: actionInvoice.id, consultantId: Number(payoutConsultantId) || undefined, amount: dhAmount, comment: payoutComment || undefined },
      {
        onSuccess: () => {
          const isFullyPaid = dhAmount >= payoutBase;
          const paidConsultantId = Number(payoutConsultantId) || undefined;
          queryClient.setQueriesData({ queryKey: ['tracking-global'] }, (old: { data: TrackingRow[] } | undefined) => {
            if (!old) return old;
            return { ...old, data: old.data.map((r) => {
              if (r.id !== actionInvoice.id) return r;
              if (isFullyPaid && paidConsultantId) {
                return {
                  ...r,
                  consultantStatus: r.grouped ? r.consultants.map((c) => c.consultantId === paidConsultantId ? 'PAYE' : c.consultantStatus) : 'PAYE',
                  consultants: r.consultants.map((c) => c.consultantId === paidConsultantId ? { ...c, consultantStatus: 'PAYE' } : c),
                };
              }
              return {
                ...r,
                consultantStatus: r.grouped ? r.consultants.map((c) => c.consultantId === paidConsultantId ? 'PARTIAL_PAID' : c.consultantStatus) : 'PARTIAL_PAID',
                consultants: r.consultants.map((c) => c.consultantId === paidConsultantId ? { ...c, consultantStatus: 'PARTIAL_PAID' } : c),
              };
            }) };
          });
          queryClient.invalidateQueries({ queryKey: ['tracking-global'] });
          toast.success(`Paiement déclenché pour ${actionInvoice.ref}`);
          closeActionModal();
        },
        onError: (err) => {
          const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
          toast.error(axiosErr.response?.data?.error?.message ?? "Erreur lors du paiement");
        },
      },
    );
  };

  const openAction = (type: typeof actionType, rowId: number) => {
    setOpenMenu(null);
    setActionType(type);
    setActionInvoiceId(rowId);
  };

  useEffect(() => {
    if (detailRow) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [detailRow]);

  useEffect(() => {
    if (openMenu === null) return;
    const close = () => setOpenMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenu]);

  useEffect(() => {
    if (!openMenu) return;
    const el = document.querySelector(`[data-menu-for="${openMenu.rowId}"]`);
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      setOpenMenu((prev) => prev?.rowId === openMenu.rowId ? { ...prev, x: rect.right, y: rect.bottom + 4 } : prev);
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [openMenu]);

  const dateRange = useMemo(
    () => computeDateRange(periodeFilter, customStart, customEnd),
    [periodeFilter, customStart, customEnd],
  );

  const { data, isLoading } = useGlobalTracking(page, limit, {
    status: statusFilter || undefined,
    client: clientFilter || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    sort,
  });

  const { data: clientNames } = useQuery({
    queryKey: ['client-names'],
    queryFn: () =>
      apiClient.get<{ data: { id: number; raison_sociale: string }[] }>('/clients/names').then((r) => r.data.data),
  });

  const clientOptions = useMemo(
    () => (clientNames ?? []).map((c) => c.raison_sociale).sort((a, b) => a.localeCompare(b, 'fr')),
    [clientNames],
  );

  const handlePageChange = useCallback((p: number) => { setOpenMenu(null); setPage(p); }, []);
  const handlePageSizeChange = useCallback((s: number) => { setOpenMenu(null); setLimit(s); setPage(1); }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportTrackingCSV({
        status: statusFilter || undefined,
        client: clientFilter || undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        sort,
      });
      toast.success('Export CSV démarré');
    } catch {
      toast.error("Erreur lors de l'export CSV");
    } finally {
      setExporting(false);
    }
  };

  const consultantStatusLabels: Record<string, string> = {
    PAYE: 'Payé',
    PARTIAL_PAID: 'Partiellement payé',
  };

  const consultantStatusBadge: Record<string, string> = {
    PAYE: 'bg-[#d1fae5] text-[#10b981]',
    PARTIAL_PAID: 'bg-[#ffedd5] text-[#f97316]',
  };

  const clientStatusLabels: Record<string, string> = {
    PENDING: 'En attente',
    PARTIAL_PAID: 'Partiellement payé',
    PAID: 'Payé',
    CANCELED: 'Annulé',
  };

  const clientStatusBadge: Record<string, string> = {
    PENDING: 'bg-[#fef3c7] text-[#f59e0b]',
    PARTIAL_PAID: 'bg-[#ffedd5] text-[#f97316]',
    PAID: 'bg-[#d1fae5] text-[#10b981]',
    CANCELED: 'bg-[#e5e7eb] text-[#6b7280]',
  };

  const columns: Column<TrackingRow>[] = [
    { key: '#', label: '#', render: (_item, idx) => String(idx + 1) },
    { key: 'month', label: 'Mois', render: (r) => Array.isArray(r.month) ? r.month.join(', ') : (r.month ?? '—') },
    { key: 'client', label: 'Client', render: (r) => <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#eff6ff] text-[#3b82f6]">{r.client ?? '—'}</span> },
    { key: 'consultant', label: 'Consultant', render: (r) => {
      const names = Array.isArray(r.consultant) ? r.consultant : [r.consultant];
      return (
        <div className="flex flex-wrap gap-1">
          {names.map((n, i) => (
            <span key={i} className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#f5f3ff] text-[#7c3aed]">{n}</span>
          ))}
        </div>
      );
    } },
    { key: 'mission', label: 'Mission', render: (r) => {
      const missions = Array.isArray(r.mission) ? r.mission : [r.mission];
      return (
        <div className="flex flex-wrap gap-1">
          {missions.map((m, i) => (
            <span key={i} className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-[#0073d8]">{m}</span>
          ))}
        </div>
      );
    } },
    { key: 'timesheetIds', label: 'Relevé ID', render: (r) => {
      const ids = r.timesheetIds ?? [];
      return (
        <div className="flex flex-wrap gap-1">
          {ids.map((id) => (
            <Link key={id} to={`/manager/timesheets/${id}`} className="inline-block rounded-[6px] border border-[#3b82f6] px-2.5 py-1 text-xs font-medium text-[#3b82f6] hover:bg-[#0055ff2c]">
              #{id}
            </Link>
          ))}
        </div>
      );
    } },
    { key: 'days', label: 'Jours', render: (r) => {
      const daysList = Array.isArray(r.days) ? r.days : [r.days];
      return (
        <div className="flex flex-wrap gap-1">
          {daysList.map((d, i) => (
            <span key={i} className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-[#15803d]">{d}</span>
          ))}
        </div>
      );
    } },
    { key: 'bdcs', label: <>BDC <span className="normal-case text-xs">(consommé/total)</span></>, render: (r) => {
      const timesheetIds = new Set(r.timesheetIds ?? []);
      const seen = new Set<number>();
      const usedBdcs = (r.bdcs ?? []).filter((b) => {
        if (!timesheetIds.has(b.timesheetId)) return false;
        if (seen.has(b.id)) return false;
        if (b.consumedDays === 0) return false;
        seen.add(b.id);
        return true;
      });
      return usedBdcs.length === 0 ? (
        <span className="text-xs text-[#6b7280]">—</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {usedBdcs.map((b) => (
            <Link
              key={b.id}
              to={`/manager/bons-de-commande/${b.id}`}
              className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#f0fdf4] text-[#15803d] hover:bg-[#d1fae5] transition-colors"
            >
              {b.bdc} ({b.consumedDays}/{b.totalDays})
            </Link>
          ))}
        </div>
      );
    } },
    { key: 'invoiceRef', label: 'Facture', render: (r) => r.invoiceRef ? <Link to={`/manager/invoices/${r.id}`} className="inline-block rounded-full px-2.5 py-0.5 text-sm font-medium text-[#3b82f6] hover:bg-[#0060f910] transition-colors">{r.invoiceRef}</Link> : '—' },
    { key: 'total', label: 'TTC', render: (r) => `${(r.total ?? 0).toLocaleString()} DH` },
    {
      key: 'clientStatus',
      label: 'Statut Client',
      render: (r) => {
        if (r.clientStatus === 'late') {
          const due = new Date(r.dueDate);
          const today = new Date();
          const lateDays = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()) / (1000 * 60 * 60 * 24));
          return <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#fef2f2] text-[#ef4444]">En retard (+{lateDays} j)</span>;
        }
        const isLate = r.clientStatus !== 'PAID' && r.clientStatus !== 'CANCELED' && r.dueDate && new Date(r.dueDate).toDateString() < new Date().toDateString();
        if (isLate) {
          const due = new Date(r.dueDate);
          const today = new Date();
          const lateDays = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()) / (1000 * 60 * 60 * 24));
          if (lateDays >= 15) {
            return <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#fef2f2] text-[#ef4444]">En retard (+{lateDays} j)</span>;
          }
        }
        return (
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${clientStatusBadge[r.clientStatus] || 'bg-[#e5e7eb] text-[#6b7280]'}`}>
            {clientStatusLabels[r.clientStatus] ?? r.clientStatus}
          </span>
        );
      },
    },
    {
      key: 'consultantStatus',
      label: 'Statut Consultant',
      render: (r) => {
        const items = r.grouped
          ? r.consultants.map((c) => c.consultantStatus)
          : [r.consultantStatus as string];
        return (
          <div className="flex flex-col items-start gap-1">
            {items.map((s, i) => (
              <span key={i} className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${consultantStatusBadge[s] || 'bg-[#fef3c7] text-[#f59e0b]'}`}>
                {consultantStatusLabels[s] ?? 'Pas encore'}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex gap-1.5 items-center">
          <button
            data-menu-for={r.id}
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setOpenMenu(openMenu?.rowId === r.id ? null : { rowId: r.id, x: rect.right, y: rect.bottom + 4 });
            }}
            className="cursor-pointer rounded-[8px] border border-[#bdbdbd] bg-[#ffffff] p-1.5 text-[#111111] transition-colors hover:bg-[#f3f4f6]"
          >
            <MoreVertical size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDetailRow(r); }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] border border-[#bdbdbd] bg-[#ffffff] px-3 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
          >
            <Eye size={14} className="md:hidden" />
            <span className="hidden md:inline">Détail</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111111]">Suivi global</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] bg-red-400 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 hover:bg-red-500 disabled:hover:bg-red-400"
        >
          {exporting ? 'Exportation...' : <><FileDown size={16} className="md:hidden" /><span className="hidden md:inline">Exporter CSV</span></>}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b7280]">Statut</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b7280]">Client</label>
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
          <label className="text-xs font-medium text-[#6b7280]">Période</label>
          <select
            value={periodeFilter}
            onChange={(e) => { setPeriodeFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            {periodeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {periodeFilter === 'CUSTOM' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6b7280]">De (jj/mm/aaaa)</label>
              <input
                type="text"
                placeholder="jj/mm/aaaa"
                value={customStart}
                onChange={(e) => { setCustomStart(e.target.value); setPage(1); }}
                autoComplete="off"
                className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] w-[150px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6b7280]">À (jj/mm/aaaa)</label>
              <input
                type="text"
                placeholder="jj/mm/aaaa"
                value={customEnd}
                onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }}
                autoComplete="off"
                className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] w-[150px]"
              />
            </div>
          </>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b7280]">Tri</label>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as 'asc' | 'desc'); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="desc">↓ Mois (récent)</option>
            <option value="asc">↑ Mois (ancien)</option>
          </select>
        </div>
      </div>

      <div className="[&_table]:text-xs [&_th]:!text-xs [&_td]:!text-sm">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          pagination={data?.pagination ?? { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: limit }}
          isLoading={isLoading}
          isEmpty={!isLoading && (data?.data?.length ?? 0) === 0}
          emptyMessage="Aucune donnée"
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-[16px] bg-[#ffffff] shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-[#ffffff] border-b border-[#e5e7eb] px-6 py-5 flex items-center justify-between rounded-t-[16px]">
              <div>
                <h2 className="text-lg font-semibold text-[#111111]">
                  {detailRow.grouped ? 'Facture groupée' : (Array.isArray(detailRow.consultant) ? detailRow.consultant[0] : detailRow.consultant)}
                  <span className="text-[#6b7280]"> · </span>
                  {Array.isArray(detailRow.month) ? detailRow.month.join(', ') : detailRow.month}
                </h2>
                <p className="text-sm text-[#6b7280] mt-0.5">{detailRow.client} <span className="text-[#d1d5db]">·</span> {detailRow.ref}</p>
              </div>
              <button
                onClick={() => setDetailRow(null)}
                className="cursor-pointer rounded-[6px] p-1.5 text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#111111]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {detailRow.grouped ? (
                detailRow.consultants.map((c) => (
                  <div key={c.consultantId} className="rounded-[12px] bg-[#f5f5f5] p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-3 text-center">{c.name} · {c.month}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#6b7280] shrink-0">Jours</span>
                        <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                        <span className="text-[#111111] font-semibold shrink-0">{c.days}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#6b7280] shrink-0">TJM Contrat</span>
                        <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                        <span className="text-[#111111] font-semibold shrink-0">{c.contractDailyRate.toLocaleString()} DH</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#6b7280] shrink-0">TJM Consultant</span>
                        <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                        <span className="text-[#111111] font-semibold shrink-0">{c.missionDailyRate.toLocaleString()} DH</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[12px] bg-[#f5f5f5] p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-3 text-center">Activité</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#6b7280] shrink-0">Jours</span>
                      <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                      <span className="text-[#111111] font-semibold shrink-0">{detailRow.days ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#6b7280] shrink-0">TJM Contrat</span>
                      <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                      <span className="text-[#111111] font-semibold shrink-0">{(detailRow.contractDailyRate ?? 0).toLocaleString()} DH</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#6b7280] shrink-0">TJM Consultant</span>
                      <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                      <span className="text-[#111111] font-semibold shrink-0">{(detailRow.missionDailyRate ?? 0).toLocaleString()} DH</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#6b7280] shrink-0">Validation client</span>
                      <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                      <span className="text-[#10b981] font-semibold shrink-0">✓ Validé</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-[12px] bg-[#f5f5f5] p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-3 text-center">Facturation</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Facture</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{detailRow.invoiceRef ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Date émission</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{formatDate(detailRow.issueDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">HT</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{(detailRow.amount ?? 0).toLocaleString()} DH</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">TVA</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{(detailRow.vat ?? 0).toLocaleString()} DH</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm border-t border-[#e5e7eb] pt-3">
                    <span className="text-[#111111] font-bold shrink-0">TTC</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-bold shrink-0">{(detailRow.total ?? 0).toLocaleString()} DH</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Date échéance</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{formatDate(detailRow.dueDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Statut Client</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    {(() => {
                      if (detailRow.clientStatus === 'late') {
                        const due = new Date(detailRow.dueDate);
                        const today = new Date();
                        const lateDays = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()) / (1000 * 60 * 60 * 24));
                        if (lateDays >= 15) {
                          return <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#fef2f2] text-[#ef4444] shrink-0">En retard (+{lateDays} j)</span>;
                        }
                        return <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 bg-[#fef2f2] text-[#ef4444]">En retard</span>;
                      }
                      const isLate = detailRow.clientStatus !== 'PAID' && detailRow.clientStatus !== 'CANCELED' && detailRow.dueDate && new Date(detailRow.dueDate).toDateString() < new Date().toDateString();
                      if (isLate) {
                        const due = new Date(detailRow.dueDate);
                        const today = new Date();
                        const lateDays = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()) / (1000 * 60 * 60 * 24));
                        if (lateDays >= 15) {
                          return <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#fef2f2] text-[#ef4444] shrink-0">En retard (+{lateDays} j)</span>;
                        }
                      }
                      return (
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${clientStatusBadge[detailRow.clientStatus] || 'bg-[#e5e7eb] text-[#6b7280]'}`}>
                          {clientStatusLabels[detailRow.clientStatus] ?? detailRow.clientStatus}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Payée le</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{detailRow.paymentDate ? formatDate(detailRow.paymentDate) : '—'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[12px] bg-[#f5f5f5] p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-3 text-center">Paiement consultant</h3>
                {detailRow.grouped ? (
                  detailRow.consultants.map((c) => (
                    <div key={c.consultantId} className="space-y-3 mb-4 last:mb-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#111111]">{c.name}</p>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${consultantStatusBadge[c.consultantStatus] || 'bg-[#fef3c7] text-[#f59e0b]'}`}>{consultantStatusLabels[c.consultantStatus] ?? 'Pas encore'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#6b7280] shrink-0">Net (TTC)</span>
                        <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                        <span className="text-[#111111] font-semibold shrink-0">{c.totalPaid.toLocaleString()} DH</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#6b7280] shrink-0">Versé le</span>
                        <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                        <span className="text-[#111111] font-semibold shrink-0">{c.paymentDate ? formatDate(c.paymentDate) : '—'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#6b7280] shrink-0">Statut Consultant</span>
                      <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${consultantStatusBadge[detailRow.consultantStatus as string] || 'bg-[#fef3c7] text-[#f59e0b]'}`}>{consultantStatusLabels[detailRow.consultantStatus as string] ?? 'Pas encore'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#6b7280] shrink-0">Net (TTC)</span>
                      <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                      <span className="text-[#111111] font-semibold shrink-0">{(detailRow.totalPaid ?? 0).toLocaleString()} DH</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#6b7280] shrink-0">Versé le</span>
                      <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                      <span className="text-[#111111] font-semibold shrink-0">{detailRow.consultantPaymentDate ? formatDate(detailRow.consultantPaymentDate as string) : '—'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div
                className="rounded-[12px] p-5"
                style={{
                  backgroundColor: (detailRow.cabinet_margin ?? 0) > 0 ? '#f0fdf4' : '#fef2f2',
                }}
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-3 text-center">Marge cabinet</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Encaissé HT</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">{(detailRow.amount ?? 0).toLocaleString()} DH</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280] shrink-0">Versé conseil. (TTC)</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-semibold shrink-0">- {(detailRow.totalPaid ?? 0).toLocaleString()} DH</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm border-t border-[#e5e7eb] pt-3">
                    <span className="text-[#6b7280] shrink-0">Marge</span>
                    <span className="flex-1 border-b border-dashed border-[#d1d5db] min-w-[8px]" />
                    <span className="text-[#111111] font-bold shrink-0">{(detailRow.cabinet_margin ?? 0).toLocaleString()} DH</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {openMenu && (() => {
        const row = (data?.data ?? []).find((r) => r.id === openMenu.rowId);
        if (!row) return null;
        const isPending = row.status === 'PENDING' || row.status === 'PARTIAL_PAID';
        const isLate = row.dueDate && new Date(row.dueDate) < new Date() && isPending;
        const consultantUnpaid = row.grouped
          ? row.consultants.some((c) => c.consultantStatus !== 'PAYE')
          : (row.consultantStatus as string) !== 'PAYE';
        return createPortal(
          <div
            style={{ position: 'fixed', left: openMenu.x, top: openMenu.y, zIndex: 9999, transform: 'translateX(-100%)' }}
            className="w-56 rounded-[8px] border border-[#afafaf] bg-[#ffffff] p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {consultantUnpaid && (
              <button onClick={() => openAction('payout', row.id)} className="w-full cursor-pointer py-2 text-center text-xs font-medium text-[#111111] hover:bg-[#e4eae4] rounded-lg border border-[#dbdbdb] bg-[#f7f9f7] mb-1">
                Payer consultant
              </button>
            )}
            {isPending && (
              <button onClick={() => openAction('markPaid', row.id)} className="w-full cursor-pointer py-2 text-center text-xs font-medium text-[#111111] hover:bg-[#e4eae4] rounded-lg border border-[#dbdbdb] bg-[#f7f9f7] mb-1">
                Marquer facture payée
              </button>
            )}
            <button onClick={() => openAction('email', row.id)} className={`w-full cursor-pointer py-2 text-center text-xs font-medium hover:bg-[#e4eae4] rounded-lg border border-[#dbdbdb] bg-[#f7f9f7] mb-1 ${menuInvoice?.isSent ? 'text-green-500' : 'text-[#111111]'}`}>
              {menuInvoice?.isSent ? 'Renvoyer l\'email' : 'Envoyer facture par email'}
            </button>
            {isLate && (
              <button onClick={() => openAction('reminder', row.id)} className="w-full cursor-pointer py-2 text-center text-xs font-medium text-[#111111] hover:bg-[#e4eae4] rounded-lg border border-[#dbdbdb] bg-[#f7f9f7] mb-1">
                Envoyer relance
              </button>
            )}
          </div>,
          document.body,
        );
      })()}

      {actionType === 'markPaid' && actionInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Marquer comme payée</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Confirmer que la facture {actionInvoice.ref} est payée&nbsp;?</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111111] mb-1">Date de paiement</label>
              <input type="date" value={markPaidDate} onChange={(e) => setMarkPaidDate(e.target.value)} autoComplete="off" className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111111] mb-1">Commentaire (optionnel)</label>
              <textarea value={markPaidComment} onChange={(e) => setMarkPaidComment(e.target.value)} rows={2} className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={closeActionModal} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handleMarkPaid} disabled={markPaidMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {markPaidMutation.isPending ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionType === 'email' && actionInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">{actionInvoice.isSent ? 'Renvoyer par email' : 'Envoyer par email'}</h2>
            <p className="mb-6 text-sm text-[#6b7280]">Envoyer {actionInvoice.ref} à {actionInvoice.client?.email ?? 'aucun email'}&nbsp;?</p>
            <div className="flex justify-end gap-3">
              <button onClick={closeActionModal} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handleEmailInvoice} disabled={emailMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {emailMutation.isPending ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionType === 'reminder' && actionInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Envoyer une relance</h2>
            <p className="mb-6 text-sm text-[#6b7280]">Envoyer un email de relance pour {actionInvoice.ref}&nbsp;?</p>
            <div className="flex justify-end gap-3">
              <button onClick={closeActionModal} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handleSendReminder} disabled={sendReminderMutation.isPending} className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {sendReminderMutation.isPending ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionType === 'payout' && actionInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Payer le consultant</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Facture {actionInvoice.ref}</p>

            <p className="mb-3 text-sm text-[#6b7280]">
              Reste à payer (TTC) : <span className="font-bold bg-green-500/20 px-4 py-1 rounded text-[#111111]">{(actionInvoice.consultantPayoutRest ?? 0).toLocaleString()} DH</span>
            </p>

            {(actionInvoice.consultantsPayouts && actionInvoice.consultantsPayouts.length > 0 || actionInvoice.consultantPayouts && actionInvoice.consultantPayouts.length > 0) && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#111111] mb-1">Consultant</label>
                <select value={payoutConsultantId} onChange={(e) => setPayoutConsultantId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]">
                  <option value="">Sélectionner un consultant</option>
                  {actionInvoice.consultantsPayouts && actionInvoice.consultantsPayouts.length > 0
                    ? actionInvoice.consultantsPayouts.filter((cp) => cp.rest > 0).map((cp) => {
                        const consultant = actionInvoice.consultants?.find((c) => c.id === cp.consultantId);
                        const name = consultant?.name ?? `Consultant #${cp.consultantId}`;
                        return (
                          <option key={cp.consultantId} value={cp.consultantId}>
                            {name} — reste {cp.rest.toLocaleString()} DH
                          </option>
                        );
                      })
                    : actionInvoice.consultantPayouts?.map((cp) => {
                        const consultant = actionInvoice.consultants?.find((c) => c.id === cp.consultantId);
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
                <input type="number" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} autoComplete="off" className="flex-1 rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" min={0} step="any" />
                <div className="flex rounded-[8px] border border-[#e5e7eb] overflow-hidden shrink-0">
                  <button type="button" onClick={() => { setPayoutMode('DH'); setPayoutAmount(String(payoutBase)); }} className={`cursor-pointer px-3 py-2 text-xs font-semibold transition-colors ${payoutMode === 'DH' ? 'bg-[#111111] text-[#ffffff]' : 'bg-[#ffffff] text-[#6b7280] hover:bg-[#f3f4f6]'}`}>
                    DH
                  </button>
                  <button type="button" onClick={() => { setPayoutMode('%'); setPayoutAmount('100'); }} className={`cursor-pointer px-3 py-2 text-xs font-semibold transition-colors ${payoutMode === '%' ? 'bg-[#111111] text-[#ffffff]' : 'bg-[#ffffff] text-[#6b7280] hover:bg-[#f3f4f6]'}`}>
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
              <textarea value={payoutComment} onChange={(e) => setPayoutComment(e.target.value)} rows={2} className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] resize-none" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeActionModal} className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]">Annuler</button>
              <button onClick={handlePayout} disabled={payoutMutation.isPending || !payoutAmount || parseFloat(payoutAmount) <= 0 || parseFloat(payoutAmount) > (payoutMode === 'DH' ? payoutBase : 100)} className="cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50">
                {payoutMutation.isPending ? 'Traitement...' : 'Confirmer le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}