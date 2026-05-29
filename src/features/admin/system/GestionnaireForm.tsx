import { useState } from 'react';
import { toast } from 'sonner';
import { parseApiError } from '../../../utils/errorParser';
import { useCreateGestionnaire } from '../../../hooks/useGestionnaires';
import LoadingOverlay from '../../../components/common/LoadingOverlay';

interface GestionnaireFormProps {
  onSuccess: () => void;
}

export default function GestionnaireForm({ onSuccess }: GestionnaireFormProps) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useCreateGestionnaire();

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

    const newErrors: Record<string, string> = {};
    if (!form.email) {
      newErrors.email = 'Ce champ est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "L'email n'est pas valide";
    }
    if (!form.password) {
      newErrors.password = 'Ce champ est requis';
    } else if (form.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    mutation.mutate(form, {
      onSuccess: () => {
        toast.success('Gestionnaire créé avec succès');
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
    });
  };

  const FIELDS = [
    { key: 'email', label: 'Email', required: true, type: 'email' },
    { key: 'password', label: 'Mot de passe', required: true, type: 'password' },
  ];

  return (
    <LoadingOverlay isLoading={mutation.isPending}>
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-red-500">(*) Champ obligatoire</p>
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
    </LoadingOverlay>
  );
}
