import { useState } from 'react';
import { toast } from 'sonner';
import { parseApiError } from '../../../utils/errorParser';
import { useMutateClient } from '../../../hooks/useClients';

interface Client {
  id: number;
  raison_sociale: string;
  rc: string;
  identifiant_commun: string;
  identifiant_fiscal: string | null;
  contact: string;
  email: string;
  address: string;
  phone_n: string | null;
}

interface ClientFormProps {
  client?: Client;
  onSuccess: () => void;
}

const FIELDS: { key: string; label: string; required: boolean; type?: string }[] = [
  { key: 'raison_sociale', label: 'Raison sociale', required: true },
  { key: 'rc', label: 'Registre de Commerce', required: true },
  { key: 'identifiant_commun', label: "Identifiant Commun d'Entreprise (ICE)", required: true },
  { key: 'identifiant_fiscal', label: 'Identifiant Fiscal (IF)', required: false },
  { key: 'contact', label: 'Contact', required: true },
  { key: 'email', label: 'Email', required: true, type: 'email' },
  { key: 'address', label: 'Adresse', required: true },
  { key: 'phone_n', label: 'Téléphone', required: false, type: 'tel' },
];

export default function ClientForm({ client, onSuccess }: ClientFormProps) {
  const [form, setForm] = useState({
    raison_sociale: client?.raison_sociale ?? '',
    rc: client?.rc ?? '',
    identifiant_commun: client?.identifiant_commun ?? '',
    identifiant_fiscal: client?.identifiant_fiscal ?? '',
    contact: client?.contact ?? '',
    email: client?.email ?? '',
    address: client?.address ?? '',
    phone_n: client?.phone_n ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutateClient();

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
    if (!form.raison_sociale) newErrors.raison_sociale = 'Ce champ est requis';
    if (!form.rc) newErrors.rc = 'Ce champ est requis';
    if (!form.identifiant_commun) newErrors.identifiant_commun = 'Ce champ est requis';
    if (!form.contact) newErrors.contact = 'Ce champ est requis';
    if (!form.email) {
      newErrors.email = 'Ce champ est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "L'email n'est pas valide";
    }
    if (!form.address) newErrors.address = 'Ce champ est requis';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    mutation.mutate(
      { id: client?.id, data: form },
      {
        onSuccess: () => {
          toast.success(client ? 'Client modifié avec succès' : 'Client créé avec succès');
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
          {mutation.isPending
            ? 'Enregistrement...'
            : client
            ? 'Modifier'
            : 'Créer'}
        </button>
      </div>
    </form>
  );
}
