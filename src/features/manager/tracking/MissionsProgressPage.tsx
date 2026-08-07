import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMissionsProgress } from '../../../hooks/manager/useMissionsProgress';
import { Skeleton, SkeletonTable } from '../../../components/ui/skeleton';
import { DataTable } from '../../../components/common/DataTable';
import type { Column } from '../../../components/common/DataTable';
import type { MissionsProgressRow } from '../../../types/manager';

const monthLabel = (month: string): string => {
  const [y, m] = month.split('-');
  return `${m}/${y}`;
};

const dateFr = (value: string | null | undefined): string => {
  if (!value) return '';
  return value.slice(0, 10).split('-').reverse().join('/');
};

const statusChip = (label: string, className: string) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>
);

const pendingLabel = () => (
  <span className="inline-block rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs font-medium text-[#6b7280]">En attente</span>
);

const highlightDate = (value: string | null | undefined) => statusChip(dateFr(value), 'bg-green-100 text-green-900 text-[13px] font-bold');

export default function MissionsProgressPage() {
  const { data } = useMissionsProgress();
  const rows = data?.data ?? [];

  const [clientFilter, setClientFilter] = useState('');
  const [missionFilter, setMissionFilter] = useState('');
  const [consultantFilter, setConsultantFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const clients = useMemo(() => Array.from(new Set(rows.map((r) => r.client))).sort(), [rows]);

  const missions = useMemo(() => {
    const filtered = clientFilter ? rows.filter((r) => r.client === clientFilter) : rows;
    return Array.from(new Set(filtered.map((r) => r.mission))).sort();
  }, [rows, clientFilter]);

  const consultants = useMemo(() => {
    let filtered = rows;
    if (clientFilter) filtered = filtered.filter((r) => r.client === clientFilter);
    if (missionFilter) filtered = filtered.filter((r) => r.mission === missionFilter);
    return Array.from(new Set(filtered.map((r) => r.consultantName))).sort();
  }, [rows, clientFilter, missionFilter]);

  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => !clientFilter || r.client === clientFilter)
      .filter((r) => !missionFilter || r.mission === missionFilter)
      .filter((r) => !consultantFilter || r.consultantName === consultantFilter)
      .filter((r) => !monthFilter || r.month.slice(0, 7) === monthFilter);
  }, [rows, clientFilter, missionFilter, consultantFilter, monthFilter]);

  const [sortKey, setSortKey] = useState<string>('month');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const SORT_ACCESSORS: Record<string, (r: MissionsProgressRow) => string | number | null> = {
    client: (r) => r.client,
    mission: (r) => r.mission,
    consultant: (r) => r.consultantName,
    month: (r) => r.month,
    relevDate: (r) => r.relevDate,
    invoiceDate: (r) => r.invoiceDate,
    invoiceRef: (r) => r.invoiceRef,
    invoicePaidDate: (r) => r.invoicePaidDate,
    consultantPaidDate: (r) => r.consultantPaidDate,
  };

  const sortRows = (a: MissionsProgressRow, b: MissionsProgressRow): number => {
    const x = SORT_ACCESSORS[sortKey]?.(a) ?? null;
    const y = SORT_ACCESSORS[sortKey]?.(b) ?? null;
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    if (typeof x === 'string' && typeof y === 'string') return x.localeCompare(y, undefined, { numeric: true });
    return Number(x) - Number(y);
  };

  const sortedRows = useMemo(() => {
    const result = [...filteredRows];
    result.sort((a, b) => (sortDir === 'asc' ? sortRows(a, b) : sortRows(b, a)));
    return result;
  }, [filteredRows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginatedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  const changeFilter = (setter: (v: string) => void, v: string) => {
    setter(v);
    setPage(1);
  };

  const handleSortChange = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDir(direction);
    setPage(1);
  };

  const columns: Column<MissionsProgressRow>[] = [
    { key: 'client', label: 'Client', sortValue: (r) => r.client, render: (r) => <span className="inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold bg-[#eff6ff] text-[#3b82f6]">{r.client}</span> },
    { key: 'mission', label: 'Mission', sortValue: (r) => r.mission, render: (r) => r.mission },
    {
      key: 'consultant',
      label: 'Consultant',
      sortValue: (r) => r.consultantName,
      render: (r) => (
        <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#f5f3ff] text-[#7c3aed]">{r.consultantName}</span>
      ),
    },
    { key: 'month', label: 'Mois', sortValue: (r) => r.month, render: (r) => <span className="text-[#6b7280]">{monthLabel(r.month)}</span> },
    {
      key: 'relevDate',
      label: 'Relevé reçu',
      sortValue: (r) => r.relevDate,
      render: (r) =>
        r.relevDate ? (
          <span className="flex items-center gap-2">
            {highlightDate(r.relevDate)}
            {r.relevRejected && statusChip('Rejeté', 'bg-red-50 text-red-600')}
          </span>
        ) : (
          pendingLabel()
        ),
    },
    { key: 'invoiceDate', label: 'Facture envoyée', sortValue: (r) => r.invoiceDate, render: (r) => (r.invoiceDate ? highlightDate(r.invoiceDate) : pendingLabel()) },
    {
      key: 'invoiceRef',
      label: 'Référence',
      sortValue: (r) => r.invoiceRef,
      render: (r) =>
        r.invoiceRef && r.invoiceId ? (
          <span className="flex justify-center">
            <Link to={`/manager/invoices/${r.invoiceId}`} className="text-[#3b82f6] hover:underline">{r.invoiceRef}</Link>
          </span>
        ) : (
          <span className="flex justify-center text-[#9ca3af]">—</span>
        ),
    },
    {
      key: 'invoicePaidDate',
      label: 'Facture payée',
      sortValue: (r) => r.invoicePaidDate,
      render: (r) =>
        <span className="flex justify-center">
          {r.invoicePaidDate ? highlightDate(r.invoicePaidDate)
            : r.invoicePaidPct != null
              ? statusBadge(`Partiellement payé ${r.invoicePaidPct}%`)
              : <span className="text-[#9ca3af]">—</span>}
        </span>,
    },
    {
      key: 'consultantPaidDate',
      label: 'Consultant payé',
      sortValue: (r) => r.consultantPaidDate,
      render: (r) =>
        <span className="flex justify-center">
          {r.consultantPaidDate ? highlightDate(r.consultantPaidDate)
            : r.consultantPaidPct != null
              ? statusBadge(`Partiellement payé ${r.consultantPaidPct}%`)
              : <span className="text-[#9ca3af]">—</span>}
        </span>,
    },
  ];

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="rounded-[12px] bg-[#ffffff] border border-[#e5e7eb] p-6">
          <Skeleton className="mb-4 h-6 w-48" />
          <SkeletonTable rows={5} cols={9} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#111111]">Suivi d'avancement</h1>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b7280]">Client</label>
          <select
            value={clientFilter}
            onChange={(e) => changeFilter(setClientFilter, e.target.value)}
            className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] min-w-[180px]"
          >
            <option value="">Tous les clients</option>
            {clients.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b7280]">Mission</label>
          <select
            value={missionFilter}
            onChange={(e) => changeFilter(setMissionFilter, e.target.value)}
            className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="">Toutes</option>
            {missions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b7280]">Consultant</label>
          <select
            value={consultantFilter}
            onChange={(e) => changeFilter(setConsultantFilter, e.target.value)}
            className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="">Tous</option>
            {consultants.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6b7280]">Mois</label>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => changeFilter(setMonthFilter, e.target.value)}
            className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          />
        </div>
      </div>

      <div className="[&_table]:text-xs [&_th]:!text-xs [&_td]:!text-sm [&_th:last-child]:static! [&_td:last-child]:static! [&_th:last-child]:shadow-none! [&_td:last-child]:shadow-none!">
        <DataTable
          columns={columns}
          data={paginatedRows}
          pagination={{ totalItems: sortedRows.length, totalPages, currentPage: page, itemsPerPage: pageSize }}
          isLoading={false}
          isEmpty={sortedRows.length === 0}
          emptyMessage="Aucune donnée pour ces critères"
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          sort={{ key: sortKey, direction: sortDir }}
          onSortChange={handleSortChange}
        />
      </div>
    </div>
  );
}

const statusBadge = (label: string) => statusChip(label, 'bg-amber-50 text-amber-700');
