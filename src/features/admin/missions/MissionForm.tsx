import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { parseApiError } from '../../../utils/errorParser';
import { useMutateMission, useUpdateMission } from '../../../hooks/useMissions';
import type { Mission } from '../../../hooks/useMissions';
import { useGetContracts } from '../../../hooks/useContracts';
import { useGetConsultants } from '../../../hooks/useConsultants';
import DatePicker from '../../../components/common/DatePicker';
import LoadingOverlay from '../../../components/common/LoadingOverlay';

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

    const newErrors: Record<string, string> = {};
    if (!isEdit && !form.contractId) newErrors.contractId = 'Ce champ est requis';
    if (!isEdit && !form.consultantId) newErrors.consultantId = 'Ce champ est requis';
    if (!form.title) newErrors.title = 'Ce champ est requis';
    if (!form.startDate) newErrors.startDate = 'Ce champ est requis';
    if (form.startDate && form.endDate && form.startDate >= form.endDate) {
      newErrors.endDate = 'La date de fin doit être postérieure à la date de début';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (isEdit) {
      const normalize = (d: string) => d ? d.slice(0, 10) : '';
      const origStart = normalize(mission!.startDate);
      const origEnd = normalize(mission!.endDate ?? '');
      const curStart = normalize(form.startDate);
      const curEnd = normalize(form.endDate);
      const patchData: Record<string, unknown> = {};
      if (form.title !== mission!.title) patchData.title = form.title;
      if (curStart !== origStart) patchData.startDate = curStart;
      if (curEnd !== origEnd) {
        if (curEnd) patchData.endDate = curEnd;
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
          startDate: form.startDate,
          endDate: form.endDate || undefined,
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
      ]
    : [
        { key: 'contractId', label: 'Contrat', required: true, type: 'select', options: (contractsData?.data ?? []).map((c) => ({ id: c.id, ref: c.ref })) },
        { key: 'consultantId', label: 'Consultant', required: true, type: 'select', options: activeConsultants.map((c) => ({ id: c.id, name: c.name })) },
        { key: 'title', label: 'Titre', required: true },
        { key: 'startDate', label: 'Date de début', required: true, type: 'date' },
        { key: 'endDate', label: 'Date de fin', required: false, type: 'date' },
      ];

  return (
    <LoadingOverlay isLoading={mutation.isPending}>
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-red-500">(*) Champ obligatoire</p>
      {FIELDS.map(({ key, label, required, type, options }) => (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium text-[#111111]">
            {label}
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
            <DatePicker
              value={String((form as Record<string, string>)[key] ?? '')}
              onChange={(val) => handleChange(key, val)}
              error={errors[key]}
            />
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
          {type !== 'date' && errors[key] && (
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
          Ordre de mission, Planning, Fiche de présence ... (Optionnel)
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
          disabled={mutation.isPending}
          className="cursor-pointer rounded-[8px] bg-primary-blue px-6 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
    </LoadingOverlay>
  );
}
