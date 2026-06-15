import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { parseApiError } from '../../../utils/errorParser';
import { cleanFilename } from '../../../lib/utils';
import { useCreateBdc, useUpdateBdc } from '../../../hooks/useBdc';
import { useGetClients } from '../../../hooks/useClients';
import { useGetContracts } from '../../../hooks/useContracts';
import LoadingOverlay from '../../../components/common/LoadingOverlay';
import type { BonDeCommande } from '../../../types/models';

function toDisplayDate(val: string): string {
  if (!val) return '';
  const iso = val.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  return val;
}

function toStorageDate(ddmm: string): string {
  const parts = ddmm.split('/');
  if (parts.length !== 3) return ddmm;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function getDateError(val: string): string {
  if (!val) return '';
  const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return 'Format de date invalide (jj/mm/aaaa)';
  const [, dd, mm, yyyy] = m;
  const d = new Date(+yyyy, +mm - 1, +dd);
  if (d.getDate() !== +dd || d.getMonth() !== +mm - 1 || d.getFullYear() !== +yyyy) {
    return `Le jour ${dd} n'existe pas pour le mois ${mm}/${yyyy}`;
  }
  return '';
}

interface BdcFormProps {
  onSuccess: () => void;
  bdc?: BonDeCommande;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function BdcForm({ onSuccess, bdc }: BdcFormProps) {
  const isEdit = !!bdc;
  const [form, setForm] = useState({
    bdc: bdc?.bdc ?? '',
    clientId: bdc?.contract?.client?.id?.toString() ?? '',
    contractId: bdc?.contractId?.toString() ?? '',
    totalDays: bdc?.totalDays ? String(bdc.totalDays) : '',
    startDate: bdc?.startDate ? toDisplayDate(bdc.startDate) : '',
    endDate: bdc?.endDate ? toDisplayDate(bdc.endDate) : '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: clientsData } = useGetClients(1, 200);
  const { data: contractsData } = useGetContracts(1, 200);
  const createMutation = useCreateBdc();
  const updateMutation = useUpdateBdc();
  const mutation = isEdit ? updateMutation : createMutation;

  const selectedClientId = Number(form.clientId);
  const clientContracts = (contractsData?.data ?? []).filter(
    (c) => c.clientId === selectedClientId && !c.isArchived,
  );

  useEffect(() => {
    if (form.clientId !== (bdc?.contract?.client?.id?.toString() ?? '')) {
      setForm((prev) => ({ ...prev, contractId: '' }));
    }
  }, [form.clientId]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const remaining = MAX_FILES - files.length;
    const allowed = selected.slice(0, remaining);

    const oversized = allowed.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error('Certains fichiers dépassent la limite de 10 Mo');
      return;
    }

    setFiles((prev) => [...prev, ...allowed]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!form.bdc.trim()) newErrors.bdc = 'Ce champ est requis';
    if (!form.contractId) newErrors.contractId = 'Ce champ est requis';
    if (!form.totalDays || parseFloat(form.totalDays) <= 0) newErrors.totalDays = 'Le nombre de jours doit être supérieur à 0';
    if (!form.startDate) newErrors.startDate = 'Ce champ est requis';
    if (form.startDate && getDateError(form.startDate)) newErrors.startDate = getDateError(form.startDate);
    if (form.endDate && getDateError(form.endDate)) newErrors.endDate = getDateError(form.endDate);
    if (form.startDate && form.endDate && !newErrors.startDate && !newErrors.endDate) {
      const start = toStorageDate(form.startDate);
      const end = toStorageDate(form.endDate);
      if (start >= end) newErrors.endDate = 'La date de fin doit être postérieure à la date de début';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const startDate = toStorageDate(form.startDate);
    const endDate = form.endDate ? toStorageDate(form.endDate) : undefined;

    if (isEdit) {
      const patchData: Record<string, unknown> = {};
      if (form.bdc.trim() !== bdc!.bdc) patchData.bdc = form.bdc.trim();
      if (form.totalDays !== String(bdc!.totalDays)) patchData.totalDays = parseFloat(form.totalDays);
      if (startDate !== bdc!.startDate.slice(0, 10)) patchData.startDate = startDate;
      const origEnd = bdc!.endDate ? bdc!.endDate.slice(0, 10) : '';
      const curEnd = endDate ?? '';
      if (curEnd !== origEnd) patchData.endDate = curEnd || null;
      if (files.length > 0) patchData.files = files;
      if (deletedAttachmentIds.length > 0) patchData.deleteAttachmentIds = deletedAttachmentIds;
      if (Object.keys(patchData).length === 0) {
        toast.error('Aucune modification détectée');
        return;
      }
      updateMutation.mutate(
        { id: bdc!.id, data: patchData as Parameters<typeof updateMutation.mutate>[0]['data'] },
        {
          onSuccess: () => {
            toast.success('BDC modifié avec succès');
            onSuccess();
          },
          onError: (err) => {
            const fieldErrors = parseApiError(err);
            if (fieldErrors) {
              setErrors(fieldErrors);
            } else {
              const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
              toast.error(axiosErr.response?.data?.error?.message ?? "Une erreur est survenue lors de l'enregistrement");
            }
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          bdc: form.bdc.trim(),
          contractId: Number(form.contractId),
          totalDays: parseFloat(form.totalDays),
          startDate,
          endDate,
          files: files.length > 0 ? files : undefined,
        },
        {
          onSuccess: () => {
            toast.success('BDC créé avec succès');
            onSuccess();
          },
          onError: (err) => {
            const fieldErrors = parseApiError(err);
            if (fieldErrors) {
              setErrors(fieldErrors);
            } else {
              const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
              toast.error(axiosErr.response?.data?.error?.message ?? "Une erreur est survenue lors de la création");
            }
          },
        },
      );
    }
  };

  return (
    <LoadingOverlay isLoading={mutation.isPending}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-red-500">(*) Champ obligatoire</p>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#111111]">
            Référence BDC <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.bdc}
            onChange={(e) => handleChange('bdc', e.target.value)}
            className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
              errors.bdc ? 'border-red-500' : 'border-[#e5e7eb]'
            }`}
          />
          {errors.bdc && <p className="mt-1 text-xs text-red-500">{errors.bdc}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#111111]">
            Client <span className="text-red-500">*</span>
          </label>
          <select
            value={form.clientId}
            onChange={(e) => handleChange('clientId', e.target.value)}
            disabled={isEdit}
            className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
              errors.clientId ? 'border-red-500' : 'border-[#e5e7eb]'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <option value="">Sélectionner un client</option>
            {(clientsData?.data ?? []).map((client) => (
              <option key={client.id} value={client.id}>
                {client.raison_sociale}
              </option>
            ))}
          </select>
          {errors.clientId && <p className="mt-1 text-xs text-red-500">{errors.clientId}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#111111]">
            Contrat <span className="text-red-500">*</span>
          </label>
          <select
            value={form.contractId}
            onChange={(e) => handleChange('contractId', e.target.value)}
            disabled={isEdit || !form.clientId}
            className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
              errors.contractId ? 'border-red-500' : 'border-[#e5e7eb]'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <option value="">Sélectionner un contrat</option>
            {clientContracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.ref} {contract.profile ? `— ${contract.profile}` : ''}
              </option>
            ))}
          </select>
          {errors.contractId && <p className="mt-1 text-xs text-red-500">{errors.contractId}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#111111]">
            Jours Total <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={form.totalDays}
            onChange={(e) => handleChange('totalDays', e.target.value)}
            className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
              errors.totalDays ? 'border-red-500' : 'border-[#e5e7eb]'
            }`}
          />
          {errors.totalDays && <p className="mt-1 text-xs text-red-500">{errors.totalDays}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#111111]">
            Date de début (jj/mm/aaaa) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="jj/mm/aaaa"
            value={form.startDate}
            onChange={(e) => {
              const raw = e.target.value;
              handleChange('startDate', raw);
              if (raw) {
                const err = getDateError(raw);
                if (err) setErrors((prev) => ({ ...prev, startDate: err }));
              }
            }}
            autoComplete="off"
            className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
              errors.startDate ? 'border-red-500' : 'border-[#e5e7eb]'
            }`}
          />
          {errors.startDate && <p className="mt-1 text-xs text-red-500">{errors.startDate}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#111111]">
            Date de fin (jj/mm/aaaa)
          </label>
          <input
            type="text"
            placeholder="jj/mm/aaaa"
            value={form.endDate}
            onChange={(e) => {
              const raw = e.target.value;
              handleChange('endDate', raw);
              if (raw) {
                const err = getDateError(raw);
                if (err) setErrors((prev) => ({ ...prev, endDate: err }));
              }
            }}
            autoComplete="off"
            className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
              errors.endDate ? 'border-red-500' : 'border-[#e5e7eb]'
            }`}
          />
          {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate}</p>}
        </div>

        {isEdit && (bdc?.attachments?.length ?? 0) > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-[#111111]">
              Documents existants
            </label>
            <ul className="space-y-1">
              {(bdc?.attachments ?? []).map((att) => {
                const isDeleted = deletedAttachmentIds.includes(att.id);
                return (
                  <li key={att.id} className={`flex items-center justify-between rounded px-3 py-1.5 text-sm ${isDeleted ? 'bg-red-50 text-[#6b7280] line-through' : 'bg-[#f9fafb] text-[#111111]'}`}>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:underline"
                    >
                      {cleanFilename(att.filename)}
                    </a>
                    {!isDeleted ? (
                      <button
                        type="button"
                        onClick={() => setDeletedAttachmentIds((prev) => [...prev, att.id])}
                        className="cursor-pointer rounded p-0.5 text-[#6b7280] transition-colors hover:text-red-500"
                        title="Supprimer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletedAttachmentIds((prev) => prev.filter((id) => id !== att.id))}
                        className="cursor-pointer text-xs text-primary-blue hover:underline"
                      >
                        Annuler
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-[#111111]">
            Nouveaux documents (Optionnel)
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-dashed border-[#e5e7eb] px-3 py-4 text-sm text-[#6b7280] transition-colors hover:border-primary-blue hover:text-primary-blue flex-nowrap"
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span className="shrink-0">Cliquez pour ajouter des fichiers</span>
            <span className="text-xs text-[#6b7280] shrink-0">(PDF, JPG, PNG, max 10 fichiers, 10 Mo chacun)</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((file, i) => (
                <li key={i} className="flex items-center justify-between rounded bg-[#f9fafb] px-3 py-1.5 text-sm text-[#111111]">
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="cursor-pointer rounded p-0.5 text-[#6b7280] transition-colors hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {files.length < MAX_FILES && (
                <li
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer text-xs text-primary-blue hover:underline"
                >
                  + Ajouter plus de fichiers
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onSuccess}
            className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-6 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || Object.keys(errors).length > 0}
            className="cursor-pointer rounded-[8px] bg-primary-blue px-6 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </form>
    </LoadingOverlay>
  );
}
