import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Eye } from 'lucide-react';
import { DataTable, type Column } from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import { useGetAuditLogs, type AuditLogEntry } from '../../../hooks/useAuditLog';
import { format } from 'date-fns';

function toDisplayDate(val: string): string {
  if (!val) return '';
  const iso = val.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  return val;
}

function toStorageDate(ddmm: string, endOfDay = false): string {
  const parts = ddmm.split('/');
  if (parts.length !== 3) return ddmm;
  const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
  if (endOfDay) {
    return `${dateStr}T23:59:59.999Z`;
  }
  return `${dateStr}T00:00:00.000Z`;
}

function getDateError(val: string): string {
  if (!val) return '';
  const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return 'Format de date invalide (jj/mm/aaaa)';
  const [, dd, mm, yyyy] = m;
  const d = new Date(+yyyy, +mm - 1, +dd);
  if (d.getDate() !== +dd || d.getMonth() !== +mm - 1 || d.getFullYear() !== +yyyy) {
    return `Le jour ${dd} n'existe pas pour le mois ${mm}/${yyyy}`;
  }
  return '';
}

const ROLE_OPTIONS = ['', 'ADMIN', 'CONSULTANT', 'GESTIONNAIRE'] as const;
const ROLE_LABELS: Record<string, string> = {
  '': 'Tous',
  ADMIN: 'Admin',
  CONSULTANT: 'Consultant',
  GESTIONNAIRE: 'Gestionnaire',
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  ADMIN: 'bg-blue-100 text-blue-700',
  CONSULTANT: 'bg-green-100 text-green-700',
  GESTIONNAIRE: 'bg-orange-100 text-orange-700',
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [roleFilter, setRoleFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const [debouncedRole, setDebouncedRole] = useState('');
  const [debouncedUser, setDebouncedUser] = useState('');
  const [debouncedStartDate, setDebouncedStartDate] = useState('');
  const [debouncedEndDate, setDebouncedEndDate] = useState('');

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const debounce = useCallback((setter: typeof setDebouncedRole, value: string) => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setter(value);
      setPage(1);
    }, 300);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceTimer.current);
  }, []);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setRoleFilter(val);
    debounce(setDebouncedRole, val);
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserFilter(val);
    debounce(setDebouncedUser, val);
  };

  const handleReset = () => {
    setRoleFilter('');
    setUserFilter('');
    setStartDate('');
    setEndDate('');
    setStartDateError('');
    setEndDateError('');
    setDebouncedRole('');
    setDebouncedUser('');
    setDebouncedStartDate('');
    setDebouncedEndDate('');
    setPage(1);
    clearTimeout(debounceTimer.current);
  };

  const { data, isLoading } = useGetAuditLogs(
    page,
    pageSize,
    debouncedRole || undefined,
    debouncedUser || undefined,
    debouncedStartDate || undefined,
    debouncedEndDate || undefined,
  );

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const columns: Column<AuditLogEntry>[] = [
    { key: '#', label: '#', render: (_item, idx) => String(idx + 1) },
    { key: 'action', label: 'Action' },
    {
      key: 'userEmail',
      label: 'Utilisateur',
      render: (item) => item.details?.userName ? item.details.userName as string : item.userEmail.split('@')[0],
    },
    {
      key: 'userRole',
      label: 'Rôle',
      render: (item) => (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            ROLE_BADGE_COLORS[item.userRole] ?? 'bg-gray-100 text-gray-700'
          }`}
        >
          {ROLE_LABELS[item.userRole] ?? item.userRole}
        </span>
      ),
    },
    { key: 'entityType', label: "Type d'entité" },
    {
      key: 'entityId',
      label: 'ID entité',
      render: (item) => String(item.entityId),
    },
    {
      key: 'createdAt',
      label: "Date d'action",
      render: (item) => format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm'),
    },
    {
      key: 'actions',
      label: '',
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEntry(item);
            setDetailsModalOpen(true);
          }}
          className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          <Eye size={14} className="lg:hidden" />
          <span className="hidden lg:inline">Détails</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111111]">Journal d'audit</h1>
      </div>

      <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#6b7280]">Rôle</label>
            <select
              value={roleFilter}
              onChange={handleRoleChange}
              className="h-10 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#6b7280]">Utilisateur</label>
            <input
              type="text"
              value={userFilter}
              onChange={handleUserChange}
              placeholder="Email ou nom"
              autoComplete="off"
              className="h-10 w-56 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 text-sm text-[#111111] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#111111]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#6b7280]">De (jj/mm/aaaa)</label>
            <input
              type="text"
              placeholder="jj/mm/aaaa"
              value={toDisplayDate(startDate)}
              onChange={(e) => {
                const raw = e.target.value;
                setStartDate(raw);
                setStartDateError('');
                clearTimeout(debounceTimer.current);
                if (raw && getDateError(raw)) {
                  setStartDateError(getDateError(raw));
                  return;
                }
                debounceTimer.current = setTimeout(() => {
                  setDebouncedStartDate(raw ? toStorageDate(raw, false) : '');
                  setPage(1);
                }, 400);
              }}
              autoComplete="off"
              className={`h-10 w-40 rounded-[8px] border bg-[#ffffff] px-3 text-sm text-[#111111] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#111111] ${startDateError ? 'border-red-500' : 'border-[#e5e7eb]'}`}
            />
            {startDateError && <p className="text-xs text-red-500">{startDateError}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#6b7280]">Au (jj/mm/aaaa)</label>
            <input
              type="text"
              placeholder="jj/mm/aaaa"
              value={toDisplayDate(endDate)}
              onChange={(e) => {
                const raw = e.target.value;
                setEndDate(raw);
                setEndDateError('');
                clearTimeout(debounceTimer.current);
                if (raw && getDateError(raw)) {
                  setEndDateError(getDateError(raw));
                  return;
                }
                debounceTimer.current = setTimeout(() => {
                  setDebouncedEndDate(raw ? toStorageDate(raw, true) : '');
                  setPage(1);
                }, 400);
              }}
              autoComplete="off"
              className={`h-10 w-40 rounded-[8px] border bg-[#ffffff] px-3 text-sm text-[#111111] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#111111] ${endDateError ? 'border-red-500' : 'border-[#e5e7eb]'}`}
            />
            {endDateError && <p className="text-xs text-red-500">{endDateError}</p>}
          </div>

          <button
            onClick={handleReset}
            className="h-10 cursor-pointer rounded-[8px] border border-[#e5e7eb] bg-[#f1f1f281] px-4 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        pagination={
          data?.pagination ?? {
            totalItems: 0,
            totalPages: 0,
            currentPage: 1,
            itemsPerPage: 10,
          }
        }
        isLoading={isLoading}
        isEmpty={(data?.data?.length ?? 0) === 0 && !isLoading}
        emptyMessage="Aucune entrée de journal trouvée"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <Modal
        isOpen={detailsModalOpen}
        onClose={() => { setDetailsModalOpen(false); setSelectedEntry(null); }}
        title="Détails de l'entrée"
        size="lg"
      >
        {selectedEntry && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                label="Utilisateur"
                value={
                  <span className="space-y-0.5">
                    <div><span className="text-[#8b92a1]">Email</span> {selectedEntry.userEmail}</div>
                    {!!selectedEntry.details?.userName && (
                      <div><span className="text-[#8b92a1]">Nom</span> {String(selectedEntry.details.userName)}</div>
                    )}
                    {selectedEntry.userIp && <div><span className="text-[#8b92a1]">IP</span> {selectedEntry.userIp}</div>}
                  </span>
                }
              />
              <InfoItem
                label="Rôle"
                value={
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      ROLE_BADGE_COLORS[selectedEntry.userRole] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {ROLE_LABELS[selectedEntry.userRole] ?? selectedEntry.userRole}
                  </span>
                }
              />
              <InfoItem label="Action" value={selectedEntry.action} />
              <InfoItem label="Type d'entité" value={selectedEntry.entityType} />
              <InfoItem label="ID entité" value={String(selectedEntry.entityId)} />
              <InfoItem
                label="Date d'action"
                value={format(new Date(selectedEntry.createdAt), 'dd/MM/yyyy HH:mm')}
              />
            </div>

            {selectedEntry.details && Object.keys(selectedEntry.details).length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-[#111111]">Détails</h4>
                <div className="rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(selectedEntry.details)
                        .filter(([key]) => key !== 'action')
                        .map(([key, val]) => (
                          <tr key={key} className="border-b border-[#e5e7eb] last:border-0">
                            <td className="w-1/2 py-2 pr-4 font-medium text-[#6b7280]">{key}</td>
                            <td className="w-1/2 py-2 text-[#111111]">
                              {isChangeValue(val) ? (
                                <span className="flex flex-col gap-1">
                                  <span className="text-[#ef4444] line-through text-xs">{String(val['Ancienne valeur'])}</span>
                                  <span className="text-[#10b981] text-xs">{String(val['Nouvelle valeur'])}</span>
                                </span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function isChangeValue(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && 'Ancienne valeur' in val && 'Nouvelle valeur' in val;
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#6b7280]">{label}</p>
      <div className="mt-0.5 text-xs md:text-sm text-[#111111]">{value}</div>
    </div>
  );
}
