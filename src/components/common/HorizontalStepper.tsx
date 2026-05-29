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
      <div className="absolute left-[60px] right-[60px] top-6 h-1 bg-[#d1d5db]" />
      <div className="flex items-center justify-between w-full max-w-2xl relative">
        {STATUS_ORDER.map((status, idx) => {
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;
          const tsDate = statusTimestamps[status];
          const label = steps.find((s) => s.status === status)?.label ?? DEFAULT_LABELS[status] ?? status;

          return (
            <div key={status} className="flex flex-col items-center z-10">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold border-[3px]"
                style={{
                  backgroundColor: isFuture ? '#e5e7eb' : isCurrent ? '#3b82f6' : '#10b981',
                  borderColor: isFuture ? '#d1d5db' : isCurrent ? '#3b82f6' : '#34d399',
                  color: isFuture ? '#9ca3af' : '#ffffff',
                }}
              >
                {idx + 1}
              </div>
              <span
                className="mt-2 text-xs font-semibold whitespace-nowrap"
                style={{
                  color: isFuture ? '#9ca3af' : isCurrent ? '#3b82f6' : '#374151',
                }}
              >
                {label}
              </span>
              {tsDate && status !== 'BROUILLON' && (
                <span className="text-[9px] text-[#9ca3af] mt-0.5">{formatDate(tsDate)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
