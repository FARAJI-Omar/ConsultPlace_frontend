import { useState } from 'react';
import { toast } from 'sonner';
import { parseApiError } from '../../../utils/errorParser';
import { useCreateAlertRule, useUpdateAlertRule } from '../../../hooks/useAlertRules';
import type { AlertRule, AlertType, AlertEvent } from '../../../hooks/useAlertRules';

interface AlertRuleFormProps {
  rule?: AlertRule;
  onSuccess: () => void;
}

const TYPES: AlertType[] = ['CRITICAL', 'WARNING', 'INFO'];

const EVENT_OPTIONS: { value: AlertEvent; label: string }[] = [
  { value: 'LATE_INVOICE', label: 'Facture en retard' },
  { value: 'LATE_PAYOUT', label: 'Paiement en retard' },
  { value: 'UNBILLED_CRA', label: 'CRA non facturé' },
  { value: 'PENDING_CRA', label: 'CRA en attente' },
  { value: 'UPCOMING_BILL', label: 'Facture à venir' },
];

export default function AlertRuleForm({ rule, onSuccess }: AlertRuleFormProps) {
  const [form, setForm] = useState({
    type: rule?.type ?? 'WARNING',
    event: rule?.event ?? 'LATE_INVOICE',
    threshold: rule?.threshold ?? 30,
    isActive: rule?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateAlertRule();
  const updateMutation = useUpdateAlertRule();
  const isPending = rule ? updateMutation.isPending : createMutation.isPending;

  const handleChange = (key: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const data = { type: form.type, event: form.event, threshold: form.threshold, isActive: form.isActive };

    if (rule) {
      updateMutation.mutate(
        { id: rule.id, data },
        {
          onSuccess: () => {
            toast.success('Règle modifiée avec succès');
            onSuccess();
          },
          onError: (err: unknown) => {
            const fieldErrors = parseApiError(err);
            if (fieldErrors) {
              setErrors(fieldErrors);
            } else {
              toast.error("Une erreur est survenue lors de l'enregistrement");
            }
          },
        },
      );
    } else {
      createMutation.mutate(
        data,
        {
          onSuccess: () => {
            toast.success("Règle d'alerte créée avec succès");
            onSuccess();
          },
          onError: (err: unknown) => {
            const fieldErrors = parseApiError(err);
            if (fieldErrors) {
              setErrors(fieldErrors);
            } else {
              toast.error("Une erreur est survenue lors de l'enregistrement");
            }
          },
        },
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-[#111111]">
          Type <span className="text-red-500 ml-0.5">*</span>
        </label>
        <select
          value={form.type}
          onChange={(e) => handleChange('type', e.target.value)}
          className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
            errors.type ? 'border-red-500' : 'border-[#e5e7eb]'
          }`}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[#111111]">
          Événement <span className="text-red-500 ml-0.5">*</span>
        </label>
        <select
          value={form.event}
          onChange={(e) => handleChange('event', e.target.value)}
          className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
            errors.event ? 'border-red-500' : 'border-[#e5e7eb]'
          }`}
        >
          {EVENT_OPTIONS.map((ev) => (
            <option key={ev.value} value={ev.value}>{ev.label}</option>
          ))}
        </select>
        {errors.event && <p className="mt-1 text-xs text-red-500">{errors.event}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[#111111]">
          Seuil (jours) <span className="text-red-500 ml-0.5">*</span>
        </label>
        <input
          type="number"
          min={0}
          value={form.threshold}
          onChange={(e) => handleChange('threshold', Number(e.target.value))}
          className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
            errors.threshold ? 'border-red-500' : 'border-[#e5e7eb]'
          }`}
        />
        {errors.threshold && <p className="mt-1 text-xs text-red-500">{errors.threshold}</p>}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-[#111111]">Active</label>
        <button
          type="button"
          onClick={() => handleChange('isActive', !form.isActive)}
          className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${
            form.isActive ? 'bg-primary-blue' : 'bg-[#e5e7eb]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-[#ffffff] transition-transform ${
              form.isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="cursor-pointer rounded-[8px] bg-primary-blue px-6 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Enregistrement...' : rule ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  );
}
