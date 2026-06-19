import { formatDate } from '../../lib/utils';

interface Step {
  status: string;
  label: string;
  timestamp?: string;
}

interface HorizontalStepperProps {
  steps?: Step[];
  currentStatus: string;
}

const STATUS_ORDER: string[] = ['BROUILLON', 'SOUMIS', 'VALIDE', 'FACTURE', 'PAYE'];

const DEFAULT_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS: 'Soumis',
  VALIDE: 'Validé',
  FACTURE: 'Facturé',
  PAYE: 'Payé',
};

export default function HorizontalStepper({ steps = [], currentStatus }: HorizontalStepperProps) {
  const statusTimestamps: Record<string, string> = {};
  for (const s of steps) {
    statusTimestamps[s.status] = s.timestamp ?? '';
  }

  const currentIdx = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="relative flex items-center justify-center">
      <div className="flex items-center justify-between w-full max-w-2xl relative">
        <div className="absolute left-4 right-4 md:left-6 md:right-6 top-1/2 -translate-y-1/2 h-0.5 md:h-1 bg-[#d1d5db]" />
        {STATUS_ORDER.map((status, idx) => {
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;
          const tsDate = statusTimestamps[status];
          const label = steps.find((s) => s.status === status)?.label ?? DEFAULT_LABELS[status] ?? status;

          return (
            <div key={status} className="flex flex-col items-center z-10">
              <div
                className="flex h-8 w-8 md:h-12 md:w-12 items-center justify-center rounded-full text-[10px] md:text-sm font-bold border-2 md:border-[3px]"
                style={{
                  backgroundColor: isFuture ? '#e5e7eb' : isCurrent ? '#3b82f6' : '#10b981',
                  borderColor: isFuture ? '#d1d5db' : isCurrent ? '#3b82f6' : '#34d399',
                  color: isFuture ? '#9ca3af' : '#ffffff',
                }}
              >
                {idx + 1}
              </div>
              <span
                className="mt-1 md:mt-2 text-[10px] md:text-xs font-semibold whitespace-nowrap"
                style={{
                  color: isFuture ? '#9ca3af' : isCurrent ? '#3b82f6' : '#374151',
                }}
              >
                {label}
              </span>
              {tsDate && status !== 'BROUILLON' && (
                <span className="text-[8px] md:text-[9px] text-[#9ca3af] mt-0.5">{formatDate(tsDate)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
