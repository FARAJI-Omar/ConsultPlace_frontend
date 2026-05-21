import { useMemo } from 'react';
import Holidays from 'date-holidays';

export interface HolidayInfo {
  date: string;
  name: string;
}

export function useMoroccoHolidays(year: number): HolidayInfo[] {
  return useMemo(() => {
    try {
      const hd = new Holidays('MA', { languages: 'fr' });
      const holidays = hd.getHolidays(year) as { date: string; name: string }[];
      return holidays
        .filter((h) => h.date)
        .map((h) => ({
          date: h.date.split(' ')[0],
          name: h.name,
        }));
    } catch {
      return [];
    }
  }, [year]);
}
