import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { DataTable } from '../../../components/common/DataTable';
import { useManagerTimesheets } from '../../../hooks/manager/useManagerTimesheets';
import { useGenerateGroupedInvoice } from '../../../hooks/manager/useInvoices';
import { formatDate } from '../../../lib/utils';
import ReviewCraModal from './ReviewCraModal';
import GenerateInvoiceModal from './GenerateInvoiceModal';
import BdcSelectorForTimesheet from './BdcSelectorForTimesheet';
import type { Column } from '../../../components/common/DataTable';
import type { ManagerTimesheet } from '../../../types/manager';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'SOUMIS', label: 'Soumis' },
  { value: 'VALIDE', label: 'Validé' },
  { value: 'REJETE', label: 'Rejeté' },
  { value: 'FACTURE', label: 'Facturé' },
  { value: 'PAYE', label: 'Payé' },
];

const statusBadge: Record<string, string> = {
  BROUILLON: 'bg-[#e5e7eb] text-[#6b7280]',
  SOUMIS: 'bg-[#fef3c7] text-[#f59e0b]',
  VALIDE: 'bg-[#d1fae5] text-[#10b981]',
  REJETE: 'bg-[#fee2e2] text-[#ef4444]',
  FACTURE: 'bg-[#ffedd5] text-[#f97316]',
  PAYE: 'bg-[#d1fae5] text-[#10b981]',
};

