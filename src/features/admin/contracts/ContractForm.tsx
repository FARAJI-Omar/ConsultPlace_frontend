import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { parseApiError } from '../../../utils/errorParser';
import { useMutateContract, useUpdateContract } from '../../../hooks/useContracts';
import type { Contract } from '../../../hooks/useContracts';
import { useGetClients } from '../../../hooks/useClients';
import LoadingOverlay from '../../../components/common/LoadingOverlay';

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

interface ContractFormProps {
  onSuccess: () => void;
  contract?: Contract;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function ContractForm({ onSuccess, contract }: ContractFormProps) {
  const isEdit = !!contract;
  const [form, setForm] = useState({
    clientId: contract?.clientId?.toString() ?? '',
    startDate: contract?.startDate ?? '',
    endDate: contract?.endDate ?? '',
    profile: contract?.profile ?? '',
    dailyRate: contract?.dailyRate?.toString() ?? '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: clientsData } = useGetClients(1, 100);
  const createMutation = useMutateContract();
  const updateMutation = useUpdateContract();
  const mutation = isEdit ? updateMutation : createMutation;

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

    const conv = (v: string) => v && v.includes('/') ? toStorageDate(v) : v;
    const f = { ...form, startDate: conv(form.startDate), endDate: conv(form.endDate) };

    const newErrors: Record<string, string> = {};
    if (!isEdit && !f.clientId) newErrors.clientId = 'Ce champ est requis';
    if (!f.startDate) newErrors.startDate = 'Ce champ est requis';
    if (!f.endDate) newErrors.endDate = 'Ce champ est requis';
    if (!f.profile) newErrors.profile = 'Ce champ est requis';
    if (!f.dailyRate) {
      newErrors.dailyRate = 'Ce champ est requis';
    } else if (Number(f.dailyRate) <= 0) {
      newErrors.dailyRate = 'Le taux journalier doit être un nombre positif';
    }
    if (f.startDate && f.startDate.includes('/') && getDateError(f.startDate)) {
      newErrors.startDate = getDateError(f.startDate);
    }
    if (f.endDate && f.endDate.includes('/') && getDateError(f.endDate)) {
      newErrors.endDate = getDateError(f.endDate);
    }
    if (f.startDate && f.endDate && !newErrors.startDate && !newErrors.endDate && f.startDate >= f.endDate) {
      newErrors.endDate = 'La date de fin doit être postérieure à la date de début';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (isEdit) {
      const normalize = (d: string) => d.slice(0, 10);
      const origStart = normalize(contract!.startDate);
      const origEnd = normalize(contract!.endDate);
      const curStart = normalize(f.startDate);
      const curEnd = normalize(f.endDate);
      const patchData: Record<string, unknown> = {};
      if (curStart !== origStart) patchData.startDate = curStart;
      if (curEnd !== origEnd) patchData.endDate = curEnd;
      if (f.profile !== contract!.profile) patchData.profile = f.profile;
      if (Number(f.dailyRate) !== contract!.dailyRate) patchData.dailyRate = Number(f.dailyRate);
      if (files.length > 0) patchData.files = files;
      if (deletedAttachmentIds.length > 0) patchData.deleteAttachmentIds = deletedAttachmentIds;
      if (Object.keys(patchData).length === 0) {
        toast.error('Aucune modification détectée');
        return;
      }
      updateMutation.mutate(
        { id: contract!.id, data: patchData },
        {
          onSuccess: () => {
            toast.success('Contrat modifié avec succès');
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
          clientId: Number(f.clientId),
          startDate: f.startDate,
          endDate: f.endDate,
          profile: f.profile,
          dailyRate: Number(f.dailyRate),
          files: files.length > 0 ? files : undefined,
        },
        {
          onSuccess: () => {
            toast.success('Contrat créé avec succès');
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
    }
  };

  const existingDocs = isEdit ? (contract?.attachments ?? contract?.documents ?? []) : [];

  const FIELDS = isEdit
    ? [
        { key: 'startDate', label: 'Date de début', required: true, type: 'date' },
        { key: 'endDate', label: 'Date de fin', required: true, type: 'date' },
        { key: 'profile', label: 'Profil', required: true },
        { key: 'dailyRate', label: 'Taux journalier (DH)', required: true, type: 'number' },
      ]
    : [
        { key: 'clientId', label: 'Client', required: true, type: 'select' },
        { key: 'startDate', label: 'Date de début', required: true, type: 'date' },
        { key: 'endDate', label: 'Date de fin', required: true, type: 'date' },
        { key: 'profile', label: 'Profil', required: true },
        { key: 'dailyRate', label: 'Taux journalier (DH)', required: true, type: 'number' },
      ];

  return (
    <LoadingOverlay isLoading={mutation.isPending}>
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-red-500">(*) Champ obligatoire</p>
      {FIELDS.map(({ key, label, required, type }) => (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium text-[#111111]">
            {label}{type === 'date' ? ' (jj/mm/aaaa)' : ''}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {type === 'select' ? (
            <select
              value={form.clientId}
              onChange={(e) => handleChange('clientId', e.target.value)}
              disabled={isEdit}
              className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
                errors.clientId ? 'border-red-500' : 'border-[#e5e7eb]'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <option value="">Sélectionner un client</option>
              {(clientsData?.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.raison_sociale}
                </option>
              ))}
            </select>
          ) : type === 'date' ? (
            <input
              type="text"
              placeholder="jj/mm/aaaa"
              value={toDisplayDate(String((form as Record<string, string>)[key] ?? ''))}
              onChange={(e) => {
                const raw = e.target.value;
                setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
                handleChange(key, raw);
                if (raw) {
                  const err = getDateError(raw);
                  if (err) setErrors((prev) => ({ ...prev, [key]: err }));
                }
              }}
              autoComplete="off"
              className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
                errors[key] ? 'border-red-500' : 'border-[#e5e7eb]'
              }`}
            />
          ) : (
            <input
              type={type ?? 'text'}
              value={String((form as Record<string, string>)[key] ?? '')}
              onChange={(e) => handleChange(key, e.target.value)}
              min={type === 'number' ? 0 : undefined}
              className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
                errors[key] ? 'border-red-500' : 'border-[#e5e7eb]'
              }`}
            />
          )}
          {errors[key] && (
            <p className="mt-1 text-xs text-red-500">{errors[key]}</p>
          )}
        </div>
      ))}

      {existingDocs.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-[#111111]">
            Documents existants
          </label>
          <ul className="space-y-1">
            {existingDocs.map((att) => {
              const isDeleted = deletedAttachmentIds.includes(att.id);
              return (
                <li key={att.id} className={`flex items-center justify-between rounded px-3 py-1.5 text-sm ${isDeleted ? 'bg-red-50 text-[#6b7280] line-through' : 'bg-[#f9fafb] text-[#111111]'}`}>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:underline"
                  >
                    {att.filename}
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
          Bon de commande, Cahier des charges, Devis ... (Optionnel)
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
