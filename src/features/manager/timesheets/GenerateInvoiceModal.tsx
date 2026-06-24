import { useState, useMemo } from 'react';
import { useGenerateInvoice } from '../../../hooks/manager/useInvoices';
import { useGetBdcsByMission } from '../../../hooks/useBdc';
import { toast } from 'sonner';

interface ValidTimesheet {
  id: number;
  month: string;
  mission: { id: number; title: string };
  consultant: { name: string };
  totalHours: number;
  days: number;
}

interface GenerateInvoiceModalProps {
  validTimesheets: ValidTimesheet[];
  prefilledTimesheetId?: number;
  open: boolean;
  onClose: () => void;
}

function formatMonth(month: string) {
  const [y, m] = month.split('-');
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function GenerateInvoiceModal({
  validTimesheets,
  prefilledTimesheetId,
  open,
  onClose,
}: GenerateInvoiceModalProps) {
  const generateMutation = useGenerateInvoice();
  const [timesheetId, setTimesheetId] = useState(prefilledTimesheetId ?? (validTimesheets[0]?.id ?? 0));
  const [vatRate, setVatRate] = useState('20');
  const [delai, setDelai] = useState('');
  const [selectedBdcIds, setSelectedBdcIds] = useState<number[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const isPrefilled = prefilledTimesheetId !== undefined;
  const selectedFromList = validTimesheets.find((ts) => ts.id === timesheetId);
  const missionId = selectedFromList?.mission.id;
  const timesheetDays = selectedFromList?.days ?? 0;

  const { data: bdcsData } = useGetBdcsByMission(missionId);
  const availableBdcs = useMemo(() => (bdcsData ?? []).filter((b) => b.isActive || selectedBdcIds.includes(b.id)), [bdcsData, selectedBdcIds]);
  const sortedBdcs = useMemo(() => [...availableBdcs].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [availableBdcs]);

  const selectedBdcTotalDays = useMemo(() => {
    return availableBdcs
      .filter((b) => selectedBdcIds.includes(b.id))
      .reduce((sum, b) => sum + b.daysLeft, 0);
  }, [availableBdcs, selectedBdcIds]);

  const bdcWarning = selectedBdcIds.length > 0 && selectedBdcTotalDays < timesheetDays
    ? `Jours insuffisants : ${selectedBdcTotalDays} disponible(s) vs ${timesheetDays} requis`
    : '';

  const bdcBreakdown = useMemo(() => {
    const result: { bdc: string; days: number }[] = [];
    if (selectedBdcIds.length === 0 || !timesheetDays) return result;
    const selected = sortedBdcs.filter((b) => selectedBdcIds.includes(b.id));
    let remaining = timesheetDays;
    for (const b of selected) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, b.daysLeft);
      result.push({ bdc: b.bdc, days: take });
      remaining -= take;
    }
    return result;
  }, [sortedBdcs, selectedBdcIds, timesheetDays]);

  if (!open) return null;

  const handleGenerate = () => {
    if (!timesheetId) return;
    const payload: Record<string, unknown> = {
      timesheetId,
      vatRate: parseFloat(vatRate) || 20,
    };
    const delaiNum = parseInt(delai, 10);
    if (!isNaN(delaiNum) && delaiNum > 0) payload.delai = delaiNum;
    if (selectedBdcIds.length > 0) {
      payload.bdcAssignments = selectedBdcIds.map((bdcId) => ({ timesheetId, bdcId }));
    }
    generateMutation.mutate(
      payload as unknown as Parameters<typeof generateMutation.mutate>[0],
      {
        onSuccess: () => {
          toast.success('Facture générée avec succès');
          onClose();
        },
        onError: (err: unknown) => {
          const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
          toast.error(axiosErr.response?.data?.error?.message ?? 'Erreur lors de la génération');
        },
      },
    );
  };

  const toggleBdc = (bdcId: number) => {
    setSelectedBdcIds((prev) =>
      prev.includes(bdcId) ? prev.filter((id) => id !== bdcId) : [...prev, bdcId],
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-xl rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Générer une facture</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">Relevé validé <span className='text-gray-400 text-xs'>(mois | consultant | mission)</span></label>
              {isPrefilled ? (
                <div className="rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-sm text-[#111111]">
                  {formatMonth(selectedFromList?.month ?? '')} | {selectedFromList?.consultant.name ?? ''} | {selectedFromList?.mission.title ?? ''}
                </div>
              ) : (
                <select
                  value={timesheetId}
                  onChange={(e) => {
                    const newId = Number(e.target.value);
                    setTimesheetId(newId);
                    setSelectedBdcIds([]);
                  }}
                  className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                >
                  <option value={0}>Sélectionner un Relevé</option>
                  {validTimesheets.map((ts) => (
                    <option key={ts.id} value={ts.id}>
                      {ts.month} | {ts.consultant.name} | {ts.mission.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">TVA (%)</label>
              <input
                type="number"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">Délai (en jours)</label>
              <input
                type="number"
                value={delai}
                onChange={(e) => setDelai(e.target.value)}
                min="0"
                placeholder="Facultatif"
                className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>

            {timesheetId > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Bons de commande (facultatif)
                </label>
                {availableBdcs.length === 0 ? (
                  <p className="text-xs text-[#6b7280]">Aucun BDC disponible pour cette mission</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {sortedBdcs.map((bdc, idx) => {
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
                              <p className="text-xs text-[#6b7280]">{bdc.daysLeft} / {bdc.totalDays} jours restants</p>
                            </div>
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-500 text-[10px] font-bold text-blue-500">
                              {idx + 1}
                            </span>
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
                  <p className="mt-2 text-xs text-[#f59e0b]">{bdcWarning}</p>
                )}
                {selectedBdcIds.length > 0 && !bdcWarning && (
                  <p className="mt-2 text-xs text-[#10b981]">
                    {selectedBdcTotalDays} jours disponibles sur {timesheetDays} requis
                  </p>
                )}
                {selectedBdcIds.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {bdcBreakdown.filter((b) => b.days > 0).map((b) => (
                      <p key={b.bdc} className="text-xs text-[#6b7280]">
                        {b.days} jours consommés du {b.bdc}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
            >
              Annuler
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={generateMutation.isPending || !timesheetId || (!!bdcWarning)}
              className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Générer
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Générer la facture</h2>
            <p className="mb-6 text-sm text-[#6b7280]">
              Créer une facture pour {selectedFromList ? `${formatMonth(selectedFromList.month)} | ${selectedFromList.consultant.name} | ${selectedFromList.mission.title}` : `Relevé n°${timesheetId}`} avec TVA à {vatRate}%
              {selectedBdcIds.length > 0 ? `, BDCs: ${selectedBdcIds.length} sélectionné(s)` : ''}
              {delai.trim() ? `, délai: ${delai.trim()} jours` : ''}&nbsp;?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Annuler
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleGenerate(); }}
                disabled={generateMutation.isPending}
                className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {generateMutation.isPending ? 'Génération...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
