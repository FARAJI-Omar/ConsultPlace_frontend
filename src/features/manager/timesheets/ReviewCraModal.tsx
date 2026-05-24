import { useState } from 'react';
import { useManagerTimesheetDetail, useReviewTimesheet } from '../../../hooks/manager/useManagerTimesheets';
import { toast } from 'sonner';

interface ReviewCraModalProps {
  timesheetId: number;
  open: boolean;
  onClose: () => void;
}

function formatMonth(month: string) {
  const [y, m] = month.split('-');
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function ReviewCraModal({ timesheetId, open, onClose }: ReviewCraModalProps) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const { data, isLoading } = useManagerTimesheetDetail(open ? timesheetId : null);
  const reviewMutation = useReviewTimesheet();

  const timesheet = data?.data;

  if (!open) return null;

  const handleApprove = () => {
    reviewMutation.mutate(
      { id: timesheetId, payload: { status: 'VALIDE' } },
      {
        onSuccess: () => {
          toast.success('Relevé approuvé avec succès');
          onClose();
        },
        onError: () => {
          toast.error('Erreur lors de l\'approbation');
        },
      },
    );
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    reviewMutation.mutate(
      { id: timesheetId, payload: { status: 'REJETE', reason: rejectReason.trim() } },
      {
        onSuccess: () => {
          toast.success('Relevé rejeté');
          onClose();
        },
        onError: () => {
          toast.error('Erreur lors du rejet');
        },
      },
    );
  };

  const attachments = timesheet?.attachments?.filter(
    (a) => a.type === 'PROOF' || a.type === 'MISSION_DOC',
  ) ?? [];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div
          className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] bg-[#ffffff] p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {isLoading || !timesheet ? (
            <p className="text-sm text-[#6b7280]">Chargement...</p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#111111]">Examiner le relevé</h2>
                <button onClick={onClose} className="cursor-pointer text-[#6b7280] hover:text-[#111111]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="rounded-[8px] bg-[#f5f5f5] p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#6b7280]">Mission</p>
                    <p className="font-medium text-[#111111]">{timesheet.mission.title}</p>
                  </div>
                  <div>
                    <p className="text-[#6b7280]">Consultant</p>
                    <p className="font-medium text-[#111111]">{timesheet.consultant.name}</p>
                  </div>
                  <div>
                    <p className="text-[#6b7280]">Mois</p>
                    <p className="font-medium text-[#111111]">{formatMonth(timesheet.month)}</p>
                  </div>
                  <div>
                    <p className="text-[#6b7280]">Total heures</p>
                    <p className="font-medium text-[#111111]">{timesheet.totalHours}h</p>
                  </div>
                </div>
              </div>

              {timesheet.rejectionReason && (
                <div className="rounded-[8px] bg-[#fef2f2] border border-[#fecaca] p-4">
                  <p className="text-xs font-semibold text-[#dc2626] mb-1">Motif du rejet précédent</p>
                  <p className="text-sm text-[#991b1b]">{timesheet.rejectionReason}</p>
                </div>
              )}

              <div>
                <h3 className="mb-2 text-sm font-medium text-[#111111]">Saisie journalière</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Jour</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Heures</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timesheet.dailyEntries.map((entry) => (
                        <tr key={entry.day} className="border-b border-[#e5e7eb]">
                          <td className="px-3 py-2 text-[#111111]">{entry.day}</td>
                          <td className="px-3 py-2 text-[#111111]">{entry.hours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {attachments.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-[#111111]">Pièces jointes</h3>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-full bg-[#f3f4f6] px-3 py-1 text-xs text-[#3b82f6] hover:underline"
                      >
                        {att.filename}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {rejectMode && (
                <div>
                  <label className="block text-sm font-medium text-[#111111] mb-1">Motif du rejet</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                    placeholder="Expliquez la raison du rejet..."
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                {!rejectMode ? (
                  <>
                    <button
                      onClick={() => setRejectMode(true)}
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
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setRejectMode(false); setRejectReason(''); }}
                      className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={reviewMutation.isPending || !rejectReason.trim()}
                      className="cursor-pointer rounded-[8px] bg-[#ef4444] px-4 py-2 text-sm font-medium text-[#ffffff] transition-colors hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Confirmer le rejet
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showApproveConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowApproveConfirm(false); }}
        >
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">
              Approuver le Relevé
            </h2>
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
                onClick={() => { setShowApproveConfirm(false); handleApprove(); }}
                disabled={reviewMutation.isPending}
                className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {reviewMutation.isPending ? 'Approbation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
