import { useState } from 'react';
import { toast } from 'sonner';
import { parseApiError } from '../../../utils/errorParser';
import { useMutateConsultant } from '../../../hooks/useConsultants';

interface ConsultantFormProps {
  onSuccess: () => void;
}

const FIELDS: { key: string; label: string; required: boolean; type?: string }[] = [
  { key: 'name', label: 'Nom complet', required: true },
  { key: 'email', label: 'Email', required: true, type: 'email' },
  { key: 'profile', label: 'Profil', required: true },
  { key: 'dailyRate', label: 'Taux journalier (DH)', required: true, type: 'number' },
  { key: 'password', label: 'Mot de passe', required: true, type: 'password' },
];

export default function ConsultantForm({ onSuccess }: ConsultantFormProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    profile: '',
    dailyRate: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutateConsultant();

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
        name: form.name,
        email: form.email,
        profile: form.profile,
        dailyRate: Number(form.dailyRate),
        password: form.password,
      },
      {
        onSuccess: () => {
          toast.success('Consultant créé avec succès');
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {FIELDS.map(({ key, label, required, type }) => (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium text-[#111111]">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <input
            type={type ?? 'text'}
            value={(form as Record<string, string>)[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
              errors[key] ? 'border-red-500' : 'border-[#e5e7eb]'
            }`}
          />
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
