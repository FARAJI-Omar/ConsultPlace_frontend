import { useMemo } from 'react';
import { useGetBdcsByMission } from '../../../hooks/useBdc';
import type { BonDeCommande } from '../../../types/models';

interface BdcSelectorForTimesheetProps {
  missionId: number;
  timesheetId: number;
  timesheetDays: number;
  selectedBdcIds: number[];
  onChange: (timesheetId: number, bdcIds: number[]) => void;
}

export default function BdcSelectorForTimesheet({
  missionId,
  timesheetId,
  timesheetDays,
  selectedBdcIds,
  onChange,
}: BdcSelectorForTimesheetProps) {
  const { data: bdcsData } = useGetBdcsByMission(missionId);
  const availableBdcs = useMemo(() => (bdcsData ?? []).filter((b: BonDeCommande) => b.isActive || selectedBdcIds.includes(b.id)), [bdcsData, selectedBdcIds]);

  const selectedBdcTotalDays = useMemo(() => {
    return availableBdcs
      .filter((b: BonDeCommande) => selectedBdcIds.includes(b.id))
      .reduce((sum: number, b: BonDeCommande) => sum + b.daysLeft, 0);
  }, [availableBdcs, selectedBdcIds]);

  const bdcWarning = selectedBdcIds.length > 0 && selectedBdcTotalDays < timesheetDays
    ? `Jours insuffisants : ${selectedBdcTotalDays} disponible(s) vs ${timesheetDays} requis`
    : '';

  const toggleBdc = (bdcId: number) => {
    const next = selectedBdcIds.includes(bdcId)
      ? selectedBdcIds.filter((id) => id !== bdcId)
      : [...selectedBdcIds, bdcId];
    onChange(timesheetId, next);
  };

  return (
    <div className="space-y-2">
      {availableBdcs.length === 0 ? (
        <p className="text-xs text-[#6b7280]">Aucun BDC disponible</p>
      ) : (
        <div className="space-y-1">
          {availableBdcs.map((bdc) => {
            const isSelected = selectedBdcIds.includes(bdc.id);
            const remainingPct = bdc.totalDays > 0 ? Math.round((bdc.daysLeft / bdc.totalDays) * 100) : 0;
            return (
              <div
                key={bdc.id}
                onClick={() => toggleBdc(bdc.id)}
                className={`cursor-pointer rounded-[6px] border p-2 transition-colors ${
                  isSelected ? 'border-primary-blue bg-[#EFF6FF]' : 'border-[#e5e7eb] bg-[#ffffff] hover:bg-[#f9fafb]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="h-4 w-4 cursor-pointer accent-primary-blue"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#111111]">{bdc.bdc}</p>
                    <p className="text-xs text-[#6b7280]">{bdc.daysLeft} / {bdc.totalDays} jours</p>
                  </div>
                  <div className="h-1.5 w-12 rounded-full bg-[#e5e7eb]">
                    <div
                      className={`h-1.5 rounded-full ${
                        remainingPct > 50 ? 'bg-[#10b981]' : remainingPct > 20 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
                      }`}
                      style={{ width: `${remainingPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {bdcWarning && (
        <p className="text-xs text-[#f59e0b]">{bdcWarning}</p>
      )}
      {selectedBdcIds.length > 0 && !bdcWarning && (
        <p className="text-xs text-[#10b981]">
          {selectedBdcTotalDays} jours disponibles sur {timesheetDays} requis
        </p>
      )}
    </div>
  );
}
