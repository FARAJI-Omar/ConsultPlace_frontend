import { useMemo, useEffect, useRef } from 'react';
import { useGetBdcsByMission } from '../../../hooks/useBdc';
import type { BonDeCommande } from '../../../types/models';

interface TimesheetSelection {
  timesheetId: number;
  days: number;
  selectedBdcIds: number[];
}

interface BdcSelectorForTimesheetProps {
  missionId: number;
  timesheetId: number;
  timesheetDays: number;
  selectedBdcIds: number[];
  onChange: (timesheetId: number, bdcIds: number[]) => void;
  allSelections?: TimesheetSelection[];
  onValidationChange?: (timesheetId: number, hasError: boolean) => void;
}

export default function BdcSelectorForTimesheet({
  missionId,
  timesheetId,
  timesheetDays,
  selectedBdcIds,
  onChange,
  allSelections = [],
  onValidationChange,
}: BdcSelectorForTimesheetProps) {
  const { data: bdcsData } = useGetBdcsByMission(missionId);
  const availableBdcs = useMemo(() => (bdcsData ?? []).filter((b: BonDeCommande) => b.isActive || selectedBdcIds.includes(b.id)), [bdcsData, selectedBdcIds]);
  const sortedBdcs = useMemo(() => [...availableBdcs].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [availableBdcs]);

  const bdcInfo = useMemo(() => {
    const consumedAll: Record<number, number> = {};
    availableBdcs.forEach((b) => { consumedAll[b.id] = 0; });
    const consumedThis: Record<number, number> = {};
    availableBdcs.forEach((b) => { consumedThis[b.id] = 0; });

    const sortedBdcs = [...availableBdcs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const simulate = (consumed: Record<number, number>, targetTsId?: number) => {
      allSelections.forEach((sel) => {
        if (sel.selectedBdcIds.length === 0) return;
        if (targetTsId !== undefined && sel.timesheetId !== targetTsId) return;
        let remaining = sel.days;
        const selBdcs = sortedBdcs.filter((b) => sel.selectedBdcIds.includes(b.id));
        for (const bdc of selBdcs) {
          const available = Math.max(0, bdc.daysLeft - consumed[bdc.id]);
          const take = Math.min(remaining, available);
          consumed[bdc.id] += take;
          remaining -= take;
          if (remaining <= 0) break;
        }
      });
    };

    simulate(consumedAll);
    simulate(consumedThis, timesheetId);

    const info: Record<number, { claimedByOthers: number; effectiveDaysLeft: number; consumedTotal: number; overflow: boolean; consumedHere: number }> = {};
    availableBdcs.forEach((b) => {
      const total = consumedAll[b.id];
      const here = consumedThis[b.id];
      const byOthers = total - here;
      const effectiveDaysLeft = Math.max(0, b.daysLeft - byOthers);
      info[b.id] = { claimedByOthers: byOthers, effectiveDaysLeft, consumedTotal: total, overflow: total > b.daysLeft, consumedHere: here };
    });
    return info;
  }, [availableBdcs, selectedBdcIds, allSelections, timesheetId]);

  const selectedBdcTotalDays = useMemo(() => {
    return selectedBdcIds.reduce((sum, id) => sum + (bdcInfo[id]?.effectiveDaysLeft ?? 0), 0);
  }, [selectedBdcIds, bdcInfo]);

  const bdcWarning = selectedBdcIds.length > 0 && selectedBdcTotalDays < timesheetDays
    ? `Jours insuffisants : ${selectedBdcTotalDays} disponible(s) vs ${timesheetDays} requis`
    : '';

  const hasBdcError = useMemo(() => {
    if (selectedBdcIds.length === 0) return false;
    if (bdcWarning) return true;
    return Object.values(bdcInfo).some((i) => i.overflow);
  }, [selectedBdcIds, bdcWarning, bdcInfo]);

  const onValidationChangeRef = useRef(onValidationChange);
  onValidationChangeRef.current = onValidationChange;

  useEffect(() => {
    onValidationChangeRef.current?.(timesheetId, hasBdcError);
  }, [timesheetId, hasBdcError]);

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
          {sortedBdcs.map((bdc, idx) => {
            const isSelected = selectedBdcIds.includes(bdc.id);
            const info = bdcInfo[bdc.id];
            const remainingPct = bdc.totalDays > 0 ? Math.round((info.effectiveDaysLeft / bdc.totalDays) * 100) : 0;
            const overflow = info.overflow;
            const isConsumedByOthers = !isSelected && info.effectiveDaysLeft <= 0 && info.consumedTotal > 0;
            return (
              <div
                key={bdc.id}
                onClick={() => { if (!isConsumedByOthers) toggleBdc(bdc.id); }}
                className={`rounded-[6px] border p-2 transition-colors ${
                  isConsumedByOthers
                    ? 'cursor-not-allowed border-[#e5e7eb] bg-[#f9fafb] opacity-40'
                    : overflow
                      ? 'cursor-pointer border-red-400 bg-red-50'
                      : isSelected
                        ? 'cursor-pointer border-primary-blue bg-[#EFF6FF]'
                        : 'cursor-pointer border-[#e5e7eb] bg-[#ffffff] hover:bg-[#f9fafb]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => { if (!isConsumedByOthers) toggleBdc(bdc.id); }}
                    disabled={isConsumedByOthers}
                    className="h-4 w-4 accent-primary-blue"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#111111]">{bdc.bdc}</p>
                    <p className="text-xs text-[#6b7280]">{info.effectiveDaysLeft} / {bdc.totalDays} jours</p>
                    {info.claimedByOthers > 0 && (
                      <p className="text-xs text-[#f59e0b]">{info.claimedByOthers} jours alloués à d'autres relevés</p>
                    )}
                    {overflow && (
                      <p className="text-xs text-red-500">Dépassement : {info.consumedTotal} alloués sur {bdc.daysLeft} disponibles</p>
                    )}
                  </div>
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-500 text-[10px] font-bold text-blue-500">
                    {idx + 1}
                  </span>
                  <div className="h-1.5 w-12 rounded-full bg-[#e5e7eb]">
                    <div
                      className={`h-1.5 rounded-full ${
                        overflow ? 'bg-[#ef4444]' : remainingPct > 50 ? 'bg-[#10b981]' : remainingPct > 20 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
                      }`}
                      style={{ width: `${Math.min(100, remainingPct)}%` }}
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
      {selectedBdcIds.length > 0 && !bdcWarning && selectedBdcTotalDays >= timesheetDays && (
        <p className="text-xs text-[#10b981]">
          {selectedBdcTotalDays} jours disponibles sur {timesheetDays} requis
        </p>
      )}
      {selectedBdcIds.length > 0 && (
        <div className="space-y-0.5">
          {sortedBdcs
            .filter((b) => selectedBdcIds.includes(b.id) && (bdcInfo[b.id]?.consumedHere ?? 0) > 0)
            .map((b) => (
              <p key={b.id} className="text-xs text-[#6b7280]">
                {bdcInfo[b.id].consumedHere} jours consommés du {b.bdc}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
