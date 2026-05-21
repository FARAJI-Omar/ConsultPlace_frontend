import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { parseApiError } from '../../../utils/errorParser';
import { useMutateContract } from '../../../hooks/useContracts';
import { useGetClients } from '../../../hooks/useClients';
import DatePicker from '../../../components/common/DatePicker';

interface ContractFormProps {
  onSuccess: () => void;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function ContractForm({ onSuccess }: ContractFormProps) {
  const [form, setForm] = useState({
    clientId: '' as string | number,
    startDate: '',
    endDate: '',
    profile: '',
    dailyRate: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: clientsData } = useGetClients(1, 100);
  const mutation = useMutateContract();

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const remaining = MAX_FILES - files.length;
    const allowed = selected.slice(0, remaining);

    const oversized = allowed.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error('Certains fichiers dépassent la limite de 10 Mo');
      return;
    }

    setFiles((prev) => [...prev, ...allowed]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!form.clientId) newErrors.clientId = 'Ce champ est requis';
    if (!form.startDate) newErrors.startDate = 'Ce champ est requis';
    if (!form.endDate) newErrors.endDate = 'Ce champ est requis';
    if (!form.profile) newErrors.profile = 'Ce champ est requis';
    if (!form.dailyRate) {
      newErrors.dailyRate = 'Ce champ est requis';
    } else if (Number(form.dailyRate) <= 0) {
      newErrors.dailyRate = 'Le taux journalier doit être un nombre positif';
    }
    if (form.startDate && form.endDate && form.startDate >= form.endDate) {
      newErrors.endDate = 'La date de fin doit être postérieure à la date de début';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    mutation.mutate(
      {
        clientId: Number(form.clientId),
        startDate: form.startDate,
        endDate: form.endDate,
        profile: form.profile,
        dailyRate: Number(form.dailyRate),
        files: files.length > 0 ? files : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Contrat créé avec succès');
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

  const FIELDS = [
    { key: 'clientId', label: 'Client', required: true, type: 'select' },
    { key: 'startDate', label: 'Date de début', required: true, type: 'date' },
    { key: 'endDate', label: 'Date de fin', required: true, type: 'date' },
    { key: 'profile', label: 'Profil', required: true },
    { key: 'dailyRate', label: 'Taux journalier (DH)', required: true, type: 'number' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-red-500">(*) Champ obligatoire</p>
      {FIELDS.map(({ key, label, required, type }) => (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium text-[#111111]">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {type === 'select' ? (
            <select
              value={form.clientId}
              onChange={(e) => handleChange('clientId', e.target.value)}
              className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
                errors.clientId ? 'border-red-500' : 'border-[#e5e7eb]'
              }`}
            >
              <option value="">Sélectionner un client</option>
              {(clientsData?.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.raison_sociale}
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
              min={type === 'number' ? 0 : undefined}
              className={`w-full rounded-[8px] border px-3 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-primary-blue ${
                errors[key] ? 'border-red-500' : 'border-[#e5e7eb]'
              }`}
            />
          )}
          {type !== 'date' && errors[key] && (
            <p className="mt-1 text-xs text-red-500">{errors[key]}</p>
          )}
        </div>
      ))}

      <div>
        <label className="mb-1 block text-sm font-medium text-[#111111]">
          Documents (PDF, max 10 fichiers, 10 Mo chacun)
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-dashed border-[#e5e7eb] px-3 py-4 text-sm text-[#6b7280] transition-colors hover:border-primary-blue hover:text-primary-blue"
        >
          <Upload className="h-4 w-4" />
          <span>Cliquez pour ajouter des fichiers</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((file, i) => (
              <li key={i} className="flex items-center justify-between rounded bg-[#f9fafb] px-3 py-1.5 text-sm text-[#111111]">
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="cursor-pointer rounded p-0.5 text-[#6b7280] transition-colors hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
            {files.length < MAX_FILES && (
              <li
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer text-xs text-primary-blue hover:underline"
              >
                + Ajouter plus de fichiers
              </li>
            )}
          </ul>
        )}
      </div>

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
