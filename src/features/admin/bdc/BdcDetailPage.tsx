import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText, Download, Calendar, Hash, Clock, Activity, Pencil } from 'lucide-react';
import { useGetBdcById, useUploadBdcAttachments } from '../../../hooks/useBdc';
import { truncateFilename } from '../../../lib/utils';
import { compressImages } from '../../../lib/compressImage';
import { downloadFile } from '../../../utils/downloadFile';
import Modal from '../../../components/common/Modal';
import BdcForm from './BdcForm';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function BdcDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bdcId = Number(id);

  const { data: bdc, isLoading } = useGetBdcById(bdcId);
  const uploadAttachments = useUploadBdcAttachments();
  const [uploading, setUploading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const oversized = files.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error('Certains fichiers dépassent la limite de 10 Mo');
      return;
    }

    setUploading(true);
    const compressed = await compressImages(files);
    uploadAttachments.mutate(
      { id: bdcId, files: compressed },
      {
        onSuccess: () => {
          toast.success('Documents ajoutés avec succès');
          setUploading(false);
        },
        onError: (err: unknown) => {
          const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
          toast.error(axiosErr.response?.data?.error?.message ?? "Une erreur est survenue lors de l'upload");
          setUploading(false);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          to="/admin/bons-de-commande"
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-1.5 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>
        <div className="h-40 animate-pulse rounded-[12px] bg-[#e5e7eb]" />
      </div>
    );
  }

  if (!bdc) {
    return (
      <div className="space-y-6">
        <Link
          to="/admin/bons-de-commande"
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-1.5 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>
        <p className="text-sm text-[#6b7280]">BDC non trouvé</p>
      </div>
    );
  }

  const remainingPct = bdc.totalDays > 0 ? Math.round((bdc.daysLeft / bdc.totalDays) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/admin/bons-de-commande"
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-1.5 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>
        <button
          onClick={() => setEditModalOpen(true)}
          title="Modifier le BDC"
          className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
        >
          <Pencil size={14} className="md:hidden" />
          <span className="hidden md:inline">Modifier</span>
        </button>
      </div>

      <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#111111]">{bdc.bdc}</h1>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
              bdc.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <Activity className="h-3 w-3" />
            {bdc.isActive ? 'Actif' : 'Inactif'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <FileText className="h-4 w-4" />
              Contrat
            </div>
            <p className="text-sm font-medium text-[#111111]">
              {bdc.contract?.ref ?? '—'}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Hash className="h-4 w-4" />
              Client
            </div>
            <p className="text-sm font-medium text-[#111111]">
              {bdc.contract?.client?.raison_sociale ?? '—'}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Hash className="h-4 w-4" />
              Mission
            </div>
            {bdc.missionId ? (
              <p className="text-sm font-medium text-[#111111]">
                {bdc.mission?.title ?? '—'}
              </p>
            ) : (
              <p className="text-sm text-[#6b7280]">Non assignée</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Clock className="h-4 w-4" />
              Jours Total
            </div>
            <p className="text-sm font-medium text-[#111111]">{bdc.totalDays}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Clock className="h-4 w-4" />
              Jours Restants
            </div>
            <p className={`text-sm font-medium ${bdc.daysLeft > 0 ? 'text-[#111111]' : 'text-[#ef4444]'}`}>
              {bdc.daysLeft}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Calendar className="h-4 w-4" />
              Date de début
            </div>
            <p className="text-sm font-medium text-[#111111]">{bdc.startDate?.slice(0, 10) ?? '—'}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Calendar className="h-4 w-4" />
              Date de fin
            </div>
            <p className="text-sm font-medium text-[#111111]">{bdc.endDate?.slice(0, 10) ?? '—'}</p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6b7280]">Consommation</span>
            <span className="font-medium text-[#111111]">
              {bdc.totalDays - bdc.daysLeft} / {bdc.totalDays} jours
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#e5e7eb]">
            <div
              className={`h-2 rounded-full transition-all ${
                remainingPct > 50 ? 'bg-[#10b981]' : remainingPct > 20 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
              }`}
              style={{ width: `${remainingPct}%` }}
            />
          </div>
          <p className="text-xs text-[#6b7280]">{remainingPct}% restant</p>
        </div>
      </div>

      {(bdc.consumedBy && bdc.consumedBy.length > 0) && (
        <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Historique de consommation</h2>
          <div className="space-y-2">
            {bdc.consumedBy.map((c, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-[8px] border border-[#e5e7eb] px-4 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-[#111111]">
                    Facture {c.invoice?.ref ?? c.invoiceRef}
                  </p>
                  {c.invoice?.issueDate && (
                    <p className="text-xs text-[#6b7280]">
                      {c.invoice.issueDate.slice(0, 10)}
                    </p>
                  )}
                </div>
                <span className="text-sm font-medium text-[#111111]">{c.daysConsumed} jours</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#111111]">Documents</h2>
          <div>
            <input
              id="bdc-upload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <label
              htmlFor="bdc-upload"
              className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] bg-primary-blue px-3 py-2 text-xs font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <FileText className="h-3 w-3" />
              {uploading ? 'Upload...' : 'Ajouter des documents'}
            </label>
          </div>
        </div>

        {(!bdc.attachments || bdc.attachments.length === 0) ? (
          <p className="text-sm text-[#6b7280]">Aucun document attaché</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {bdc.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-3 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#eff6ff]">
                  <FileText className="h-5 w-5 text-[#3b82f6]" />
                </div>
                <div className="min-w-0 flex-1">
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs md:text-sm font-medium text-[#111111] hover:underline"
                  >
                    {truncateFilename(att.filename)}
                  </a>
                  <p className="text-xs text-[#6b7280]">Document</p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadFile(att.url, att.filename)}
                  title="Telecharger"
                  className="cursor-pointer rounded p-2 text-[#6b7280] transition-colors hover:bg-[#4cd64e4d] hover:text-[#111111]"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Modifier le BDC"
        size="lg"
      >
        <BdcForm
          key={bdc.id}
          bdc={bdc}
          onSuccess={() => setEditModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
