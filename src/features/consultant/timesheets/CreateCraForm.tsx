import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useConsultantMissions } from '../../../hooks/consultant/useConsultantMissions';
import { useCreateTimesheet } from '../../../hooks/consultant/useCreateTimesheet';
import { useUploadAttachments } from '../../../hooks/consultant/useAttachments';
import { useSubmitTimesheet } from '../../../hooks/consultant/useSubmitTimesheet';
import { useImageCompression } from '../../../hooks/useImageCompression';
import { useMoroccoHolidays } from '../../../hooks/consultant/useMoroccoHolidays';
import { truncateFilename } from '../../../lib/utils';
import { Loader2, CalendarX2, Send, Delete } from 'lucide-react';
import CalendarGrid from './CalendarGrid';
import PrintReleveButton from './PrintReleveButton';
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

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function CreateCraForm({ defaultMissionId }: { defaultMissionId?: number }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const monthOptions = useMemo(() => {
    const options: { label: string; year: number; month: number }[] = [];
    for (let i = 0; i <= 6; i++) {
      const d = new Date(currentYear, currentMonth - i, 1);
      options.push({
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }
    return options;
  }, []);

  const [selectedMissionId, setSelectedMissionId] = useState<number | null>(defaultMissionId ?? null);
  const [entriesByMonth, setEntriesByMonth] = useState<Record<string, Record<string, number>>>({});
  const [touchedByMonth, setTouchedByMonth] = useState<Record<string, string[]>>({});
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [factureFile, setFactureFile] = useState<File | null>(null);

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showWeekendWarning, setShowWeekendWarning] = useState(false);
  const [weekendDayLabels, setWeekendDayLabels] = useState<string[]>([]);
  const [pendingWeekendAction, setPendingWeekendAction] = useState<'save' | 'submit' | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const factureInputRef = useRef<HTMLInputElement>(null);

  const holidays = useMoroccoHolidays(selectedYear);

  const { data: missionsData, isLoading: missionsLoading } = useConsultantMissions({
    limit: 500,
    status: 'ACTIVE',
  });

  const createTimesheet = useCreateTimesheet();
  const uploadMutation = useUploadAttachments();
  const submitTimesheet = useSubmitTimesheet();
  const { trackFiles, untrackFile, getCompressedFiles, isCompressing, compressingFiles } = useImageCompression();

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

  const allowedTypes = ['application/pdf'];
  const allowedExts = ['.pdf'];

  function isValidFile(file: File): boolean {
    return allowedTypes.includes(file.type) || allowedExts.some((ext) => file.name.toLowerCase().endsWith(ext));
  }

  function validateFiles(incoming: FileList | File[]): File[] {
    const valid: File[] = [];
    for (const f of Array.from(incoming)) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error('Chaque fichier ne doit pas dépasser 10 Mo.');
        return [];
      }
      if (!isValidFile(f)) {
        toast.error('Seuls les fichiers PDF sont acceptés.');
        return [];
      }
      valid.push(f);
    }
    return valid;
  }

  function addProofFiles(incoming: FileList | File[]) {
    const valid = validateFiles(incoming);
    if (valid.length === 0) return;
    const removed = proofFiles[0];
    if (removed) untrackFile(removed);
    setProofFiles([valid[0]]);
    trackFiles([valid[0]]);
  }

  function removeProofFile(index: number) {
    setProofFiles((prev) => {
      const removed = prev[index];
      if (removed) untrackFile(removed);
      return prev.filter((_, i) => i !== index);
    });
  }

  function setFactureFileValidated(incoming: FileList | File[]) {
    const valid = validateFiles(incoming);
    if (valid.length === 0) return;
    setFactureFile(valid[0]);
    trackFiles(valid);
  }

  function removeFactureFile() {
    if (factureFile) untrackFile(factureFile);
    setFactureFile(null);
  }

  function handleProofDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      addProofFiles(e.dataTransfer.files);
    }
  }

  function handleProofFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addProofFiles(e.target.files);
      e.target.value = '';
    }
  }

  function handleFactureDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      setFactureFileValidated(e.dataTransfer.files);
    }
  }

  function handleFactureFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setFactureFileValidated(e.target.files);
      e.target.value = '';
    }
  }

  async function finishAndReset() {
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
    setProofFiles([]);
    setFactureFile(null);
    setSelectedMissionId(null);
  }

  async function uploadAllZones(timesheetId: number) {
    const promises: Promise<unknown>[] = [];

    if (proofFiles.length > 0) {
      const compressed = await getCompressedFiles(proofFiles);
      promises.push(
        uploadMutation.mutateAsync({
          files: compressed,
          timesheetId: String(timesheetId),
          type: 'PROOF',
        }),
      );
    }

    if (factureFile) {
      const compressed = await getCompressedFiles([factureFile]);
      promises.push(
        uploadMutation.mutateAsync({
          files: compressed,
          timesheetId: String(timesheetId),
          type: 'CONSULTANT_FACTURE',
        }),
      );
    }

    await Promise.all(promises);
  }

  async function handleSaveDraft() {
    if (!selectedMissionId) return;
    
    try {
      const timesheet = await createTimesheet.mutateAsync({
        missionId: selectedMissionId,
        month: selectedMonthStr,
        dailyEntries: formatEntriesForApi(entries),
      });

      await uploadAllZones(timesheet.id);

      toast.success('Brouillon enregistré avec succès.');
      finishAndReset();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Erreur lors de l\'enregistrement du brouillon.';
      toast.error(msg);
    }
  }

  async function handleSubmit() {
    if (!selectedMissionId) return;
    
    try {
      const timesheet = await createTimesheet.mutateAsync({
        missionId: selectedMissionId,
        month: selectedMonthStr,
        dailyEntries: formatEntriesForApi(entries),
      });

      await uploadAllZones(timesheet.id);

      await submitTimesheet.mutateAsync(timesheet.id);

      toast.success('Relevé mensuel soumis avec succès.');
      finishAndReset();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Le rapport d\'activité et la facture sont requis pour soumettre.';
      toast.error(msg);
    }
  }

  const missions = (missionsData?.data ?? []).filter((m) => m.canCreateTimesheet);
  const selectedMission = selectedMissionId !== null ? missions.find((m) => m.id === selectedMissionId) : undefined;

  useEffect(() => {
    if (!missionsLoading && selectedMissionId !== null && !missions.find((m) => m.id === selectedMissionId)) {
      setSelectedMissionId(null);
    }
  }, [missions, selectedMissionId, missionsLoading]);

  return (
    <LoadingOverlay isLoading={isOrchestrating}>
      <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-[12px] bg-[#ffffff] border border-[#e5e7eb] p-4">
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
          title="Effacer les heures"
          className="cursor-pointer rounded-[8px] border border-[#ef4444] bg-[#ffffff] px-3 md:px-4 py-2 text-sm font-medium text-[#ef4444] hover:bg-[#fef2f2] disabled:opacity-50 transition-colors ml-auto"
        >
          <CalendarX2 size={14} className="md:hidden" />
          <span className="hidden md:inline">Effacer les heures</span>
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
        printButton={
          <PrintReleveButton
            year={selectedYear}
            month={selectedMonth}
            entries={entries}
            missionTitle={selectedMission?.title ?? ''}
            clientName={selectedMission?.contract.client.raison_sociale ?? ''}
            disabled={!selectedMissionId}
          />
        }
      />

      <div className="space-y-4">
        <p className="text-xs md:text-sm font-medium text-[#ff0909]">* Les deux entrées sont obligatoires pour soumettre</p>

        <div className="space-y-2">
          <label className="text-sm font-medium tracking-wider text-[#494d56]">
            Rapport d'activité <span className="text-xs text-[#ff0909]">*</span>
          </label>

          {proofFiles.length > 0 ? (
            <div className="rounded-[12px] border-2 border-solid border-[#e5e7eb] bg-[#f9f9f9] px-6 py-6 text-center">
              <p className="text-sm text-[#6b7280]">
                Fichier sélectionné : <span className="font-medium text-xs md:text-sm text-[#111111]">{truncateFilename(proofFiles[0].name)}</span>
                {compressingFiles.has(proofFiles[0]) && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6b7280] shrink-0 ml-1 inline-block align-middle" />
                )}
              </p>
              <button
                type="button"
                onClick={() => removeProofFile(0)}
                disabled={isOrchestrating}
                title="Retirer"
                className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] px-3 py-1.5 mt-3 text-xs font-semibold text-[#dc5252] hover:bg-[#fef2f2] disabled:opacity-50 transition-colors"
              >
                <Delete size={14} className="md:hidden" />
                <span className="hidden md:inline">Retirer</span>
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleProofDrop}
              onClick={() => proofInputRef.current?.click()}
              className="cursor-pointer rounded-[12px] border-2 border-dashed border-[#e5e7eb] bg-[#ffffff] px-6 py-6 text-center transition-colors hover:border-[#111111]"
            >
              <p className="text-sm text-[#6b7280]">
                Glissez-déposez votre fichier ici ou cliquez pour parcourir
              </p>
              <p className="text-[8px] md:text-xs text-[#6b7280] mt-1">
                1 fichier PDF, 10 Mo maximum
              </p>
              <input
                ref={proofInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleProofFileSelect}
                className="hidden"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium tracking-wider text-[#494d56]">
            Facture du consultant <span className="text-xs text-[#ff0909]">*</span>
          </label>

          {factureFile ? (
            <div className="rounded-[12px] border-2 border-solid border-[#e5e7eb] bg-[#f9f9f9] px-6 py-6 text-center">
              <p className="text-sm text-[#6b7280]">
                Fichier sélectionné : <span className="font-medium text-xs md:text-sm text-[#111111]">{truncateFilename(factureFile.name)}</span>
                {compressingFiles.has(factureFile) && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6b7280] shrink-0 ml-1 inline-block align-middle" />
                )}
              </p>
              <button
                type="button"
                onClick={removeFactureFile}
                disabled={isOrchestrating}
                title="Retirer"
                className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] px-3 py-1.5 mt-3 text-xs font-semibold text-[#dc5252] hover:bg-[#fef2f2] disabled:opacity-50 transition-colors"
              >
                <Delete size={14} className="md:hidden" />
                <span className="hidden md:inline">Retirer</span>
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFactureDrop}
              onClick={() => factureInputRef.current?.click()}
              className="cursor-pointer rounded-[12px] border-2 border-dashed border-[#e5e7eb] bg-[#ffffff] px-6 py-6 text-center transition-colors hover:border-[#111111]"
            >
              <p className="text-sm text-[#6b7280]">
                Glissez-déposez votre fichier ici ou cliquez pour parcourir
              </p>
              <p className="text-[8px] md:text-xs text-[#6b7280] mt-1">
                1 fichier PDF uniquement, 10 Mo maximum
              </p>
              <input
                ref={factureInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFactureFileSelect}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleSaveDraftClick}
          disabled={!selectedMissionId || isOrchestrating || isCompressing}
          className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] border border-[#afb1b3] bg-[#ffffff] px-5 py-2.5 text-sm font-semibold text-[#111111] hover:bg-[#8f9194] disabled:opacity-50 transition-colors"
        >
          {createTimesheet.isPending ? 'Enregistrement...' : isCompressing ? 'Optimisation...' : 'Enregistrer comme brouillon'}
        </button>
        <button
          type="button"
          onClick={handleSubmitClick}
          disabled={!selectedMissionId || proofFiles.length === 0 || !factureFile || isOrchestrating || isCompressing}
          title={(!proofFiles.length || !factureFile) ? 'Les documents Rapport d\'activité et facture du consultant requis' : isCompressing ? 'Optimisation des fichiers en cours...' : ''}
          className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] bg-green-600 px-5 py-2.5 text-sm font-semibold text-[#ffffff] hover:bg-green-700 disabled:bg-[#e5e7eb] disabled:text-[#6b7280] disabled:cursor-not-allowed transition-colors"
        >
          <Send size={14} className="md:hidden" />
          <span className="hidden md:inline">{submitTimesheet.isPending ? 'Soumission...' : isCompressing ? 'Optimisation...' : 'Soumettre'}</span>
        </button>
      </div>

      {showWeekendWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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
