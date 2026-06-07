import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { parseApiError } from '../../../utils/errorParser';
import { useMutateMission, useUpdateMission } from '../../../hooks/useMissions';
import type { Mission } from '../../../hooks/useMissions';
import { useGetContracts } from '../../../hooks/useContracts';
import { useGetConsultants } from '../../../hooks/useConsultants';
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

interface MissionFormProps {
  onSuccess: () => void;
  mission?: Mission;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function MissionForm({ onSuccess, mission }: MissionFormProps) {
  const isEdit = !!mission;
  const [form, setForm] = useState({
    contractId: mission?.contractId?.toString() ?? '',
    consultantId: mission?.consultantId?.toString() ?? '',
    title: mission?.title ?? '',
    startDate: mission?.startDate ?? '',
    endDate: mission?.endDate ?? '',
    missionDailyRate: mission?.missionDailyRate?.toString() ?? '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: contractsData } = useGetContracts(1, 200);
  const { data: consultantsData } = useGetConsultants(1, 200);
  const activeConsultants = (consultantsData?.data ?? []).filter((c) => c.isActive);
  const createMutation = useMutateMission();
  const updateMutation = useUpdateMission();
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
    const f = { ...form, startDate: conv(form.startDate), endDate: conv(form.endDate ?? '') };

    const newErrors: Record<string, string> = {};
    if (!isEdit && !f.contractId) newErrors.contractId = 'Ce champ est requis';
    if (!isEdit && !f.consultantId) newErrors.consultantId = 'Ce champ est requis';
    if (!f.title) newErrors.title = 'Ce champ est requis';
    if (!f.startDate) newErrors.startDate = 'Ce champ est requis';
    if (!f.missionDailyRate || parseFloat(f.missionDailyRate) <= 0) newErrors.missionDailyRate = 'Le taux journalier doit être supérieur à 0';
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
      const normalize = (d: string) => d ? d.slice(0, 10) : '';
      const origStart = normalize(mission!.startDate);
      const origEnd = normalize(mission!.endDate ?? '');
      const curStart = normalize(f.startDate);
      const curEnd = normalize(f.endDate);
      const patchData: Record<string, unknown> = {};
      if (f.title !== mission!.title) patchData.title = f.title;
      if (curStart !== origStart) patchData.startDate = curStart;
      if (curEnd !== origEnd) {
        patchData.endDate = curEnd || null;
      }
      if (f.missionDailyRate && parseFloat(f.missionDailyRate) !== (mission!.missionDailyRate ?? 0)) {
        patchData.missionDailyRate = parseFloat(f.missionDailyRate);
      }
      if (files.length > 0) patchData.files = files;
      if (deletedAttachmentIds.length > 0) patchData.deleteAttachmentIds = deletedAttachmentIds;
      if (Object.keys(patchData).length === 0) {
        toast.error('Aucune modification détectée');
        return;
      }
      updateMutation.mutate(
        { id: mission!.id, data: patchData },
        {
          onSuccess: () => {
            toast.success('Mission modifiée avec succès');
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
          contractId: Number(form.contractId),
          consultantId: Number(form.consultantId),
          title: form.title,
          startDate: f.startDate,
          endDate: f.endDate || undefined,
          missionDailyRate: parseFloat(form.missionDailyRate),
          files: files.length > 0 ? files : undefined,
        },
        {
          onSuccess: () => {
            toast.success('Mission créée avec succès');
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

  const existingDocs = isEdit ? (mission?.attachments ?? []) : [];

  const FIELDS: { key: string; label: string; required: boolean; type?: string; options?: { id: number; ref?: string; name?: string }[] }[] = isEdit
    ? [
        { key: 'title', label: 'Titre', required: true },
        { key: 'startDate', label: 'Date de début', required: true, type: 'date' },
        { key: 'endDate', label: 'Date de fin', required: false, type: 'date' },
        { key: 'missionDailyRate', label: 'Taux journalier consultant (DH)', required: true },
      ]
    : [
        { key: 'contractId', label: 'Contrat', required: true, type: 'select', options: (contractsData?.data ?? []).map((c) => ({ id: c.id, ref: c.ref })) },
        { key: 'consultantId', label: 'Consultant', required: true, type: 'select', options: activeConsultants.map((c) => ({ id: c.id, name: c.name })) },
        { key: 'title', label: 'Titre', required: true },
        { key: 'startDate', label: 'Date de début', required: true, type: 'date' },
        { key: 'endDate', label: 'Date de fin', required: false, type: 'date' },
        { key: 'missionDailyRate', label: 'Taux journalier consultant (DH)', required: true },
      ];

  return (
    <LoadingOverlay isLoading={mutation.isPending}>
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-red-500">(*) Champ obligatoire</p>
      {FIELDS.map(({ key, label, required, type, options }) => (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium text-[#111111]">
            {label}{type === 'date' ? ' (jj/mm/aaaa)' : ''}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {type === 'select' ? (
            <select
              value={String((form as Record<string, string>)[key] ?? '')}
              onChange={(e) => handleChange(key, e.target.value)}
              disabled={isEdit}
              className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
                errors[key] ? 'border-red-500' : 'border-[#e5e7eb]'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <option value="">Sélectionner</option>
              {(options ?? []).map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.ref ?? opt.name ?? String(opt.id)}
                </option>
              ))}
            </select>
          ) : type === 'date' ? (
            <div className="flex items-center gap-2">
              <div className="flex-1">
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
              </div>
              {isEdit && key === 'endDate' && form.endDate && (
                <button
                  type="button"
                  onClick={() => handleChange('endDate', '')}
                  className="cursor-pointer rounded p-1 text-[#6b7280] transition-colors hover:text-red-500"
                  title="Enlever la date de fin"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <input
              type={type ?? 'text'}
              value={String((form as Record<string, string>)[key] ?? '')}
              onChange={(e) => handleChange(key, e.target.value)}
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
          Ordre de mission, Planning ... (Optionnel)
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
