import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, error, placeholder = 'Sélectionner une date' }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? new Date(value.includes('T') ? value : value + 'T00:00:00') : undefined;

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            'flex h-9 w-full cursor-pointer items-center justify-between rounded-[8px] border px-3 py-2 text-sm transition-colors hover:border-primary-blue',
            error ? 'border-red-500' : 'border-[#e5e7eb]',
          )}
        >
          <span className={selectedDate ? 'text-[#111111]' : 'text-[#9ca3af]'}>
            {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: fr }) : placeholder}
          </span>
          <CalendarDays className="h-4 w-4 text-[#6b7280]" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" sideOffset={6}>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onChange(format(date, 'yyyy-MM-dd'));
                setOpen(false);
              }
            }}
            className="[--cell-size:--spacing(10)]"
            defaultMonth={selectedDate ?? new Date()}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
