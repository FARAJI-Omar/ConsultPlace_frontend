import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { parseApiError } from '../../../utils/errorParser';
import { useCreateGestionnaire } from '../../../hooks/useGestionnaires';
import LoadingOverlay from '../../../components/common/LoadingOverlay';
import PasswordStrengthIndicator from '../../../components/ui/PasswordStrengthIndicator';

interface GestionnaireFormProps {
  onSuccess: () => void;
}

export default function GestionnaireForm({ onSuccess }: GestionnaireFormProps) {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caract\u00e8res';
    } else if (!/[A-Z]/.test(form.password)) {
      newErrors.password = 'Doit contenir une majuscule';
    } else if (!/[^a-zA-Z]/.test(form.password)) {
      newErrors.password = 'Doit contenir un chiffre ou un caract\u00e8re sp\u00e9cial';
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const { confirmPassword: _, ...payload } = form;
    mutation.mutate(payload, {
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
    { key: 'confirmPassword', label: 'Confirmer le mot de passe', required: true, type: 'password' },
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
          {type === 'password' ? (
            <div className="relative">
              <input
                type={key === 'confirmPassword' ? (showConfirmPassword ? 'text' : 'password') : (showPassword ? 'text' : 'password')}
                value={(form as Record<string, string>)[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                autoComplete="new-password"
                className={`w-full rounded-[8px] border px-3 py-2 pr-10 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
                  errors[key] ? 'border-red-500' : 'border-[#e5e7eb]'
                }`}
              />
              <button
                type="button"
                onClick={() => key === 'confirmPassword' ? setShowConfirmPassword(!showConfirmPassword) : setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#6b7280] hover:text-[#111111]"
              >
                {(key === 'confirmPassword' ? showConfirmPassword : showPassword) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <input
              type={type ?? 'text'}
              value={(form as Record<string, string>)[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              autoComplete="new-password"
              className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
                errors[key] ? 'border-red-500' : 'border-[#e5e7eb]'
              }`}
            />
          )}
          {errors[key] && (
            <p className="mt-1 text-xs text-red-500">{errors[key]}</p>
          )}
          {key === 'password' && <PasswordStrengthIndicator password={form.password} />}
          {key === 'confirmPassword' && form.confirmPassword && form.password !== form.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">Les mots de passe ne correspondent pas</p>
          )}
        </div>
      ))}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onSuccess}
          className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-6 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={mutation.isPending || form.password !== form.confirmPassword}
          className="cursor-pointer rounded-[8px] bg-primary-blue px-6 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? 'Enregistrement...' : 'Créer'}
        </button>
      </div>
    </form>
    </LoadingOverlay>
  );
}
