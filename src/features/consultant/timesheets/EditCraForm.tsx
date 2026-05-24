import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useTimesheetById } from '../../../hooks/consultant/useTimesheets';
import { useUpdateTimesheet } from '../../../hooks/consultant/useUpdateTimesheet';
import { useMoroccoHolidays } from '../../../hooks/consultant/useMoroccoHolidays';
import CalendarGrid from './CalendarGrid';

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function buildEntriesMap(
  dailyEntries: { day: number; hours: number }[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of dailyEntries) {
    map[`day-${e.day}`] = e.hours;
  }
  return map;
}

function buildTouchedSet(
  dailyEntries: { day: number; hours: number }[],
): Set<string> {
  return new Set(dailyEntries.map((e) => `day-${e.day}`));
}

export default function EditCraForm({ timesheetId, onClose }: { timesheetId: number; onClose: () => void }) {
  const { data: timesheet, isLoading } = useTimesheetById(timesheetId);
  const updateTimesheet = useUpdateTimesheet();
  const holidays = useMoroccoHolidays(timesheet ? parseInt(timesheet.month.split('-')[0], 10) : new Date().getFullYear());

  const [entries, setEntries] = useState<Record<string, number> | null>(null);
  const [touchedDays, setTouchedDays] = useState<Set<string> | null>(null);

  const initializedEntries = entries ?? (timesheet?.dailyEntries ? buildEntriesMap(timesheet.dailyEntries) : {});
  const initializedTouched = touchedDays ?? (timesheet?.dailyEntries ? buildTouchedSet(timesheet.dailyEntries) : new Set());

  const year = timesheet ? parseInt(timesheet.month.split('-')[0], 10) : 0;
  const month = timesheet ? parseInt(timesheet.month.split('-')[1], 10) - 1 : 0;

  const totalHours = useMemo(
    () => Object.values(initializedEntries).reduce((s, h) => s + h, 0),
    [initializedEntries],
  );

  const handleChange = useCallback((dayKey: string, hours: number) => {
    setEntries((prev) => {
      const current = prev ?? (timesheet?.dailyEntries ? buildEntriesMap(timesheet.dailyEntries) : {});
      return { ...current, [dayKey]: hours };
    });
    setTouchedDays((prev) => {
      const current = prev ?? (timesheet?.dailyEntries ? buildTouchedSet(timesheet.dailyEntries) : new Set());
      const next = new Set(current);
      next.add(dayKey);
      return next;
    });
  }, [timesheet]);

  const handleSave = async () => {
    if (!timesheet) return;

    const dailyEntries = Object.entries(initializedEntries)
      .filter(([_, hours]) => hours > 0)
      .map(([key, hours]) => ({
        day: parseInt(key.replace('day-', ''), 10),
        hours,
      }));

    try {
      await updateTimesheet.mutateAsync({
        id: timesheet.id,
        dailyEntries,
      });
      toast.success('Relevé mis à jour avec succès.');
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Erreur lors de la mise à jour.';
      toast.error(msg);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-[#6b7280]">Chargement...</p>;
  }

  if (!timesheet) {
    return <p className="text-sm text-[#ef4444]">Relevé introuvable.</p>;
  }

  if (timesheet.status !== 'BROUILLON' && timesheet.status !== 'REJETE') {
    return <p className="text-sm text-[#ef4444]">Ce relevé ne peut plus être modifié.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">Mission</label>
          <div className="h-10 rounded-[8px] border border-[#e5e7eb] bg-[#f5f5f5] px-3 text-sm text-[#6b7280] flex items-center min-w-[240px]">
            {timesheet.mission?.title ?? '—'}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">Mois</label>
          <div className="h-10 rounded-[8px] border border-[#e5e7eb] bg-[#f5f5f5] px-3 text-sm text-[#6b7280] flex items-center min-w-[140px]">
            {monthNames[month]} {year}
          </div>
        </div>
      </div>

      <CalendarGrid
        year={year}
        month={month}
        entries={initializedEntries}
        holidays={holidays}
        touchedDays={initializedTouched}
        totalHours={totalHours}
        onChange={handleChange}
      />

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-5 py-2.5 text-sm font-semibold text-[#111111] hover:bg-[#f3f4f6] transition-colors"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={updateTimesheet.isPending}
          className="cursor-pointer rounded-[8px] bg-primary-blue px-5 py-2.5 text-sm font-semibold text-[#ffffff] hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {updateTimesheet.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
