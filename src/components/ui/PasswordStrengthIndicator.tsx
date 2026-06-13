import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const RULES = [
  { label: 'Au moins 6 caract\u00e8res', test: (p: string) => p.length >= 6 },
  { label: 'Une majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Un chiffre ou un caract\u00e8re sp\u00e9cial', test: (p: string) => /[^a-zA-Z]/.test(p) },
];

export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const hasInput = password.length > 0;

  return (
    <ul className="mt-2 space-y-1">
      {RULES.map((rule) => {
        const passed = rule.test(password);
        const state = !hasInput ? 'default' : passed ? 'valid' : 'invalid';
        return (
          <li key={rule.label} className="flex items-center gap-1.5 text-xs transition-colors">
            {state === 'valid' && <Check className="h-3 w-3 text-green-600 shrink-0" />}
            {state === 'invalid' && <X className="h-3 w-3 text-red-500 shrink-0" />}
            {state === 'default' && (
              <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-400" />
            )}
            <span
              className={cn(
                state === 'valid' && 'text-green-600',
                state === 'invalid' && 'text-red-500',
                state === 'default' && 'text-gray-400',
              )}
            >
              {rule.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
