import { useState } from 'react';
import { toast } from 'sonner';
import { parseApiError } from '../../../utils/errorParser';
import { useMutateMission } from '../../../hooks/useMissions';
import { useGetContracts } from '../../../hooks/useContracts';
import { useGetConsultants } from '../../../hooks/useConsultants';
import DatePicker from '../../../components/common/DatePicker';

interface MissionFormProps {
  onSuccess: () => void;
}

export default function MissionForm({ onSuccess }: MissionFormProps) {
  const [form, setForm] = useState({
    contractId: '',
    consultantId: '',
    title: '',
    startDate: '',
    endDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: contractsData } = useGetContracts(1, 200);
  const { data: consultantsData } = useGetConsultants(1, 200);
  const activeConsultants = (consultantsData?.data ?? []).filter((c) => c.isActive);
  const mutation = useMutateMission();

  const handleChange = (key: string, value: string) => {
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

    mutation.mutate(
      {
        contractId: Number(form.contractId),
        consultantId: Number(form.consultantId),
        title: form.title,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Mission créée avec succès');
          onSuccess();
        },
        onError: (err) => {
          const fieldErrors = parseApiError(err);
          if (fieldErrors) {
            setErrors(fieldErrors);
          } else {
            toast.error("Une erreur est survenue lors de l'enregistrement");
          }
        },
      },
    );
  };

  const FIELDS: { key: string; label: string; required: boolean; type?: string; options?: { id: number; ref?: string; name?: string }[] }[] = [
    { key: 'contractId', label: 'Contrat', required: true, type: 'select', options: (contractsData?.data ?? []).map((c) => ({ id: c.id, ref: c.ref })) },
    { key: 'consultantId', label: 'Consultant', required: true, type: 'select', options: activeConsultants.map((c) => ({ id: c.id, name: c.name })) },
    { key: 'title', label: 'Titre', required: true },
    { key: 'startDate', label: 'Date de début', required: true, type: 'date' },
    { key: 'endDate', label: 'Date de fin', required: false, type: 'date' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {FIELDS.map(({ key, label, required, type, options }) => (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium text-[#111111]">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {type === 'select' ? (
            <select
              value={String((form as Record<string, string>)[key] ?? '')}
              onChange={(e) => handleChange(key, e.target.value)}
              className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
                errors[key] ? 'border-red-500' : 'border-[#e5e7eb]'
              }`}
            >
              <option value="">Sélectionner</option>
              {(options ?? []).map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.ref ?? opt.name ?? String(opt.id)}
                </option>
              ))}
            </select>
          ) : type === 'date' ? (
            <DatePicker
              value={String((form as Record<string, string>)[key] ?? '')}
              onChange={(val) => handleChange(key, val)}
              error={errors[key]}
            />
          ) : (
            <input
              type={type ?? 'text'}
              value={String((form as Record<string, string>)[key] ?? '')}
              onChange={(e) => handleChange(key, e.target.value)}
              className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
                errors[key] ? 'border-red-500' : 'border-[#e5e7eb]'
              }`}
            />
          )}
          {errors[key] && (
            <p className="mt-1 text-xs text-red-500">{errors[key]}</p>
          )}
        </div>
      ))}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="cursor-pointer rounded-[8px] bg-primary-blue px-6 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? 'Enregistrement...' : 'Créer'}
        </button>
      </div>
    </form>
  );
}
