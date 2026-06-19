import { useState } from 'react';
import { useConsultantProfile } from '../../../hooks/consultant/useConsultantProfile';

const currentYear = new Date().getFullYear();

const statusLabels: Record<string, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS: 'Soumis',
  VALIDE: 'Validé',
  REJETE: 'Rejeté',
  FACTURE: 'Facturé',
  PAYE: 'Payé',
};

export default function ProfilePage() {
  const [year, setYear] = useState(currentYear);
  const { data, isLoading, isError } = useConsultantProfile(year);

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-[#6b7280]">Chargement...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-[#ef4444]">Erreur lors du chargement du profil.</p>
      </div>
    );
  }

  const { profile, activeMissions, missionCounts, timesheetSummary, financialSnapshot } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-[22px] font-semibold text-[#111111] leading-[1.3] tracking-[-0.3px]">
        Profil
      </h1>

      <div className="rounded-[12px] bg-[#f5f5f5] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#111111]">Informations personnelles</h2>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-[#6b7280]">Nom</p>
            <p className="font-medium text-[#111111]">{profile.name}</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Email</p>
            <p className="text-xs md:text-sm font-medium text-[#111111] break-all">{profile.email}</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Profil</p>
            <p className="font-medium text-[#111111]">{profile.profile}</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Taux journalier</p>
            <p className="font-medium text-[#111111]">{profile.dailyRate} DH</p>
          </div>
        </div>
      </div>

      <div className="rounded-[12px] bg-[#f5f5f5] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#111111]">Missions</h2>
        <div className="flex gap-6 text-sm mb-4">
          <div className="rounded-[8px] bg-[#d1fae5] px-4 py-2">
            <p className="text-xs text-[#065f46]">Actives</p>
            <p className="text-xl font-bold text-[#065f46]">{missionCounts.active}</p>
          </div>
          <div className="rounded-[8px] bg-[#f5f5f5] border border-[#e5e7eb] px-4 py-2">
            <p className="text-xs text-[#6b7280]">Cloturées</p>
            <p className="text-xl font-bold text-[#6b7280]">{missionCounts.closed}</p>
          </div>
        </div>
        {activeMissions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#6b7280]">Missions en cours</p>
            {activeMissions.map((m) => (
              <div key={m.id} className="rounded-[8px] bg-[#ffffff] border border-[#e5e7eb] px-4 py-2.5 text-sm flex items-center justify-between">
                <span className="font-medium text-[#111111]">{m.title}</span>
                <span className="text-xs text-[#6b7280]">
                  {m.startDate.slice(0, 10)}{m.endDate ? ` → ${m.endDate.slice(0, 10)}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[12px] bg-[#f5f5f5] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#111111]">Statistiques</h2>
          <div className="flex gap-1">
            {[currentYear, currentYear - 1].map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`cursor-pointer rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors ${
                  year === y
                    ? 'bg-[#3b82f6] text-[#ffffff]'
                    : 'bg-[#ffffff] border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f3f4f6]'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-[#6b7280]">Total heures</p>
            <p className="text-xl font-bold text-[#111111]">{timesheetSummary.totalHours}h</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Total jours</p>
            <p className="text-xl font-bold text-[#111111]">{timesheetSummary.totalDays}</p>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          {Object.entries(timesheetSummary.counts).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2 text-sm">
              <span className="w-20 text-[#6b7280]">{statusLabels[status] ?? status}</span>
              <div className="flex-1 h-2 rounded-full bg-[#e5e7eb]">
                <div
                  className="h-2 rounded-full bg-[#3b82f6] transition-all"
                  style={{ width: `${Math.min(100, (count / Math.max(1, ...Object.values(timesheetSummary.counts))) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right font-medium text-[#111111]">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[12px] bg-[#f5f5f5] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#111111]">Financier</h2>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="rounded-[8px] bg-[#d1fae5] px-4 py-3">
            <p className="text-xs text-[#065f46]">Gains ({year})</p>
            <p className="text-xl font-bold text-[#065f46]">{financialSnapshot.yearToDateEarnings.toLocaleString()} DH</p>
          </div>
          <div className="rounded-[8px] bg-[#fef3c7] px-4 py-3">
            <p className="text-xs text-[#92400e]">Impayé</p>
            <p className="text-xl font-bold text-[#92400e]">{financialSnapshot.unpaidInvoicesTotal.toLocaleString()} DH</p>
          </div>
        </div>
      </div>
    </div>
  );
}
