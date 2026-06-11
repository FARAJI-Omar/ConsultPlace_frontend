import { useState } from 'react';
import { toast } from 'sonner';
import { parseApiError } from '../../../utils/errorParser';
import { useMutateConsultant, useUpdateConsultant } from '../../../hooks/useConsultants';
import type { Consultant } from '../../../types/models';
import LoadingOverlay from '../../../components/common/LoadingOverlay';

interface ConsultantFormProps {
  onSuccess: () => void;
  consultant?: Consultant;
}

const FIELDS: { key: string; label: string; required: boolean; type?: string }[] = [
  { key: 'name', label: 'Nom complet', required: true },
  { key: 'email', label: 'Email', required: true, type: 'email' },
  { key: 'profile', label: 'Profil', required: true },
  { key: 'dailyRate', label: 'Taux journalier (DH)', required: true, type: 'number' },
];

export default function ConsultantForm({ onSuccess, consultant }: ConsultantFormProps) {
  const isEdit = !!consultant;
  const [form, setForm] = useState({
    name: consultant?.name ?? '',
    email: consultant?.email ?? '',
    profile: consultant?.profile ?? '',
    dailyRate: consultant?.dailyRate.toString() ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutateConsultant();
  const updateMutation = useUpdateConsultant();
  const mutation = isEdit ? updateMutation : createMutation;

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
    if (!form.name) newErrors.name = 'Ce champ est requis';
    if (!form.email) {
      newErrors.email = 'Ce champ est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "L'email n'est pas valide";
    }
    if (!form.profile) newErrors.profile = 'Ce champ est requis';
    if (!form.dailyRate) {
      newErrors.dailyRate = 'Ce champ est requis';
    } else if (Number(form.dailyRate) <= 0) {
      newErrors.dailyRate = 'Le taux journalier doit être un nombre positif';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const mutateFn = isEdit
      ? (() => {
          const payload: Record<string, unknown> = {};
          if (form.name !== consultant!.name) payload.name = form.name;
          if (form.email !== consultant!.email) payload.email = form.email;
          if (form.profile !== consultant!.profile) payload.profile = form.profile;
          if (Number(form.dailyRate) !== consultant!.dailyRate) payload.dailyRate = Number(form.dailyRate);
          return updateMutation.mutateAsync({ id: consultant!.id, data: payload });
        })()
      : createMutation.mutateAsync({
          name: form.name,
          email: form.email,
          profile: form.profile,
          dailyRate: Number(form.dailyRate),
        });

    mutateFn.then(() => {
      toast.success(isEdit ? 'Consultant modifié avec succès' : 'Consultant créé avec succès. Un email d\'invitation lui a été envoyé.');
      onSuccess();
    }).catch((err: unknown) => {
      const fieldErrors = parseApiError(err);
      if (fieldErrors) {
        setErrors(fieldErrors);
      } else {
        const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
        toast.error(axiosErr.response?.data?.error?.message ?? "Une erreur est survenue lors de l'enregistrement");
      }
    });
  };

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
            autoComplete="new-password"
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
          type="button"
          onClick={onSuccess}
          className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-6 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="cursor-pointer rounded-[8px] bg-primary-blue px-6 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
    </LoadingOverlay>
  );
}
