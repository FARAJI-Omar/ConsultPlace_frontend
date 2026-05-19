import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useConsultantMissions } from '../../../hooks/consultant/useConsultantMissions';
import { useCreateTimesheet } from '../../../hooks/consultant/useCreateTimesheet';
import { useUploadAttachments } from '../../../hooks/consultant/useAttachments';
import { useSubmitTimesheet } from '../../../hooks/consultant/useSubmitTimesheet';
import CalendarGrid from './CalendarGrid';
import type { DailyEntry } from '../../../types/models';

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function formatEntriesForApi(entries: Record<string, number>): DailyEntry[] {
  return Object.entries(entries)
    .filter(([_, hours]) => hours > 0)
    .map(([key, hours]) => ({
      day: parseInt(key.replace('day-', ''), 10),
      hours,
    }));
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function CreateCraForm() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [selectedMissionId, setSelectedMissionId] = useState<number | null>(null);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [entries, setEntries] = useState<Record<string, number>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: missionsData, isLoading: missionsLoading } = useConsultantMissions({
    limit: 500,
    status: 'ACTIVE',
  });

  const createTimesheet = useCreateTimesheet();
  const uploadMutation = useUploadAttachments();
  const submitTimesheet = useSubmitTimesheet();

  const isOrchestrating =
    createTimesheet.isPending || uploadMutation.isPending || submitTimesheet.isPending;

  const selectedMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  function goToPrevMonth() {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
    setEntries({});
    
  }

  function goToNextMonth() {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
    setEntries({});
    
  }

  const validateAndAddFiles = useCallback((incoming: FileList | File[]) => {
    setFileError(null);
    const newFiles = Array.from(incoming);
    const combined = [...files, ...newFiles];

    if (combined.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} fichiers autorisés.`);
      return;
    }

    const oversized = newFiles.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setFileError('Chaque fichier ne doit pas dépasser 10 Mo.');
      return;
    }

    const nonPdf = newFiles.find((f) => f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf'));
    if (nonPdf) {
      setFileError('Seuls les fichiers PDF sont acceptés.');
      return;
    }

    setFiles(combined);
  }, [files]);

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
      e.target.value = '';
    }
  }

  async function handleSaveDraft() {
    if (!selectedMissionId) return;
    
    setFileError(null);

    try {
      const timesheet = await createTimesheet.mutateAsync({
        missionId: selectedMissionId,
        month: selectedMonthStr,
        dailyEntries: formatEntriesForApi(entries),
      });

      if (files.length > 0) {
        await uploadMutation.mutateAsync({
          files,
          timesheetId: String(timesheet.id),
        });
      }

      toast.success('Brouillon enregistré avec succès.');
      setEntries({});
      setFiles([]);
      setSelectedMissionId(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Erreur lors de l\'enregistrement du brouillon.';
      toast.error(msg);
    }
  }

  async function handleSubmit() {
    if (!selectedMissionId) return;
    
    setFileError(null);

    try {
      const timesheet = await createTimesheet.mutateAsync({
        missionId: selectedMissionId,
        month: selectedMonthStr,
        dailyEntries: formatEntriesForApi(entries),
      });

      await uploadMutation.mutateAsync({
        files,
        timesheetId: String(timesheet.id),
      });

      await submitTimesheet.mutateAsync(timesheet.id);

      toast.success('Relevé mensuel soumis avec succès.');
      setEntries({});
      setFiles([]);
      setSelectedMissionId(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Au moins une pièce jointe est requise pour soumettre.';
      toast.error(msg);
    }
  }

  const missions = missionsData?.data ?? [];

  return (
    <div className="space-y-6">
      {fileError && (
        <div className="rounded-[8px] bg-[#ef4444]/10 border border-[#ef4444] px-4 py-3 text-sm font-medium text-[#ef4444]">
          {fileError}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">
            Mission
          </label>
          <select
            value={selectedMissionId ?? ''}
            onChange={(e) => setSelectedMissionId(e.target.value ? Number(e.target.value) : null)}
            className="h-10 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 text-sm text-[#111111] focus:border-[#111111] focus:outline-none min-w-[240px]"
            disabled={isOrchestrating}
          >
            <option value="">Sélectionner une mission</option>
            {missionsLoading && <option disabled>Chargement...</option>}
            {missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} — {m.contract.client.raison_sociale}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPrevMonth}
            disabled={isOrchestrating}
            className="cursor-pointer rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-2 text-sm text-[#111111] hover:bg-[#f3f4f6] disabled:opacity-50 transition-colors"
          >
            &larr;
          </button>
          <span className="text-sm font-semibold text-[#111111] min-w-[140px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            disabled={isOrchestrating}
            className="cursor-pointer rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-2 text-sm text-[#111111] hover:bg-[#f3f4f6] disabled:opacity-50 transition-colors"
          >
            &rarr;
          </button>
        </div>
      </div>

      <CalendarGrid
        year={year}
        month={month}
        entries={entries}
        onChange={(dayKey, hours) =>
          setEntries((prev) => ({ ...prev, [dayKey]: hours }))
        }
      />

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">
          Pièces jointes (PDF)
        </label>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-[12px] border-2 border-dashed border-[#e5e7eb] bg-[#ffffff] px-6 py-8 text-center transition-colors hover:border-[#111111]"
        >
          <p className="text-sm text-[#6b7280]">
            Glissez-déposez vos fichiers PDF ici ou cliquez pour parcourir
          </p>
          <p className="text-xs text-[#6b7280] mt-1">
            Maximum {MAX_FILES} fichiers, 10 Mo chacun
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {files.length > 0 && (
          <ul className="space-y-1.5">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-[8px] bg-[#f5f5f5] px-4 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-block rounded-[9999px] bg-[#e5e7eb] px-2 py-0.5 text-xs text-[#6b7280]">
                    PDF
                  </span>
                  <span className="text-sm text-[#111111]">{file.name}</span>
                  <span className="text-xs text-[#6b7280]">
                    ({(file.size / 1024 / 1024).toFixed(1)} Mo)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  disabled={isOrchestrating}
                  className="cursor-pointer rounded-[8px] px-2 py-1 text-xs font-semibold text-[#ef4444] hover:bg-[#fef2f2] disabled:opacity-50 transition-colors"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={!selectedMissionId || isOrchestrating}
          className="cursor-pointer rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-5 py-2.5 text-sm font-semibold text-[#111111] hover:bg-[#f3f4f6] disabled:opacity-50 transition-colors"
        >
          {createTimesheet.isPending ? 'Enregistrement...' : 'Enregistrer comme brouillon'}
        </button>
        <button
          type="button"
          onClick={() => setShowSubmitConfirm(true)}
          disabled={!selectedMissionId || files.length === 0 || isOrchestrating}
          className="cursor-pointer rounded-[8px] bg-green-600 px-5 py-2.5 text-sm font-semibold text-[#ffffff] hover:bg-green-700 disabled:bg-[#e5e7eb] disabled:text-[#6b7280] disabled:cursor-not-allowed transition-colors"
        >
          {submitTimesheet.isPending ? 'Soumission...' : 'Soumettre'}
        </button>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSubmitConfirm(false)}>
          <div className="rounded-[12px] bg-[#ffffff] p-6 shadow-lg w-80" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-[#111111] mb-2">Confirmer la soumission</p>
            <p className="text-sm text-[#6b7280] mb-6">Envoyer ce relevé mensuel pour validation ?</p>
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
                onClick={() => { setShowSubmitConfirm(false); handleSubmit(); }}
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
