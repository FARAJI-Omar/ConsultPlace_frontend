import { useState, useCallback, useEffect, useRef } from 'react';
import { DataTable, type Column } from '../../../components/common/DataTable';
import DatePicker from '../../../components/common/DatePicker';
import { useGetAuditLogs, type AuditLogEntry } from '../../../hooks/useAuditLog';
import { formatDate } from '../../../lib/utils';

function renderDetails(details: Record<string, unknown> | null): string {
  if (!details || Object.keys(details).length === 0) return '—';
  return Object.entries(details)
    .map(([key, val]) => `${key}: ${String(val)}`)
    .join(' · ');
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

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedStartDate(val);
      setPage(1);
    }, 300);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedEndDate(val);
      setPage(1);
    }, 300);
  };

  const handleReset = () => {
    setRoleFilter('');
    setUserFilter('');
    setStartDate('');
    setEndDate('');
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
    { key: 'action', label: 'Action' },
    {
      key: 'userEmail',
      label: 'Email',
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
      label: 'Date',
      render: (item) => formatDate(item.createdAt),
    },
    {
      key: 'details',
      label: 'Détails',
      render: (item) => (
        <span className="max-w-[220px] truncate block text-xs text-[#6b7280]" title={renderDetails(item.details)}>
          {renderDetails(item.details)}
        </span>
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
            <label className="text-xs font-medium text-[#6b7280]">Email</label>
            <input
              type="text"
              value={userFilter}
              onChange={handleUserChange}
              placeholder="Rechercher par email..."
              className="h-10 w-56 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 text-sm text-[#111111] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#111111]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#6b7280]">Du</label>
            <DatePicker value={startDate} onChange={handleStartDateChange} placeholder="Date début" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#6b7280]">Au</label>
            <DatePicker value={endDate} onChange={handleEndDateChange} placeholder="Date fin" />
          </div>

          <button
            onClick={handleReset}
            className="h-10 cursor-pointer rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
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
    </div>
  );
}
