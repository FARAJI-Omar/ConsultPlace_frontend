import { useState } from 'react';
import { useGenerateInvoice } from '../../../hooks/manager/useInvoices';
import { toast } from 'sonner';

interface ValidTimesheet {
  id: number;
  month: string;
  mission: { title: string };
  consultant: { name: string };
  totalHours: number;
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
  const [showConfirm, setShowConfirm] = useState(false);

  if (!open) return null;

  const isPrefilled = prefilledTimesheetId !== undefined;
  const selectedFromList = validTimesheets.find((ts) => ts.id === timesheetId);

  const handleGenerate = () => {
    if (!timesheetId) return;
    generateMutation.mutate(
      { timesheetId, vatRate: parseFloat(vatRate) || 20 },
      {
        onSuccess: () => {
          toast.success('Facture générée avec succès');
          onClose();
        },
        onError: () => toast.error("Erreur lors de la génération"),
      },
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
        <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Générer une facture</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">Relevé validé</label>
              {isPrefilled ? (
                <div className="rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-sm text-[#111111]">
                  {formatMonth(selectedFromList?.month ?? '')} | {selectedFromList?.consultant.name ?? ''} | {selectedFromList?.mission.title ?? ''}
                </div>
              ) : (
                <select
                  value={timesheetId}
                  onChange={(e) => setTimesheetId(Number(e.target.value))}
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
              disabled={generateMutation.isPending || !timesheetId}
              className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Générer
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={() => setShowConfirm(false)}>
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Générer la facture</h2>
            <p className="mb-6 text-sm text-[#6b7280]">
              Créer une facture pour {selectedFromList ? `${formatMonth(selectedFromList.month)} | ${selectedFromList.consultant.name} | ${selectedFromList.mission.title}` : `Relevé n°${timesheetId}`} avec TVA à {vatRate}%&nbsp;?
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
