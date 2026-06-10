import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Download } from 'lucide-react';
import { useManagerTimesheetDetail, useReviewTimesheet } from '../../../hooks/manager/useManagerTimesheets';
import { formatDate } from '../../../lib/utils';
import { Skeleton } from '../../../components/ui/skeleton';
import HorizontalStepper from '../../../components/common/HorizontalStepper';
import { toast } from 'sonner';
import LoadingOverlay from '../../../components/common/LoadingOverlay';
import GenerateInvoiceModal from './GenerateInvoiceModal';

function formatMonth(month: string) {
  const [y, m] = month.split('-');
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function getMonthDays(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const statusBadge: Record<string, string> = {
  BROUILLON: 'bg-[#e5e7eb] text-[#6b7280]',
  SOUMIS: 'bg-[#fef3c7] text-[#f59e0b]',
  VALIDE: 'bg-[#d1fae5] text-[#10b981]',
  REJETE: 'bg-[#fee2e2] text-[#ef4444]',
  FACTURE: 'bg-[#ffedd5] text-[#f97316]',
  PAYE: 'bg-[#d1fae5] text-[#10b981]',
};

const statusLabels: Record<string, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS: 'Soumis',
  VALIDE: 'Validé',
  REJETE: 'Rejeté',
  FACTURE: 'Facturé',
  PAYE: 'Payé',
};

export default function TimesheetDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useManagerTimesheetDetail(id ? Number(id) : null);
  const ts = data?.data;
  const reviewMutation = useReviewTimesheet();
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const canReview = ts?.status === 'SOUMIS';
  const canGenerateInvoice = ts?.status === 'VALIDE';
  const [showGenerate, setShowGenerate] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <div className="grid grid-cols-2 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-1 h-3 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={`c-${i}`} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!ts) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[#6b7280]">Relevé introuvable</p>
        <Link to="/manager/timesheets" className="text-sm text-[#3b82f6] hover:underline">Retour à la liste</Link>
      </div>
    );
  }

  const allowedAttachments = ts.attachments?.filter((a) => a.type === 'PROOF' || a.type === 'CONSULTANT_FACTURE' || a.type === 'MISSION_DOC') ?? [];

  const [yearStr, monthStr] = ts.month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const totalDays = getMonthDays(year, monthNum);
  const firstDay = getFirstDayOfMonth(year, monthNum);
  const entriesByDay: Record<number, number> = {};
  for (const e of ts.dailyEntries) {
    entriesByDay[e.day] = e.hours;
  }
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    calendarCells.push(d);
  }

  return (
    <LoadingOverlay isLoading={reviewMutation.isPending}>
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/manager/timesheets"
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-1.5 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>
        <h1 className="text-2xl font-semibold text-[#111111]">Détail du relevé</h1>
        {canReview && (
          <div className="ml-auto flex gap-3">
            <button
              onClick={() => setShowReject(true)}
              disabled={reviewMutation.isPending}
              className="cursor-pointer rounded-[8px] bg-[#ef4444] px-4 py-2 text-sm font-medium text-[#ffffff] transition-colors hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Rejeter
            </button>
            <button
              onClick={() => setShowApproveConfirm(true)}
              disabled={reviewMutation.isPending}
              className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-colors hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Approuver
            </button>
          </div>
        )}
        {canGenerateInvoice && (
          <div className="ml-auto">
            <button
              onClick={() => setShowGenerate(true)}
              className="cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-colors hover:bg-[#059669]"
            >
              + Générer facture
            </button>
          </div>
        )}
      </div>

      <div className="rounded-[12px] bg-white border border-[#e5e7eb] p-6">
        <h2 className="mb-6 text-lg font-semibold text-[#111111]">Suivi du statut</h2>
        <HorizontalStepper
          steps={(ts.history ?? []).map((e) => ({
            status: e.newStatus,
            label: statusLabels[e.newStatus] ?? e.newStatus,
            timestamp: e.timestamp,
          }))}
          currentStatus={ts.status}
        />
      </div>

      <div className="rounded-[12px] bg-white border border-[#e5e7eb] p-6">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-[#6b7280]">Mission</p>
            <p className="font-medium text-[#111111]">{ts.mission.title}</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Consultant</p>
            <p className="font-medium text-[#111111]">{ts.consultant.name}</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Mois</p>
            <p className="font-medium text-[#111111]">{formatMonth(ts.month)}</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Statut</p>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[ts.status] || 'bg-[#e5e7eb] text-[#6b7280]'}`}>
              {statusLabels[ts.status] || ts.status}
            </span>
          </div>
          <div>
            <p className="text-[#6b7280]">Jours travaillés</p>
            <p className="font-medium text-[#111111]">{ts.days} jours</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Taux journalier</p>
            <p className="font-medium text-[#111111]">{ts.dailyRate.toLocaleString('fr-FR')} DH</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Total heures</p>
            <p className="font-medium text-[#111111]">{ts.totalHours}h</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Validation client</p>
            <p className="font-medium text-[#111111]">{ts.clientValidation ? 'Oui' : 'Non'}</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Soumis le</p>
            <p className="font-medium text-[#111111]">{formatDate(ts.submittedAt)}</p>
          </div>
          {ts.status === 'REJETE' && ts.rejectionReason && (
            <div className="col-span-2">
              <p className="text-[#6b7280]">Motif du rejet</p>
              <p className="font-medium text-[#ef4444]">{ts.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[12px] bg-white border border-[#e5e7eb] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#111111]">Saisie journalière</h2>
        <div className="grid grid-cols-7 gap-1 text-center text-sm ">
          {DAY_LABELS.map((label) => (
            <div key={label} className="py-1 text-xs font-medium text-[#6b7280]">{label}</div>
          ))}
          {calendarCells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} />;
            }
            const hours = entriesByDay[day];
            const hasEntry = hours !== undefined;
            return (
              <div
                key={day}
                className={`rounded-[6px] py-2 text-sm ${
                  hasEntry
                    ? 'bg-[#3b82f6] font-medium text-[#ffffff]'
                    : 'text-[#6b7280]'
                }`}
              >
                <div>{day}</div>
                {hasEntry && <div className="text-[16px] font-bold opacity-80">{hours}h</div>}
              </div>
            );
          })}
        </div>
      </div>

      {allowedAttachments.length > 0 && (() => {
        const consultantDocs = allowedAttachments.filter((a) => a.type === 'PROOF' || a.type === 'CONSULTANT_FACTURE');
        const missionDocs = allowedAttachments.filter((a) => a.type === 'MISSION_DOC');
        const typeLabel: Record<string, string> = { PROOF: 'Justificatif', CONSULTANT_FACTURE: 'Facture consultant', MISSION_DOC: 'Document de mission' };
        const renderCard = (att: (typeof allowedAttachments)[number]) => (
          <a
            key={att.id}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-3 transition-colors hover:bg-[#f9fafb]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#eff6ff]">
              <FileText className="h-5 w-5 text-[#3b82f6]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#111111]">{att.filename}</p>
              <p className="text-xs text-[#6b7280]">{typeLabel[att.type] ?? att.type}</p>
            </div>
            <Download className="h-4 w-4 shrink-0 text-[#6b7280]" />
          </a>
        );
        return (
          <div className="rounded-[12px] bg-white border border-[#e5e7eb] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Pièces jointes</h2>
            {consultantDocs.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-[#374151]">Documents du consultant</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {consultantDocs.map(renderCard)}
                </div>
              </div>
            )}
            {missionDocs.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-[#374151]">Documents de mission</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {missionDocs.map(renderCard)}
                </div>
              </div>
            )}
          </div>
        );
      })()}



      {showApproveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <div className="w-full max-w-lg rounded-[12px] bg-[#ffffff] p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Approuver le Relevé</h2>
            <p className="mb-6 text-sm text-[#6b7280]">
              Êtes-vous sûr de vouloir approuver ce relevé&nbsp;? Cette action ne peut pas être annulée.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApproveConfirm(false)}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  reviewMutation.mutate(
                    { id: Number(id), payload: { status: 'VALIDE' } },
                    {
                      onSuccess: () => {
                        toast.success('Relevé approuvé avec succès');
                        setShowApproveConfirm(false);
                      },
                      onError: () => { toast.error("Erreur lors de l'approbation"); },
                    },
                  );
                }}
                disabled={reviewMutation.isPending}
                className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {reviewMutation.isPending ? 'Approbation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <div className="w-full max-w-xl rounded-[12px] bg-[#ffffff] p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Rejeter le Relevé</h2>
            <p className="mb-4 text-sm text-[#6b7280]">Veuillez indiquer le motif du rejet.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              placeholder="Motif du rejet"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowReject(false); setRejectReason(''); }}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!rejectReason.trim()) return;
                  reviewMutation.mutate(
                    { id: Number(id), payload: { status: 'REJETE', reason: rejectReason.trim() } },
                    {
                      onSuccess: () => {
                        toast.success('Relevé rejeté');
                        setShowReject(false);
                        setRejectReason('');
                      },
                      onError: () => { toast.error('Erreur lors du rejet'); },
                    },
                  );
                }}
                disabled={reviewMutation.isPending || !rejectReason.trim()}
                className="cursor-pointer rounded-[8px] bg-[#ef4444] px-4 py-2 text-sm font-medium text-[#ffffff] transition-colors hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}

      {showGenerate && ts && (
        <GenerateInvoiceModal
          validTimesheets={[{ id: ts.id, month: ts.month, mission: { title: ts.mission.title }, consultant: { name: ts.consultant.name }, totalHours: ts.totalHours }]}
          prefilledTimesheetId={ts.id}
          open={showGenerate}
          onClose={() => setShowGenerate(false)}
        />
      )}

    </div>
    </LoadingOverlay>
  );
}
