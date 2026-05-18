import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';

export default function ProfilePage() {
  const user = useSelector((state: RootState) => state.auth.user);

  if (!user) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-[#6b7280]">Aucune donnée utilisateur disponible.</p>
      </div>
    );
  }

  const fields = [
    { label: 'Email', value: user.email },
    { label: 'Rôle', value: user.role },
    { label: 'ID utilisateur', value: String(user.id) },
    { label: 'ID consultant', value: user.consultantId !== null ? String(user.consultantId) : 'N/A' },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[22px] font-semibold text-[#111111] leading-[1.3] tracking-[-0.3px] mb-6">
        Profil
      </h1>

      <div className="rounded-[12px] bg-[#f5f5f5] p-8">
        <div className="space-y-6">
          {fields.map((field) => (
            <div key={field.label}>
              <p className="text-[16px] font-semibold text-[#111111] leading-[1.4] mb-1">
                {field.label}
              </p>
              <p className="text-[16px] text-[#374151] leading-[1.5]">
                {field.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
