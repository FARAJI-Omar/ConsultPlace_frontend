import { useMemo } from 'react';
import type { HolidayInfo } from '../../../hooks/consultant/useMoroccoHolidays';

const DAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(year: number, month: number) {
  if (month === 1 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month];
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1);
  let jsDay = d.getDay();
  if (jsDay === 0) jsDay = 7;
  return jsDay - 1;
}

export interface CalendarGridProps {
  year: number;
  month: number;
  entries: Record<string, number>;
  holidays: HolidayInfo[];
  touchedDays: Set<string>;
  totalHours?: number;
  onChange: (dayKey: string, hours: number) => void;
}

export default function CalendarGrid({ year, month, entries, holidays, touchedDays, totalHours: totalHoursProp, onChange }: CalendarGridProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of holidays) {
      map.set(h.date, h.name);
    }
    return map;
  }, [holidays]);

  const totalHours = totalHoursProp ?? useMemo(
    () => Object.values(entries).reduce((sum, h) => sum + h, 0),
    [entries],
  );

  const weeks = useMemo(() => {
    const cells: (number | null)[][] = [];
    let week: (number | null)[] = [];

    for (let i = 0; i < firstDayIndex; i++) {
      week.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        cells.push(week);
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      cells.push(week);
    }

    return cells;
  }, [daysInMonth, firstDayIndex]);

  function getDayBg(value: number, isHolidayDay: boolean, isTouched: boolean): string {
    if (isTouched && isHolidayDay && value > 0) return '#fee2e2';
    if (value > 0) return 'var(--secondary-green)';
    return '#f3f4f6';
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-px">
        {DAY_HEADERS.map((header) => (
          <div
            key={header}
            className="px-1.5 py-2 text-center text-xs font-medium uppercase tracking-wider text-[#50555f] bg-[#E1E2ED]"
          >
            {header}
          </div>
        ))}

        {weeks.map((week, wi) =>
          week.map((day, di) => {
            if (day === null) {
              return <div key={`empty-${wi}-${di}`} className="bg-[#ffffff]" />;
            }

            const dayKey = `day-${day}`;
            const value = entries[dayKey] ?? 0;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const holidayName = holidayMap.get(dateStr) ?? null;
            const isHolidayDay = holidayName !== null;
            const isTouched = touchedDays.has(dayKey);

            return (
              <div
                key={dayKey}
                className="flex flex-col items-center gap-1 border border-[#e5e7eb] p-1.5 min-h-[80px]"
                style={{ backgroundColor: getDayBg(value, isHolidayDay, isTouched) }}
              >
                <span className="text-[14px] font-semibold text-[#838996]">{day}</span>
                {holidayName && (
                  <span className="text-[10px] leading-tight text-center text-[#6b7280] line-clamp-2">{holidayName}</span>
                )}
                <input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={value}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    onChange(dayKey, isNaN(v) || v < 0 ? 0 : Math.min(v, 24));
                  }}
                  className="w-full rounded-[4px] border border-[#e5e7eb] bg-[#ffffff] px-1 py-1.5 text-center text-[12px] font-bold text-black focus:border-[#111111] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            );
          }),
        )}
      </div>

      <div className="flex items-center justify-end gap-1.5 text-right">
        <span className="text-xs text-[#6b7280]">Total des heures :</span>
        <span className="text-[14px] font-semibold text-[#111111]">{totalHours}h</span>
      </div>
    </div>
  );
}
