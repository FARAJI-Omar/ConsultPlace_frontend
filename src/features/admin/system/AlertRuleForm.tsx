import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { parseApiError } from '../../../utils/errorParser';
import { useCreateAlertRule, useUpdateAlertRule, useGetAlertRuleById, ALLOWED_VARIABLES } from '../../../hooks/useAlertRules';
import type { AlertRule, AlertType, AlertEvent } from '../../../hooks/useAlertRules';

interface AlertRuleFormProps {
  rule?: AlertRule;
  onSuccess: () => void;
}

const TYPES: AlertType[] = ['CRITICAL', 'WARNING', 'INFO'];

const EVENT_OPTIONS: { value: AlertEvent; label: string }[] = [
  { value: 'LATE_INVOICE', label: 'Facture en retard' },
  { value: 'LATE_PAYOUT', label: 'Paiement en retard' },
  { value: 'UNBILLED_CRA', label: 'Relevé non facturé' },
  { value: 'PENDING_CRA', label: 'Relevé en attente' },
  { value: 'UPCOMING_BILL', label: 'Facture à venir' },
];

const EVENT_LABELS: Record<AlertEvent, string> = {
  LATE_INVOICE: 'Facture en retard',
  LATE_PAYOUT: 'Paiement en retard',
  UNBILLED_CRA: 'Relevé non facturé',
  PENDING_CRA: 'Relevé en attente',
  UPCOMING_BILL: 'Facture à venir',
};

const VARIABLE_LABELS: Record<string, string> = {
  invoiceRef: 'Réf. facture',
  daysOverdue: 'Jours de retard',
  daysUntilDue: 'Jours avant échéance',
  clientName: 'Nom du client',
  amount: 'Montant',
  dueDate: "Date d'échéance",
  consultantName: 'Nom du consultant',
  month: 'Mois',
  daysPending: 'Jours en attente',
  daysSinceValidation: 'Jours depuis validation',
};

const SAMPLE_VALUES: Record<string, string> = {
  invoiceRef: 'INV-001',
  daysOverdue: '15',
  daysUntilDue: '5',
  clientName: 'Client',
  consultantName: 'Consultant',
  amount: '15 000',
  month: 'Janvier 2026',
  daysPending: '10',
  daysSinceValidation: '20',
  dueDate: '15/06/2026',
};

function validateTemplate(template: string, event: AlertEvent): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];

  const allowed = ALLOWED_VARIABLES[event] ?? [];
  return matches
    .map((m) => m.replace(/[{}]/g, ''))
    .filter((v) => !allowed.includes(v))
    .map((v) => `{{${v}}} n'est pas disponible pour ${event}`);
}

function renderPreview(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_VALUES[key] ?? `{{${key}}}`);
}

