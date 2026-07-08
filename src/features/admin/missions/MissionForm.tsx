import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Upload, X, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import Select from 'react-select';
import { parseApiError } from '../../../utils/errorParser';
import { truncateFilename } from '../../../lib/utils';
import { useMutateMission, useUpdateMission } from '../../../hooks/useMissions';
import { useImageCompression } from '../../../hooks/useImageCompression';
import type { Mission } from '../../../hooks/useMissions';
import { useGetContracts } from '../../../hooks/useContracts';
import { useGetConsultants } from '../../../hooks/useConsultants';
import { useGetBdcsByContract } from '../../../hooks/useBdc';
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
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    contractId: mission?.contractId?.toString() ?? '',
    title: mission?.title ?? '',
    startDate: mission?.startDate ?? '',
    endDate: mission?.endDate ?? '',
  });
  const [selectedConsultants, setSelectedConsultants] = useState<{ value: number; label: string }[]>(
    mission?.consultants?.map((mc) => ({ value: mc.consultantId, label: mc.consultant.name })) ?? [],
  );
  const [consultantRates, setConsultantRates] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    mission?.consultants?.forEach((mc) => { init[mc.consultantId] = String(mc.dailyRate); });
    return init;
  });
  const [selectedBdcIds, setSelectedBdcIds] = useState<number[]>(
    mission?.bdcs?.map((b) => b.id) ?? [],
  );
  const [files, setFiles] = useState<File[]>([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  const { data: contractsData } = useGetContracts(1, 200);
  const { data: consultantsData } = useGetConsultants(1, 200);
  const activeConsultants = (consultantsData?.data ?? []).filter((c) => c.isActive);
  const createMutation = useMutateMission();
  const updateMutation = useUpdateMission();
  const mutation = isEdit ? updateMutation : createMutation;
  const { trackFiles, untrackFile, getCompressedFiles, isCompressing, compressingFiles } = useImageCompression();

  const contractIdNum = Number(form.contractId);
  const { data: bdcsData } = useGetBdcsByContract(isEdit ? mission?.contractId : contractIdNum);
  const availableBdcs = (bdcsData ?? []).filter((b) => b.isActive || selectedBdcIds.includes(b.id));

  useEffect(() => {
    if (!isEdit && form.contractId) {
      setSelectedBdcIds([]);
    }
  }, [form.contractId, isEdit]);

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

    const invalid = allowed.find((f) => !f.type.includes('pdf') && !f.name.toLowerCase().endsWith('.pdf'));
    if (invalid) {
      toast.error('Seuls les fichiers PDF sont acceptés.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    const oversized = allowed.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error('Certains fichiers dépassent la limite de 10 Mo');
      return;
    }

    setFiles((prev) => [...prev, ...allowed]);
    trackFiles(allowed);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed) untrackFile(removed);
      return prev.filter((_, i) => i !== index);
    });
  };

  const validateStep1 = (): boolean => {
    setErrors({});
    const conv = (v: string) => v && v.includes('/') ? toStorageDate(v) : v;
    const f = { ...form, startDate: conv(form.startDate), endDate: conv(form.endDate ?? '') };

    const newErrors: Record<string, string> = {};
    if (!isEdit && !f.contractId) newErrors.contractId = 'Ce champ est requis';
    if (!isEdit && selectedConsultants.length === 0) newErrors.consultantIds = 'Sélectionnez au moins un consultant';
    if (!f.title) newErrors.title = 'Ce champ est requis';
    if (!f.startDate) newErrors.startDate = 'Ce champ est requis';
    const relevantConsultants = isEdit
      ? (mission?.consultants ?? []).map((mc) => mc.consultantId)
      : selectedConsultants.map((c) => c.value);
    for (const cId of relevantConsultants) {
      const rate = consultantRates[cId];
      if (!rate || parseFloat(rate) <= 0) {
        newErrors[`rate_${cId}`] = 'Le taux journalier doit être supérieur à 0';
      }
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
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setErrors({});

    const conv = (v: string) => v && v.includes('/') ? toStorageDate(v) : v;
    const f = { ...form, startDate: conv(form.startDate), endDate: conv(form.endDate ?? '') };

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
      const changedRates: { consultantId: number; dailyRate: number }[] = [];
      for (const mc of mission!.consultants ?? []) {
        const newRate = parseFloat(consultantRates[mc.consultantId] ?? '');
        if (!isNaN(newRate) && newRate !== mc.dailyRate) {
          changedRates.push({ consultantId: mc.consultantId, dailyRate: newRate });
        }
      }
      if (changedRates.length > 0) patchData.consultantRates = changedRates;
      const compressedFiles = files.length > 0 ? await getCompressedFiles(files) : [];
      if (compressedFiles.length > 0) patchData.files = compressedFiles;
      if (deletedAttachmentIds.length > 0) patchData.deleteAttachmentIds = deletedAttachmentIds;
      const origBdcIds = (mission!.bdcs ?? []).map((b) => b.id).sort();
      const newBdcIds = [...selectedBdcIds].sort();
      if (JSON.stringify(origBdcIds) !== JSON.stringify(newBdcIds)) {
        patchData.bdcIds = newBdcIds;
      }
      if (Object.keys(patchData).length === 0) {
        submittingRef.current = false;
        toast.error('Aucune modification détectée');
        return;
      }
      updateMutation.mutate(
        { id: mission!.id, data: patchData as Parameters<typeof updateMutation.mutate>[0]['data'] },
        {
          onSuccess: () => {
            submittingRef.current = false;
            toast.success('Mission modifiée avec succès');
            onSuccess();
          },
          onError: (err) => {
            submittingRef.current = false;
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
      const compressedFiles = files.length > 0 ? await getCompressedFiles(files) : [];
      createMutation.mutate(
        {
          contractId: Number(form.contractId),
          consultants: selectedConsultants.map((c) => ({
            consultantId: c.value,
            dailyRate: parseFloat(consultantRates[c.value] ?? '0'),
          })),
          title: form.title,
          startDate: f.startDate,
          endDate: f.endDate || undefined,
          files: compressedFiles.length > 0 ? compressedFiles : undefined,
          bdcIds: selectedBdcIds.length > 0 ? selectedBdcIds : undefined,
        },
        {
          onSuccess: () => {
            submittingRef.current = false;
            toast.success('Mission créée avec succès');
            onSuccess();
          },
          onError: (err) => {
            submittingRef.current = false;
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

  const FIELDS: { key: string; label: string; required: boolean; type?: string; options?: { id: number; ref?: string; name?: string; profile?: string }[] }[] = isEdit
    ? [
        { key: 'title', label: 'Titre', required: true },
        { key: 'startDate', label: 'Date de début', required: true, type: 'date' },
        { key: 'endDate', label: 'Date de fin', required: false, type: 'date' },
      ]
    : [
        { key: 'contractId', label: 'Contrat', required: true, type: 'select', options: (contractsData?.data ?? []).map((c) => ({ id: c.id, ref: c.ref, profile: c.profile })) },
        { key: 'title', label: 'Titre', required: true },
        { key: 'startDate', label: 'Date de début', required: true, type: 'date' },
        { key: 'endDate', label: 'Date de fin', required: false, type: 'date' },
      ];

  const renderStep1 = () => (
    <div className="space-y-4">
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
                  {opt.ref && opt.profile ? `${opt.ref}\u00A0\u00A0\u00A0____\u00A0\u00A0\u00A0Profil Consultant: ${opt.profile}` : opt.ref ?? opt.name ?? String(opt.id)}
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
          {!isEdit && key === 'contractId' && (
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[#111111]">
                Consultant(s) <span className="text-red-500">*</span>
              </label>
              <Select
                isMulti
                options={activeConsultants.map((c) => ({ value: c.id, label: c.name }))}
                value={selectedConsultants}
                onChange={(newVal) => {
                  const next = [...newVal];
                  setSelectedConsultants(next);
                  setConsultantRates((prev) => {
                    const updated = { ...prev };
                    for (const c of next) {
                      if (!(c.value in updated)) updated[c.value] = '';
                    }
                    return updated;
                  });
                  setErrors((prev) => { const n = { ...prev }; delete n.consultantIds; return n; });
                }}
                placeholder="Sélectionner un ou plusieurs consultants"
                className="text-sm"
                styles={{
                  control: (base, state) => ({
                    ...base,
                    borderRadius: '8px',
                    borderColor: errors.consultantIds ? '#ef4444' : state.isFocused ? '#2451EB' : '#e5e7eb',
                    boxShadow: state.isFocused ? '0 0 0 1px #2451EB' : 'none',
                    '&:hover': { borderColor: '#2451EB' },
                  }),
                }}
              />
              {errors.consultantIds && (
                <p className="mt-1 text-xs text-red-500">{errors.consultantIds}</p>
              )}
              {selectedConsultants.length > 0 && (
                <div className="mt-3 space-y-2 p-2 rounded bg-gray-100/60">
                  <p className="text-sm font-medium text-[#111111]">Taux journalier par consultant <span className="text-red-500">*</span></p>
                  {selectedConsultants.map((c) => (
                    <div key={c.value} className="flex items-center gap-3">
                      <span className="min-w-[140px] text-sm text-[#111111]">{c.label}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Taux (DH)"
                        value={consultantRates[c.value] ?? ''}
                        onChange={(e) => {
                          setConsultantRates((prev) => ({ ...prev, [c.value]: e.target.value }));
                          setErrors((prev) => { const n = { ...prev }; delete n[`rate_${c.value}`]; return n; });
                        }}
                        className={`w-32 rounded-[8px] border px-3 py-1.5 text-sm text-[#111111] bg-white outline-none transition-colors focus:border-primary-blue ${
                          errors[`rate_${c.value}`] ? 'border-red-500' : 'border-[#e5e7eb]'
                        }`}
                      />
                      <span className="text-sm text-[#6b7280]">DH</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {isEdit && key === 'endDate' && (mission?.consultants?.length ?? 0) > 0 && (
            <div className="mt-3 space-y-2 p-2 rounded bg-gray-100/60">
              <p className="text-sm font-medium text-[#111111]">Taux journalier par consultant <span className="text-red-500">*</span></p>
              {mission!.consultants!.map((mc) => (
                <div key={mc.consultantId} className="flex items-center gap-3">
                  <span className="min-w-[140px] text-sm text-[#111111]">{mc.consultant.name}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Taux (DH)"
                    value={consultantRates[mc.consultantId] ?? ''}
                    onChange={(e) => {
                      setConsultantRates((prev) => ({ ...prev, [mc.consultantId]: e.target.value }));
                      setErrors((prev) => { const n = { ...prev }; delete n[`rate_${mc.consultantId}`]; return n; });
                    }}
                    className={`w-32 rounded-[8px] border px-3 py-1.5 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
                      errors[`rate_${mc.consultantId}`] ? 'border-red-500' : 'border-[#e5e7eb]'
                    }`}
                  />
                  <span className="text-sm text-[#6b7280]">DH</span>
                </div>
              ))}
            </div>
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
                <li key={att.id} className={`flex items-center justify-between rounded px-3 py-1.5 text-xs md:text-sm ${isDeleted ? 'bg-red-50 text-[#6b7280] line-through' : 'bg-[#f9fafb] text-[#111111]'}`}>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:underline"
                  >
                    {truncateFilename(att.filename)}
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
className="flex cursor-pointer flex-wrap items-center gap-1 rounded-[8px] border border-dashed border-[#e5e7eb] px-3 py-4 text-sm text-[#6b7280] transition-colors hover:border-primary-blue hover:text-primary-blue"
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span>Cliquez pour ajouter des fichiers</span>
            <span className="w-full text-[8px] md:text-xs text-[#6b7280]">(PDF, max 10 fichiers, 10 Mo chacun)</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((file, i) => (
              <li key={i} className="flex items-center justify-between rounded bg-[#f9fafb] px-3 py-1.5 text-xs md:text-sm text-[#111111]">
                <span className="truncate">{truncateFilename(file.name)}</span>
                {compressingFiles.has(file) && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6b7280] shrink-0 ml-1" />
                )}
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
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-[#6b7280]">
        <ChevronRight className="h-4 w-4" />
        <span>Sélectionnez les bons de commande à associer à cette mission</span>
      </div>

      {availableBdcs.length === 0 ? (
        <div className="rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] p-4 text-center">
          <p className="text-sm text-[#6b7280]">Aucun bon de commande disponible pour ce contrat</p>
          <p className="text-xs text-[#6b7280] mt-1">Vous pouvez créer un BDC depuis la page Bons de commande</p>
        </div>
      ) : (
        <div className="space-y-2">
          {availableBdcs.map((bdc) => {
            const isSelected = selectedBdcIds.includes(bdc.id);
            const remainingPct = bdc.totalDays > 0 ? Math.round((bdc.daysLeft / bdc.totalDays) * 100) : 0;
            return (
              <div
                key={bdc.id}
                onClick={() => {
                  setSelectedBdcIds((prev) =>
                    isSelected ? prev.filter((id) => id !== bdc.id) : [...prev, bdc.id],
                  );
                }}
                className={`cursor-pointer rounded-[8px] border p-3 transition-colors ${
                  isSelected
                    ? 'border-primary-blue bg-[#EFF6FF]'
                    : 'border-[#e5e7eb] bg-[#ffffff] hover:bg-[#f9fafb]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4 cursor-pointer accent-primary-blue"
                    />
                    <div>
                      <p className="text-sm font-medium text-[#111111]">{bdc.bdc}</p>
                      <p className="text-xs text-[#6b7280]">
                        {bdc.daysLeft} / {bdc.totalDays} jours restants
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-[#e5e7eb]">
                      <div
                        className={`h-2 rounded-full ${
                          remainingPct > 50 ? 'bg-[#10b981]' : remainingPct > 20 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
                        }`}
                        style={{ width: `${remainingPct}%` }}
                      />
                    </div>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        bdc.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {bdc.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between rounded-[8px] bg-[#f9fafb] p-3">
        <span className="text-sm text-[#6b7280]">BDCs sélectionnés</span>
        <span className="text-sm font-medium text-[#111111]">{selectedBdcIds.length}</span>
      </div>
    </div>
  );

  return (
    <LoadingOverlay isLoading={mutation.isPending}>
      <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter' && step === 1) e.preventDefault(); }} className="space-y-4">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}

        <div className="flex justify-end gap-3 pt-2">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] border border-[#e5e7eb] px-6 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </button>
          )}
          <button
            type="button"
            onClick={onSuccess}
            className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-6 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
          >
            Annuler
          </button>
          {step === 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] bg-primary-blue px-6 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={mutation.isPending || isCompressing}
              className="cursor-pointer rounded-[8px] bg-primary-blue px-6 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending ? 'Enregistrement...' : isCompressing ? 'Optimisation...' : isEdit ? 'Modifier' : 'Créer la mission'}
            </button>
          )}
        </div>
      </form>
    </LoadingOverlay>
  );
}
