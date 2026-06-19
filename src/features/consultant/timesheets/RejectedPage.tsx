import { useState } from 'react';
import { toast } from 'sonner';
import { useConsultantTimesheets } from '../../../hooks/consultant/useConsultantDashboard';
import {
  useGetAttachments,
  useDeleteAttachment,
  useUploadAttachments,
} from '../../../hooks/consultant/useAttachments';
import { useSubmitTimesheet } from '../../../hooks/consultant/useTimesheets';
import { formatDate, truncateFilename } from '../../../lib/utils';
import { compressImages } from '../../../lib/compressImage';
import { Delete, SquarePen, Send } from 'lucide-react';
import EditCraModal from './EditCraModal';
import { downloadFile } from '../../../utils/downloadFile';
import type { Timesheet } from '../../../types/models';

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function formatMonth(month: string) {
  const [year, m] = month.split('-');
  return `${monthNames[parseInt(m, 10) - 1]} ${year}`;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function RejectedPage() {
  const { data: timesheets, isLoading, isError } = useConsultantTimesheets();
  const submitMutation = useSubmitTimesheet();
  const deleteAttachment = useDeleteAttachment();
  const uploadAttachments = useUploadAttachments();
  const [editTimesheetId, setEditTimesheetId] = useState<number | null>(null);

  const rejected: Timesheet[] = (timesheets ?? []).filter(
    (t) => t.status === 'REJETE',
  );

  const handleSubmit = async (id: number) => {
    try {
      await submitMutation.mutateAsync(id);
      toast.success('Relevé mensuel soumis avec succès.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Au moins une pièce jointe est requise pour soumettre.';
      throw new Error(msg);
    }
  };

  return (
    <div className="p-2">
      <h1 className="text-[22px] font-semibold text-[#111111] mb-6">
        Relevés rejetés
      </h1>

      {isLoading && (
        <p className="text-sm text-[#6b7280]">Chargement...</p>
      )}

      {isError && (
        <p className="text-sm text-[#ef4444]">
          Erreur lors du chargement des relevés rejetés.
        </p>
      )}

      {!isLoading && !isError && rejected.length === 0 && (
        <p className="text-sm text-[#6b7280]">
          Aucun relevé rejeté.
        </p>
      )}

      <div className="space-y-4">
        {rejected.map((item) => (
          <RejectedCard
            key={item.id}
            item={item}
            onSubmit={() => handleSubmit(item.id)}
            isSubmitting={submitMutation.isPending && submitMutation.variables === item.id}
            onDeleteAttachment={async (attachmentId) => {
              try {
                await deleteAttachment.mutateAsync({ id: attachmentId, timesheetId: item.id });
                toast.success('Pièce jointe supprimée.');
              } catch (err: unknown) {
                const msg =
                  (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
                  'Erreur lors de la suppression.';
                toast.error(msg);
              }
            }}
            onUploadFiles={async (files, type) => {
              try {
                const compressed = await compressImages(files);
                await uploadAttachments.mutateAsync({ files: compressed, timesheetId: String(item.id), type });
                toast.success('Fichier(s) ajouté(s).');
              } catch (err: unknown) {
                const msg =
                  (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
                  'Erreur lors de l\'ajout.';
                toast.error(msg);
              }
            }}
            isUploading={uploadAttachments.isPending && uploadAttachments.variables?.timesheetId === String(item.id)}
            onEdit={() => setEditTimesheetId(item.id)}
          />
        ))}
      </div>

      <EditCraModal
        timesheetId={editTimesheetId!}
        open={editTimesheetId !== null}
        onClose={() => setEditTimesheetId(null)}
      />
    </div>
  );
}

interface RejectedCardProps {
  item: Timesheet;
  onSubmit: () => void;
  isSubmitting: boolean;
  onDeleteAttachment: (attachmentId: number) => Promise<void>;
  onUploadFiles: (files: File[], type: 'PROOF' | 'CONSULTANT_FACTURE') => Promise<void>;
  isUploading: boolean;
  onEdit: () => void;
}

function RejectedCard({
  item,
  onSubmit,
  isSubmitting,
  onDeleteAttachment,
  onUploadFiles,
  isUploading,
  onEdit,
}: RejectedCardProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleConfirmSubmit = async () => {
    setShowSubmitConfirm(false);
    try {
      await onSubmit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la soumission.');
    }
  };

  const { data: attachments, isLoading: attachmentsLoading } = useGetAttachments(item.id);

  const proofAttachments = attachments?.filter((a) => a.type === 'PROOF') ?? [];
  const factureAttachments = attachments?.filter((a) => a.type === 'CONSULTANT_FACTURE') ?? [];
  const hasRequiredFiles = !attachmentsLoading && proofAttachments.length > 0 && factureAttachments.length > 0;

  return (
    <div className="rounded-[12px] bg-[#ffffff] border border-[#e5e7eb] overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between px-4 py-4 gap-2">
        <div className="flex items-center justify-between md:justify-start md:gap-6">
          <div>
            <p className="text-sm font-medium text-[#111111]">
              {formatMonth(item.month)}
              <span className="ml-2 rounded-[9999px] bg-[#fef2f2] text-[#dc2626] text-[10px] font-semibold px-2 py-0.5 align-middle">Rejeté</span>
            </p>
            <p className="text-xs text-[#6b7280]">
              {item.mission?.title ?? 'Mission inconnue'}
            </p>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              title="Modifier les heures"
              className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-2 text-xs font-semibold text-[#111111] hover:bg-[#f3f4f6] transition-colors"
            >
              <SquarePen size={14} />
            </button>
            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              disabled={isSubmitting || !hasRequiredFiles}
              title={!hasRequiredFiles ? 'Les documents Rapport d\'activité et facture du consultant requis' : ''}
              className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] bg-green-600 px-3 py-2 text-xs font-semibold text-[#ffffff] hover:bg-green-700 transition-colors disabled:bg-[#e5e7eb] disabled:text-[#6b7280] disabled:cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between md:justify-start md:gap-6">
          <div className="text-left">
            <p className="text-sm text-[#111111]">{item.totalHours}h</p>
            <p className="text-xs text-[#6b7280]">Créé le {formatDate(item.createdAt)}</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              title="Modifier les heures"
              className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-2 text-xs font-semibold text-[#111111] hover:bg-[#f3f4f6] transition-colors"
            >
              <SquarePen size={14} className="md:hidden" />
              <span className="hidden md:inline">Modifier les heures</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              disabled={isSubmitting || !hasRequiredFiles}
              title={isSubmitting ? 'Soumission en cours...' : !hasRequiredFiles ? 'Les documents Rapport d\'activité et facture du consultant requis' : 'Soumettre le relevé'}
              className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] bg-green-600 px-3 py-2 text-xs font-semibold text-[#ffffff] hover:bg-green-700 transition-colors disabled:bg-[#e5e7eb] disabled:text-[#6b7280] disabled:cursor-not-allowed"
            >
              <span className="hidden md:inline">{isSubmitting ? 'Soumission...' : 'Soumettre'}</span>
            </button>
          </div>
        </div>
      </div>

      {item.rejectionReason && (
        <div className="mx-4 mb-4 rounded-[8px] bg-[#fef2f2] border border-[#fecaca] p-4">
          <p className="text-xs font-semibold text-[#dc2626] mb-1">Motif du rejet</p>
          <p className="text-sm text-[#991b1b]">{item.rejectionReason}</p>
        </div>
      )}

      <div className="border-t border-[#e5e7eb] px-4 py-4 space-y-4">
        {attachmentsLoading && (
          <p className="text-xs text-[#6b7280]">Chargement des pièces jointes...</p>
        )}

        {!attachmentsLoading && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium tracking-wider text-[#494d56]">Rapport d'activité <span className="text-xs text-[#ff0909]">*</span></label>
              <button
                type="button"
                onClick={() => document.getElementById(`rejected-proof-input-${item.id}`)?.click()}
                disabled={isUploading}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-2 text-xs font-semibold text-[#111111] hover:bg-[#e7e8eb] disabled:opacity-50 transition-colors"
              >
                {isUploading ? 'Ajout en cours...' : '+ Ajouter un rapport'}
              </button>
              <input
                id={`rejected-proof-input-${item.id}`}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                multiple
                onChange={(e) => {
                  setFileError(null);
                  const selected = e.target.files;
                  if (!selected || selected.length === 0) return;
                  const incoming = Array.from(selected);
                  const invalid = incoming.find(
                    (f) => !['application/pdf', 'image/jpeg', 'image/png'].includes(f.type) &&
                      !['.pdf', '.jpg', '.jpeg', '.png'].some((ext) => f.name.toLowerCase().endsWith(ext)),
                  );
                  if (invalid) { setFileError('Seuls les fichiers PDF, JPG et PNG sont acceptés.'); e.target.value = ''; return; }
                  const oversized = incoming.find((f) => f.size > MAX_FILE_SIZE);
                  if (oversized) { setFileError('Chaque fichier ne doit pas dépasser 10 Mo.'); e.target.value = ''; return; }
                  onUploadFiles(incoming, 'PROOF');
                  e.target.value = '';
                }}
                className="hidden"
              />
              {attachments && attachments.filter((a) => a.type === 'PROOF').length > 0 && (
                <ul className="space-y-1.5">
                  {attachments.filter((a) => a.type === 'PROOF').map((att) => (
                    <li key={att.id} className="flex items-center justify-between rounded-[8px] bg-[#f5f5f5] px-4 py-2">
                      <div className="flex items-center gap-3">
                        <span className="inline-block rounded-[9999px] bg-[#e5e7eb] px-2 py-0.5 text-xs text-[#6b7280]">
                          {att.filename.split('.').pop()?.toUpperCase() ?? 'FICHIER'}
                        </span>
                        <div className="flex flex-col">
                          <button type="button" onClick={() => downloadFile(att.url, att.filename)} className="cursor-pointer text-xs md:text-sm text-[#111111] underline underline-offset-2 hover:text-[#6b7280] transition-colors">{truncateFilename(att.filename)}</button>
                          {att.uploadedAt && (
                            <span className="text-xs text-[#6b7280] mt-0.5">Ajouté le {formatDate(att.uploadedAt)}</span>
                          )}
                        </div>
                      </div>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(att.id)}
                          title="Supprimer"
                          className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] px-2 py-1 text-xs font-semibold text-[#ef4444] hover:bg-[#fef2f2] transition-colors"
                        >
                          <Delete size={14} className="md:hidden" />
                          <span className="hidden md:inline">Supprimer</span>
                        </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium tracking-wider text-[#494d56]">Facture du consultant <span className="text-xs text-[#ff0909]">*</span></label>
              {attachments && attachments.filter((a) => a.type === 'CONSULTANT_FACTURE').length > 0 ? (
                <ul className="space-y-1.5">
                  {attachments.filter((a) => a.type === 'CONSULTANT_FACTURE').map((att) => (
                    <li key={att.id} className="flex items-center justify-between rounded-[8px] bg-[#f5f5f5] px-4 py-2">
                      <div className="flex items-center gap-3">
                        <span className="inline-block rounded-[9999px] bg-[#e5e7eb] px-2 py-0.5 text-xs text-[#6b7280]">
                          {att.filename.split('.').pop()?.toUpperCase() ?? 'FICHIER'}
                        </span>
                        <div className="flex flex-col">
                          <button type="button" onClick={() => downloadFile(att.url, att.filename)} className="cursor-pointer text-xs md:text-sm text-[#111111] underline underline-offset-2 hover:text-[#6b7280] transition-colors">{truncateFilename(att.filename)}</button>
                          {att.uploadedAt && (
                            <span className="text-xs text-[#6b7280] mt-0.5">Ajouté le {formatDate(att.uploadedAt)}</span>
                          )}
                        </div>
                      </div>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(att.id)}
                          title="Supprimer"
                          className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] px-2 py-1 text-xs font-semibold text-[#ef4444] hover:bg-[#fef2f2] transition-colors"
                        >
                          <Delete size={14} className="md:hidden" />
                          <span className="hidden md:inline">Supprimer</span>
                        </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => document.getElementById(`rejected-facture-input-${item.id}`)?.click()}
                    disabled={isUploading}
                    className="cursor-pointer rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-2 text-xs font-semibold text-[#111111] hover:bg-[#e7e8eb] disabled:opacity-50 transition-colors"
                  >
                    {isUploading ? 'Ajout en cours...' : '+ Ajouter une facture'}
                  </button>
                  <input
                    id={`rejected-facture-input-${item.id}`}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={(e) => {
                      setFileError(null);
                      const selected = e.target.files;
                      if (!selected || selected.length === 0) return;
                      const file = selected[0];
                      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) &&
                        !['.pdf', '.jpg', '.jpeg', '.png'].some((ext) => file.name.toLowerCase().endsWith(ext))) {
                        setFileError('Seuls les fichiers PDF, JPG et PNG sont acceptés.'); e.target.value = ''; return;
                      }
                      if (file.size > MAX_FILE_SIZE) {
                        setFileError('Chaque fichier ne doit pas dépasser 10 Mo.'); e.target.value = ''; return;
                      }
                      onUploadFiles([file], 'CONSULTANT_FACTURE');
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </>
              )}
            </div>

            {fileError && (
              <p className="text-xs font-medium text-[#ef4444]">{fileError}</p>
            )}

            {(!attachments || attachments.length === 0) && (
              <p className="text-xs text-[#6b7280]">Aucune pièce jointe pour ce relevé.</p>
            )}

            {confirmDeleteId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="rounded-[12px] bg-[#ffffff] p-6 shadow-lg w-80" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm font-semibold text-[#111111] mb-2">Confirmer la suppression</p>
                  <p className="text-sm text-[#6b7280] mb-6">Cette action est irréversible.</p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="cursor-pointer rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-2 text-xs font-semibold text-[#111111] hover:bg-[#f3f4f6] transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteAttachment(confirmDeleteId);
                        setConfirmDeleteId(null);
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] bg-[#ef4444] px-4 py-2 text-xs font-semibold text-[#ffffff] hover:bg-[#dc2626] transition-colors"
                      title="Supprimer"
                    >
                      <Delete size={14} className="md:hidden" />
                      <span className="hidden md:inline">Supprimer</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-[12px] bg-[#ffffff] p-6 shadow-lg w-80" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-[#111111] mb-2">Confirmer la soumission</p>
            <p className="text-sm text-[#6b7280] mb-6">Envoyer ce relevé pour validation ?</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-2 text-xs font-semibold text-[#111111] hover:bg-[#f3f4f6] transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="cursor-pointer rounded-[8px] bg-green-600 px-4 py-2 text-xs font-semibold text-[#ffffff] hover:bg-green-700 transition-colors"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
