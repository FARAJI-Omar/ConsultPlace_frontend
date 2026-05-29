import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useConsultantMissions } from '../../../hooks/consultant/useConsultantMissions';
import { useCreateTimesheet } from '../../../hooks/consultant/useCreateTimesheet';
import { useUploadAttachments } from '../../../hooks/consultant/useAttachments';
import { useSubmitTimesheet } from '../../../hooks/consultant/useSubmitTimesheet';
import { useMoroccoHolidays } from '../../../hooks/consultant/useMoroccoHolidays';
import CalendarGrid from './CalendarGrid';
import LoadingOverlay from '../../../components/common/LoadingOverlay';
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

function isWeekend(day: number, year: number, month: number): boolean {
  const d = new Date(year, month, day);
  const jsDay = d.getDay();
  return jsDay === 0 || jsDay === 6;
}

function generateDefaultEntries(year: number, month: number, holidays: { date: string }[]): Record<string, number> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const holidayDates = new Set(holidays.map((h) => h.date));
  const entries: Record<string, number> = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (isWeekend(day, year, month) || holidayDates.has(dateStr)) {
      entries[`day-${day}`] = 0;
    } else {
      entries[`day-${day}`] = 8;
    }
  }
  return entries;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function CreateCraForm({ defaultMissionId }: { defaultMissionId?: number }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const monthOptions = useMemo(() => {
    const prev = new Date(currentYear, currentMonth - 1, 1);
    return [
      { label: `${monthNames[currentMonth]} ${currentYear}`, year: currentYear, month: currentMonth },
      { label: `${monthNames[prev.getMonth()]} ${prev.getFullYear()}`, year: prev.getFullYear(), month: prev.getMonth() },
    ];
  }, []);

  const [selectedMissionId, setSelectedMissionId] = useState<number | null>(defaultMissionId ?? null);
  const [entriesByMonth, setEntriesByMonth] = useState<Record<string, Record<string, number>>>({});
  const [touchedByMonth, setTouchedByMonth] = useState<Record<string, string[]>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showWeekendWarning, setShowWeekendWarning] = useState(false);
  const [weekendDayLabels, setWeekendDayLabels] = useState<string[]>([]);
  const [pendingWeekendAction, setPendingWeekendAction] = useState<'save' | 'submit' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const holidays = useMoroccoHolidays(selectedYear);

  const { data: missionsData, isLoading: missionsLoading } = useConsultantMissions({
    limit: 500,
    status: 'ACTIVE',
  });

  const createTimesheet = useCreateTimesheet();
  const uploadMutation = useUploadAttachments();
  const submitTimesheet = useSubmitTimesheet();

  const isOrchestrating =
    createTimesheet.isPending || uploadMutation.isPending || submitTimesheet.isPending;

  const selectedMonthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const touchedDays = useMemo(
    () => new Set(touchedByMonth[selectedMonthStr] ?? []),
    [touchedByMonth, selectedMonthStr],
  );

  const entries = useMemo(
    () => entriesByMonth[selectedMonthStr] ?? generateDefaultEntries(selectedYear, selectedMonth, holidays),
    [entriesByMonth, selectedMonthStr, selectedYear, selectedMonth, holidays],
  );

  const totalHours = useMemo(
    () => Object.values(entries).reduce((s, h) => s + h, 0),
    [entries],
  );

  const handleEntryChange = useCallback((dayKey: string, hours: number) => {
    setEntriesByMonth((prev) => {
      const existing = prev[selectedMonthStr];
      if (existing) {
        return { ...prev, [selectedMonthStr]: { ...existing, [dayKey]: hours } };
      }
      return { ...prev, [selectedMonthStr]: { ...generateDefaultEntries(selectedYear, selectedMonth, holidays), [dayKey]: hours } };
    });
    setTouchedByMonth((prev) => {
      const current = prev[selectedMonthStr] ?? [];
      if (current.includes(dayKey)) return prev;
      return { ...prev, [selectedMonthStr]: [...current, dayKey] };
    });
  }, [selectedMonthStr, selectedYear, selectedMonth, holidays]);

  function handleClearMonth() {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const cleared: Record<string, number> = {};
    const touched: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `day-${day}`;
      cleared[key] = 0;
      touched.push(key);
    }
    setEntriesByMonth((prev) => ({ ...prev, [selectedMonthStr]: cleared }));
    setTouchedByMonth((prev) => ({ ...prev, [selectedMonthStr]: touched }));
  }

  function hasWeekendOrHolidayHours(entries: Record<string, number>): string[] {
    const holidayDates = new Map(holidays.map((h) => [h.date, h.name]));
    const result: string[] = [];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `day-${day}`;
      const hours = entries[key];
      if (hours > 0) {
        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (isWeekend(day, selectedYear, selectedMonth)) {
          result.push(`${day} ${monthNames[selectedMonth]} (week-end)`);
        } else if (holidayDates.has(dateStr)) {
          result.push(`${day} ${monthNames[selectedMonth]} (${holidayDates.get(dateStr)})`);
        }
      }
    }
    return result;
  }

  function handleSaveDraftClick() {
    if (!selectedMissionId) return;
    const badDays = hasWeekendOrHolidayHours(entries);
    if (badDays.length > 0) {
      setWeekendDayLabels(badDays);
      setPendingWeekendAction('save');
      setShowWeekendWarning(true);
    } else {
      handleSaveDraft();
    }
  }

  function handleSubmitClick() {
    if (!selectedMissionId) return;
    const badDays = hasWeekendOrHolidayHours(entries);
    if (badDays.length > 0) {
      setWeekendDayLabels(badDays);
      setPendingWeekendAction('submit');
      setShowWeekendWarning(true);
    } else {
      setShowSubmitConfirm(true);
    }
  }

  function handleWeekendWarningConfirm() {
    setShowWeekendWarning(false);
    if (pendingWeekendAction === 'save') {
      handleSaveDraft();
    } else if (pendingWeekendAction === 'submit') {
      setShowSubmitConfirm(true);
    }
    setPendingWeekendAction(null);
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

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png'];
    const invalid = newFiles.find(
      (f) => !allowedTypes.includes(f.type) && !allowedExts.some((ext) => f.name.toLowerCase().endsWith(ext)),
    );
    if (invalid) {
      setFileError('Seuls les fichiers PDF, JPG et PNG sont acceptés.');
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
      setEntriesByMonth((prev) => {
        const next = { ...prev };
        delete next[selectedMonthStr];
        return next;
      });
      setTouchedByMonth((prev) => {
        const next = { ...prev };
        delete next[selectedMonthStr];
        return next;
      });
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
      setEntriesByMonth((prev) => {
        const next = { ...prev };
        delete next[selectedMonthStr];
        return next;
      });
      setTouchedByMonth((prev) => {
        const next = { ...prev };
        delete next[selectedMonthStr];
        return next;
      });
      setFiles([]);
      setSelectedMissionId(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Au moins une pièce jointe est requise pour soumettre.';
      toast.error(msg);
    }
  }

  const missions = (missionsData?.data ?? []).filter((m) => m.canCreateTimesheet);

  useEffect(() => {
    if (!missionsLoading && selectedMissionId !== null && !missions.find((m) => m.id === selectedMissionId)) {
      setSelectedMissionId(null);
    }
  }, [missions, selectedMissionId, missionsLoading]);

  return (
    <LoadingOverlay isLoading={isOrchestrating}>
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

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">
            Mois
          </label>
          <select
            value={selectedMonthStr}
            onChange={(e) => {
              const option = monthOptions.find((o) => `${o.year}-${String(o.month + 1).padStart(2, '0')}` === e.target.value);
              if (option) {
                setSelectedMonth(option.month);
                setSelectedYear(option.year);
              }
            }}
            className="h-10 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 text-sm text-[#111111] focus:border-[#111111] focus:outline-none min-w-[180px]"
            disabled={isOrchestrating}
          >
            {monthOptions.map((opt) => (
              <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${String(opt.month + 1).padStart(2, '0')}`}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleClearMonth}
          className="cursor-pointer rounded-[8px] border border-[#ef4444] bg-[#ffffff] px-4 py-2 text-sm font-medium text-[#ef4444] hover:bg-[#fef2f2] disabled:opacity-50 transition-colors ml-auto"
        >
          Effacer
        </button>
      </div>

      <CalendarGrid
        year={selectedYear}
        month={selectedMonth}
        entries={entries}
        holidays={holidays}
        touchedDays={touchedDays}
        totalHours={totalHours}
        onChange={handleEntryChange}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium tracking-wider text-[#494d56]">
          Relevé d'heures signé, Attestation de présence, Rapport d'activité, Facture ...<span className="text-xs text-[#ff0909]"> (*)</span>
        </label>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-[12px] border-2 border-dashed border-[#e5e7eb] bg-[#ffffff] px-6 py-8 text-center transition-colors hover:border-[#111111]"
        >
          <p className="text-sm text-[#6b7280]">
            Glissez-déposez vos fichiers ici ou cliquez pour parcourir
          </p>
          <p className="text-xs text-[#6b7280] mt-1">
            Maximum {MAX_FILES} fichiers, 10 Mo chacun
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
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
                    {file.name.split('.').pop()?.toUpperCase() ?? 'FICHIER'}
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
          onClick={handleSaveDraftClick}
          disabled={!selectedMissionId || isOrchestrating}
          className="cursor-pointer rounded-[8px] border border-[#afb1b3] bg-[#ffffff] px-5 py-2.5 text-sm font-semibold text-[#111111] hover:bg-[#8f9194] disabled:opacity-50 transition-colors"
        >
          {createTimesheet.isPending ? 'Enregistrement...' : 'Enregistrer comme brouillon'}
        </button>
        <button
          type="button"
          onClick={handleSubmitClick}
          disabled={!selectedMissionId || files.length === 0 || isOrchestrating}
          className="cursor-pointer rounded-[8px] bg-green-600 px-5 py-2.5 text-sm font-semibold text-[#ffffff] hover:bg-green-700 disabled:bg-[#e5e7eb] disabled:text-[#6b7280] disabled:cursor-not-allowed transition-colors"
        >
          {submitTimesheet.isPending ? 'Soumission...' : 'Soumettre'}
        </button>
      </div>

      {showWeekendWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowWeekendWarning(false); setPendingWeekendAction(null); }}>
          <div className="rounded-[12px] bg-[#ffffff] p-6 shadow-lg w-110" onClick={(e) => e.stopPropagation()}>
            <p className="text-xl font-semibold text-[#111111] mb-2">Heures saisies sur jours non ouvrables</p>
            <p className="text-sm text-[#6b7280] mb-4">
              Les jours suivants contiennent des heures alors qu'ils sont week-end ou jours fériés&nbsp;:
            </p>
            <ul className="space-y-1 mb-4">
              {weekendDayLabels.map((label, i) => (
                <li key={i} className="text-sm text-[#ef4444]">• {label}</li>
              ))}
            </ul>
            <p className="text-sm text-[#6b7280] mb-6">Voulez-vous continuer ?</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowWeekendWarning(false); setPendingWeekendAction(null); }}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-2 text-xs font-semibold text-[#111111] hover:bg-[#f3f4f6] transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleWeekendWarningConfirm}
                className="cursor-pointer rounded-[8px] bg-green-600 px-4 py-2 text-xs font-semibold text-[#ffffff] hover:bg-green-700 transition-colors"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div></LoadingOverlay>
  );
}
