import { useMemo } from 'react';

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
  onChange: (dayKey: string, hours: number) => void;
}

export default function CalendarGrid({ year, month, entries, onChange }: CalendarGridProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const totalHours = useMemo(
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

  function isWeekend(dayIndex: number) {
    const col = (firstDayIndex + dayIndex - 1) % 7;
    return col === 5 || col === 6;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-px">
        {DAY_HEADERS.map((header) => (
          <div
            key={header}
            className="px-2 py-1.5 text-center text-xs font-medium uppercase tracking-wider text-[#6b7280] bg-[#E1E2ED]"
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
            const weekend = isWeekend(day);

            return (
              <div
                key={dayKey}
                className={`flex flex-col items-center gap-1 border border-[#e5e7eb] p-1.5 min-h-[72px] ${
                  weekend ? 'bg-[#f8f9fa]' : 'bg-[#ffffff]'
                }`}
              >
                <span className="text-xs font-medium text-[#6b7280]">{day}</span>
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
                  className="w-full rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-1.5 py-1 text-center text-sm text-[#111111] focus:border-[#111111] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            );
          }),
        )}
      </div>

      <div className="flex items-center justify-end gap-2 text-right">
        <span className="text-sm text-[#6b7280]">Total des heures :</span>
        <span className="text-[18px] font-semibold text-[#111111]">{totalHours}h</span>
      </div>
    </div>
  );
}