function formatMonth(month: string) {
  const [y, m] = month.split('-');
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function PendingCrasPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<number | null>(null);
  const [invoiceTimesheet, setInvoiceTimesheet] = useState<ManagerTimesheet | null>(null);
  const [groupedMode, setGroupedMode] = useState(false);
  const [selectedTsIds, setSelectedTsIds] = useState<number[]>([]);
  const [showGroupedModal, setShowGroupedModal] = useState(false);
  const [groupedVatRate, setGroupedVatRate] = useState('20');
  const [groupedDelai, setGroupedDelai] = useState('');
  const [groupedBdcAssignments, setGroupedBdcAssignments] = useState<Record<number, number[]>>({});
  const [bdcValidationErrors, setBdcValidationErrors] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState(true);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (hintRef.current && !hintRef.current.contains(e.target as Node)) {
        setShowHint(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const { data, isLoading } = useManagerTimesheets(page, limit, statusFilter || undefined);
  const groupedMutation = useGenerateGroupedInvoice();

  const handleToggleSelection = (id: number) => {
    setSelectedTsIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, []);

  const handlePageSizeChange = useCallback((s: number) => {
    setLimit(s);
    setPage(1);
  }, []);

  const filteredData = (data?.data ?? []).filter((ts) => ts.status !== 'BROUILLON');
  const valideCount = filteredData.filter((ts) => ts.status === 'VALIDE').length;

  const columns: Column<ManagerTimesheet>[] = [
    { key: '#', label: '#', render: (_item, idx) => String(idx + 1) },
    ...(groupedMode
      ? [
          {
            key: 'select' as const,
            label: '',
            render: (ts: ManagerTimesheet) => (
              <input
                type="checkbox"
                checked={selectedTsIds.includes(ts.id)}
                disabled={ts.status !== 'VALIDE'}
                onChange={() => handleToggleSelection(ts.id)}
                className="cursor-pointer"
              />
            ),
          } as Column<ManagerTimesheet>,
        ]
      : []),
    { key: 'month', label: 'Mois', render: (ts) => formatMonth(ts.month) },
    { key: 'missionTitle', label: 'Mission', render: (ts) => ts.mission.title },
    { key: 'consultantName', label: 'Consultant', render: (ts) => (
      <span className="inline-block rounded-[6px] bg-[#EFF6FF] px-2.5 py-1 text-sm font-medium text-[#111111]">{ts.consultant.name}</span>
    ) },
    {
      key: 'status',
      label: 'Statut',
      render: (ts) => (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[ts.status] || 'bg-[#e5e7eb] text-[#6b7280]'}`}>
          {STATUS_OPTIONS.find((o) => o.value === ts.status)?.label || ts.status}
        </span>
      ),
    },
    {
      key: 'submittedAt',
      label: 'Soumis le',
      render: (ts) => formatDate(ts.submittedAt),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (ts) => (
        <div className="flex gap-2">
          {ts.status === 'SOUMIS' && (
            <button
              onClick={() => setSelectedTimesheetId(ts.id)}
              className="cursor-pointer rounded-[8px] bg-[#3b82f6] px-3 py-1.5 text-xs font-medium text-[#ffffff] transition-colors hover:bg-[#2563eb]"
            >
              Examiner
            </button>
          )}
          {ts.status === 'VALIDE' && !groupedMode && (
            <button
              onClick={() => setInvoiceTimesheet(ts)}
              className="cursor-pointer rounded-[8px] bg-[#10b981] px-3 py-1.5 text-xs font-medium text-[#ffffff] transition-colors hover:bg-[#059669]"
            >
              + Générer facture
            </button>
          )}
          <Link
            to={`/manager/timesheets/${ts.id}`}
            className="inline-block rounded-[8px] border border-[#848383] bg-[#ffffff] px-3 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#bdbdbd]"
          >
            Voir détails
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 relative">
          <h1 className="text-2xl font-semibold text-[#111111]">Relevés des consultants</h1>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowHint((p) => !p); }}
            className="w-5 h-5 rounded-full border border-[#ff0000] text-[#ff0000] text-[10px] flex items-center justify-center hover:bg-[#f3f4f6] transition-colors flex-shrink-0 cursor-pointer"
          >
            !
          </button>
          {showHint && (
            <div ref={hintRef} className="absolute left-20 top-full mt-2 bg-white border border-[#ff0000] rounded-lg shadow-lg p-6 text-sm text-[#6b7280] z-10 max-w-xl">
              -Cliquez sur <strong>Examiner</strong> pour valider ou rejeter un relevé.<br />
              -Validez un relevé afin de générer une facture.
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <label className="text-sm font-medium text-[#111111]">Filtrer par statut:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {!groupedMode && valideCount >= 2 ? (
            <button
              onClick={() => { setGroupedMode(true); setSelectedTsIds([]); }}
              className="cursor-pointer rounded-[8px] bg-[#2451EB] px-3 py-2 text-sm font-medium text-[#ffffff] transition-colors hover:opacity-90 ml-auto"
            >
              Générer facture groupée
            </button>
          ) : !groupedMode ? (
            <div className="ml-auto" />
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-[#6b7280]">{selectedTsIds.length} sélectionné(s)</span>
              <button
                onClick={() => setShowGroupedModal(true)}
                disabled={selectedTsIds.length < 2}
                className={`cursor-pointer rounded-[8px] px-3 py-2 text-sm font-medium text-[#ffffff] transition-colors ${
                  selectedTsIds.length < 2 ? 'bg-[#9ca3af] cursor-not-allowed' : 'bg-[#10b981] hover:opacity-90'
                }`}
              >
                Générer
              </button>
              <button
                onClick={() => { setGroupedMode(false); setSelectedTsIds([]); }}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        pagination={data?.pagination ?? { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: limit }}
        isLoading={isLoading}
        isEmpty={!isLoading && filteredData.length === 0}
        emptyMessage="Aucun Relevé trouvé"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {selectedTimesheetId !== null && (
        <ReviewCraModal
          timesheetId={selectedTimesheetId}
          open={selectedTimesheetId !== null}
          onClose={() => setSelectedTimesheetId(null)}
        />
      )}

      {invoiceTimesheet !== null && (
        <GenerateInvoiceModal
          validTimesheets={[invoiceTimesheet]}
          prefilledTimesheetId={invoiceTimesheet.id}
          open={invoiceTimesheet !== null}
          onClose={() => setInvoiceTimesheet(null)}
        />
      )}

      {showGroupedModal && (() => {
        const selected = filteredData.filter((ts) => selectedTsIds.includes(ts.id));

        const handleBdcChange = (timesheetId: number, bdcIds: number[]) => {
          setGroupedBdcAssignments((prev) => ({ ...prev, [timesheetId]: bdcIds }));
        };

        const allSelections = selected.map((ts) => ({
          timesheetId: ts.id,
          days: ts.days,
          selectedBdcIds: groupedBdcAssignments[ts.id] ?? [],
        }));

        const handleBdcValidationChange = (timesheetId: number, hasError: boolean) => {
          setBdcValidationErrors((prev) => ({ ...prev, [timesheetId]: hasError }));
        };

        const hasBdcErrors = selected.some((ts) => bdcValidationErrors[ts.id]);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[12px] bg-[#ffffff] p-6 shadow-xl">
              <h2 className="mb-4 text-lg font-semibold text-[#111111]">
                Générer une facture groupée
              </h2>
              <p className="mb-3 text-sm text-[#6b7280]">
                Vous allez générer une facture unique pour les {selected.length} relevés suivants&nbsp;:
              </p>
              <div className="mb-4 space-y-4">
                {selected.map((ts) => (
                  <div key={ts.id} className="rounded-[8px] border border-[#e5e7eb] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-[#111111]">{ts.consultant.name}</span>
                      <span className="text-xs text-[#6b7280]">{formatMonth(ts.month)} — {ts.mission.title} — {ts.days} jours</span>
                    </div>
                    <div className="pl-2">
                      <label className="mb-1 block text-xs font-medium text-[#6b7280]">Bons de commande (facultatif)</label>
                      <BdcSelectorForTimesheet
                        missionId={ts.mission.id}
                        timesheetId={ts.id}
                        timesheetDays={ts.days}
                        selectedBdcIds={groupedBdcAssignments[ts.id] ?? []}
                        onChange={handleBdcChange}
                        allSelections={allSelections}
                        onValidationChange={handleBdcValidationChange}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-[#111111]">
                  TVA (%)
                </label>
                <input
                  type="number"
                  value={groupedVatRate}
                  onChange={(e) => setGroupedVatRate(e.target.value)}
                  min="0"
                  max="100"
                  className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] outline-none focus:border-primary-blue"
                />
              </div>
              <div className="mb-6">
                <label className="mb-1 block text-sm font-medium text-[#111111]">Délai (en jours)</label>
                <input
                  type="number"
                  value={groupedDelai}
                  onChange={(e) => setGroupedDelai(e.target.value)}
                  min="0"
                  placeholder="Facultatif"
                  className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] outline-none focus:border-primary-blue"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowGroupedModal(false); setGroupedVatRate('20'); setGroupedDelai(''); setGroupedBdcAssignments({}); }}
                  className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const bdcAssignments: { timesheetId: number; bdcId: number }[] = [];
                    selected.forEach((ts) => {
                      const bdcIds = groupedBdcAssignments[ts.id] ?? [];
                      bdcIds.forEach((bdcId) => bdcAssignments.push({ timesheetId: ts.id, bdcId }));
                    });
                    const payload: Record<string, unknown> = {
                      timesheetIds: selectedTsIds,
                      vatRate: Number(groupedVatRate) || 20,
                    };
                    const delaiNum = parseInt(groupedDelai, 10);
                    if (!isNaN(delaiNum) && delaiNum > 0) payload.delai = delaiNum;
                    if (bdcAssignments.length > 0) payload.bdcAssignments = bdcAssignments;
                    groupedMutation.mutate(
                      payload as unknown as Parameters<typeof groupedMutation.mutate>[0],
                      {
                        onSuccess: () => {
                          toast.success('Facture groupée générée avec succès');
                          setShowGroupedModal(false);
                          setGroupedMode(false);
                          setSelectedTsIds([]);
                          setGroupedVatRate('20');
                          setGroupedDelai('');
                          setGroupedBdcAssignments({});
                        },
                        onError: (err) => {
                          const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
                          toast.error(axiosErr.response?.data?.error?.message ?? 'Erreur lors de la génération');
                          setShowGroupedModal(false);
                        },
                      },
                    );
                  }}
                  disabled={groupedMutation.isPending || hasBdcErrors}
                  className="cursor-pointer rounded-[8px] bg-[#10b981] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {groupedMutation.isPending ? 'Génération...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
