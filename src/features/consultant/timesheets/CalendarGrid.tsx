import { useMemo, useRef, useState, useEffect } from 'react';
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
  const [tooltip, setTooltip] = useState<{ text: string; top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tooltip) {
      const t = setTimeout(() => setTooltip(null), 2000);
      return () => clearTimeout(t);
    }
  }, [tooltip]);

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

  function getStateText(hours: number): string {
    if (hours <= 0) return '—';
    if (hours <= 4) return 'Demi';
    return 'Complet';
  }

  function getStateStyle(hours: number): { background: string; color: string } {
    if (hours <= 0) return { background: '#ffffff', color: '#9ca3af' };
    if (hours <= 4) {
      return {
        background: 'linear-gradient(to right, #4ade80 0%, #4ade80 50%, #ffffff 50%, #ffffff 100%)',
        color: '#111111',
      };
    }
    return { background: '#16a34a', color: '#ffffff' };
  }

  const totalDays = useMemo(
    () => Object.values(entries).reduce((s, h) => s + (h > 0 ? (h <= 4 ? 0.5 : 1) : 0), 0),
    [entries],
  );

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
                onClick={(e) => {
                  if (holidayName) {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setTooltip({ text: holidayName, top: rect.top - 8, left: rect.left + rect.width / 2 });
                  }
                }}
              >
                <span className="text-xs md:text-sm font-semibold text-[#838996]">{day}</span>
                {holidayName && (
                  <span className="text-[10px] leading-tight text-center text-[#6b7280] truncate w-full" title={holidayName}>{holidayName}</span>
                )}
                <div className="w-full">
                  <button
                    type="button"
                    onClick={() => onChange(dayKey, value <= 0 ? 4 : value <= 4 ? 8 : 0)}
                    aria-label={`Jour ${day} — ${getStateText(value)}`}
                    className="w-full cursor-pointer rounded-[4px] border border-[#e5e7eb] px-1.5 py-1.5 text-center text-[10px] md:text-xs font-bold transition-opacity hover:opacity-80 focus:border-[#111111] focus:outline-none"
                    style={getStateStyle(value)}
                  >
                    {value <= 0 ? '—' : (
                      <>
                        <span className="hidden md:inline">{getStateText(value)}</span>
                        <span className="md:hidden">&nbsp;</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          }),
        )}
      </div>

      <div className="flex items-center justify-end gap-1.5 text-right pr-4">
        <span className="text-sm text-[#5b5c5f]">Total des jours :</span>
        <span className="text-xs md:text-sm font-semibold text-[#111111]">
          {Number.isInteger(totalDays) ? totalDays : totalDays.toFixed(1).replace('.', ',')}j
        </span>
      </div>
      <div className="flex items-center justify-end gap-1.5 text-right pr-4">
        <span className="text-sm text-[#5b5c5f]">Total des heures :</span>
        <span className="text-xs md:text-sm font-semibold text-[#111111]">{totalHours}h</span>
      </div>

      {tooltip && (
        <div
          ref={tooltipRef}
          className="fixed z-50 rounded-[4px] bg-[#111111] px-2 py-1 text-xs text-[#ffffff] whitespace-nowrap pointer-events-none"
          style={{ top: tooltip.top, left: tooltip.left, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