export default function AlertRuleForm({ rule, onSuccess }: AlertRuleFormProps) {
  const editId = rule?.id;
  const { data: fetchedRule } = useGetAlertRuleById(editId);
  const resolvedRule = fetchedRule ?? rule;

  const [form, setForm] = useState({
    type: resolvedRule?.type ?? 'WARNING',
    event: resolvedRule?.event ?? 'LATE_INVOICE',
    threshold: resolvedRule?.threshold ?? 30,
    isActive: resolvedRule?.isActive ?? true,
    titleTemplate: resolvedRule?.titleTemplate ?? '',
    messageTemplate: resolvedRule?.messageTemplate ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [templateOpen, setTemplateOpen] = useState(!!rule);
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const messageRef = useRef<HTMLTextAreaElement>(null);

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

  const insertVariable = useCallback((variable: string) => {
    const textarea = messageRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.slice(0, start) + `{{${variable}}}` + text.slice(end);

    handleChange('messageTemplate', newText);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + variable.length + 4;
      textarea.setSelectionRange(pos, pos);
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setClientErrors([]);

    const requiredErrors: string[] = [];
    if (!form.type) requiredErrors.push('Ce champ est requis');
    if (!form.event) requiredErrors.push('Ce champ est requis');
    if (form.threshold === undefined || form.threshold === null) {
      requiredErrors.push('Ce champ est requis');
    } else if (Number(form.threshold) <= 0) {
      requiredErrors.push('Le seuil doit être un nombre positif');
    }
    if (requiredErrors.length > 0) {
      setClientErrors(requiredErrors);
      return;
    }

    const event = form.event;
    const titleErrors = form.titleTemplate ? validateTemplate(form.titleTemplate, event) : [];
    const messageErrors = form.messageTemplate ? validateTemplate(form.messageTemplate, event) : [];
    const allErrors = [...titleErrors, ...messageErrors];

    if (allErrors.length > 0) {
      setClientErrors(allErrors);
      return;
    }

    const data = {
      type: form.type,
      event: form.event,
      threshold: form.threshold,
      isActive: form.isActive,
      titleTemplate: form.titleTemplate || '',
      messageTemplate: form.messageTemplate || '',
    };

    if (rule) {
      const { event: _event, ...updateData } = data;
      updateMutation.mutate(
        { id: rule.id, data: updateData },
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

  const availableVars = (ALLOWED_VARIABLES[form.event] ?? []).filter(
    (v) => !(form.event === 'LATE_INVOICE' && (form.type === 'CRITICAL' || form.type === 'WARNING') && v === 'daysUntilDue'),
  );
  const activeEvent = rule ? (resolvedRule?.event ?? form.event) : form.event;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-red-500">(*) Champ obligatoire</p>
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
        {rule ? (
          <div className="rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-sm text-[#6b7280]">
            {EVENT_LABELS[activeEvent] ?? activeEvent}
          </div>
        ) : (
          <select
            value={form.event}
            onChange={(e) => {
              handleChange('event', e.target.value);
              setForm((prev) => ({ ...prev, titleTemplate: '', messageTemplate: '' }));
            }}
            className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
              errors.event ? 'border-red-500' : 'border-[#e5e7eb]'
            }`}
          >
            {EVENT_OPTIONS.map((ev) => (
              <option key={ev.value} value={ev.value}>{ev.label}</option>
            ))}
          </select>
        )}
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

      <div>
        <label className="mb-1 block text-sm font-medium text-[#111111]">
          Titre personnalisé
        </label>
        <textarea
          value={form.titleTemplate}
          onChange={(e) => handleChange('titleTemplate', e.target.value)}
          rows={2}
          placeholder="Laisser vide pour utiliser le titre par défaut"
          className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
            errors.titleTemplate ? 'border-red-500' : 'border-[#e5e7eb]'
          }`}
        />
        {errors.titleTemplate && <p className="mt-1 text-xs text-red-500">{errors.titleTemplate}</p>}
        {form.titleTemplate && (
          <p className="mt-1 text-xs text-[#6b7280] italic">
            Aperçu: {renderPreview(form.titleTemplate)}
          </p>
        )}
      </div>

      <div className="rounded-[8px] border border-[#e5e7eb]">
        <button
          type="button"
          onClick={() => setTemplateOpen(!templateOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-[#111111] hover:bg-[#f9fafb] transition-colors cursor-pointer"
        >
          <span>Message personnalisé</span>
          {templateOpen ? <ChevronDown className="h-4 w-4 text-[#6b7280]" /> : <ChevronRight className="h-4 w-4 text-[#6b7280]" />}
        </button>

        {templateOpen && (
          <div className="border-t border-[#e5e7eb] px-4 py-3 space-y-4">
            <div>
              <p className="mb-2 text-xs text-[#6b7280]">
                Cliquez sur une variable pour l'insérer dans le message. Les variables seront remplacées par les valeurs réelles lors de l'envoi.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availableVars.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="cursor-pointer rounded bg-[#eff6ff] px-2 py-0.5 text-xs text-[#3b82f6] hover:bg-[#dbeafe] transition-colors"
                  >
                    {VARIABLE_LABELS[v] ?? v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#111111]">
                Message personnalisé
              </label>
              <textarea
                ref={messageRef}
                value={form.messageTemplate}
                onChange={(e) => handleChange('messageTemplate', e.target.value)}
                rows={3}
                placeholder="Laisser vide pour utiliser le message par défaut"
                className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
                  errors.messageTemplate ? 'border-red-500' : 'border-[#e5e7eb]'
                }`}
              />
              {errors.messageTemplate && <p className="mt-1 text-xs text-red-500">{errors.messageTemplate}</p>}
              {form.messageTemplate && (
                <p className="mt-1 text-xs text-[#6b7280] italic">
                  Aperçu: {renderPreview(form.messageTemplate)}
                </p>
              )}
            </div>

            {clientErrors.length > 0 && (
              <div className="rounded-[8px] bg-[#fef2f2] px-3 py-2">
                {clientErrors.map((msg, i) => (
                  <p key={i} className="text-xs text-[#ef4444]">{msg}</p>
                ))}
              </div>
            )}
          </div>
        )}
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