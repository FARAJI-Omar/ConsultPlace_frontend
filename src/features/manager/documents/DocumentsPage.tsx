import { toast } from 'sonner';
import { FileText, FileUp } from 'lucide-react';
import { format } from 'date-fns';
import { useAttestation, useUploadAttestation, useSetAttestationActive, useDeleteAttestation } from '../../../hooks/manager/useAttestation';
import { Skeleton } from '../../../components/ui/skeleton';
import { truncateFilename } from '../../../lib/utils';

const errorMessage = (err: any, fallback: string) =>
  err?.response?.data?.error?.message ?? fallback;

export default function DocumentsPage() {
  const { data, isLoading } = useAttestation();
  const doc = data?.data ?? null;

  const uploadMutation = useUploadAttestation();
  const setActiveMutation = useSetAttestationActive();
  const deleteMutation = useDeleteAttestation();

  const locked = !!doc || uploadMutation.isPending;

  const handleFile = (f: File | undefined) => {
    if (!f || locked) return;
    uploadMutation.mutate(f, {
      onSuccess: () => toast.success('Attestation enregistrée'),
      onError: (err) => toast.error(errorMessage(err, "Erreur lors de l'envoi")),
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => toast.success('Attestation supprimée'),
      onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression')),
    });
  };

  const handleToggle = () => {
    if (!doc || setActiveMutation.isPending) return;
    setActiveMutation.mutate(!doc.isActive, {
      onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour')),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 md:px-16">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-16">
      <h1 className="text-2xl font-semibold text-[#111111]">Documents</h1>

      <div className="flex flex-col gap-6 md:flex-row md:gap-[34px]">
        <div className="md:w-2/3">
          <h2 className="mb-3 text-lg font-semibold text-[#111111]">Attestation fiscale</h2>
          <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-4 shadow-sm">
            <div
              onDragOver={(e) => { e.preventDefault(); if (!locked) e.currentTarget.style.borderColor = '#3b82f6'; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; }}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => { if (!locked) document.getElementById('attestation-file-input')?.click(); }}
              className={`flex flex-col items-center justify-center gap-2 rounded-[8px] border-2 border-dashed border-[#d1d5db] p-6 text-center transition-colors ${uploadMutation.isPending && !doc ? 'pointer-events-none opacity-50' : !doc ? 'cursor-pointer hover:border-[#3b82f6]' : ''}`}
            >
              {doc ? (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#eff6ff]">
                    <FileText className="h-6 w-6 text-[#3b82f6]" />
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-w-full truncate text-sm font-semibold text-[#111111] hover:underline"
                  >
                    {truncateFilename(doc.filename)}
                  </a>
                  <p className="text-xs text-[#6b7280]">Ajouté le {format(new Date(doc.uploadedAt), 'dd/MM/yyyy')}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    disabled={deleteMutation.isPending}
                    className="cursor-pointer text-sm text-[#ef4444] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                  <p className="text-xs text-[#9ca3af]">Supprimez le fichier actuel pour en sélectionner un autre</p>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#eff6ff]">
                    <FileUp className="h-6 w-6 text-[#3b82f6]" />
                  </div>
                  <p className="text-sm font-semibold text-[#111111]">
                    {uploadMutation.isPending ? 'Envoi en cours...' : 'Glissez-déposez un fichier ici'}
                  </p>
                  <p className="text-xs text-[#9ca3af]">PDF, JPG, PNG (max 10 Mo)</p>
                  {!uploadMutation.isPending && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); document.getElementById('attestation-file-input')?.click(); }}
                      className="mt-1 cursor-pointer rounded-[8px] bg-[#1d4ed8] px-4 py-2 text-sm font-medium text-[#ffffff] transition-colors hover:bg-[#1e40af]"
                    >
                      Parcourir
                    </button>
                  )}
                </>
              )}
            </div>
            <input
              id="attestation-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={locked}
              onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
              className="hidden"
            />
          </div>
        </div>

        <div className="md:w-1/3 md:pt-10">
          <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#111111]">Inclure dans la facture</p>
                <p className="text-xs text-[#6b7280]">L'attestation sera jointe à toutes les factures</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={doc?.isActive ?? false}
                disabled={!doc || setActiveMutation.isPending}
                onClick={handleToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${doc?.isActive ? 'bg-[#16a34a]' : 'bg-[#d1d5db]'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${doc?.isActive ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none flex flex-col gap-6 opacity-30 md:flex-row md:gap-8.5">
        <div className="md:w-2/3">
          <h2 className="mb-3 text-lg font-semibold text-[#111111]">Prochain document</h2>
          <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-4 shadow-sm">
            <div className="flex flex-col items-center justify-center gap-2 rounded-[8px] border-2 border-dashed border-[#d1d5db] p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#eff6ff]">
                <FileUp className="h-6 w-6 text-[#3b82f6]" />
              </div>
              <p className="text-sm font-semibold text-[#111111]">Bientôt disponible</p>
              <p className="text-xs text-[#9ca3af]">PDF, JPG, PNG (max 10 Mo)</p>
            </div>
          </div>
        </div>
        <div className="md:w-1/3 md:pt-10">
          <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#111111]">Activer / Désactiver</p>
                <p className="text-xs text-[#6b7280]"></p>
              </div>
              <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-[#d1d5db]">
                <span className="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-white" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
