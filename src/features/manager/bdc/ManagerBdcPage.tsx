import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { DataTable, type Column } from '../../../components/common/DataTable';
import { useGetBdcs } from '../../../hooks/useBdc';
import { formatDate } from '../../../lib/utils';
import type { BonDeCommande, Client } from '../../../types/models';

interface BdcRow extends BonDeCommande {
  contract?: { id: number; ref: string; client?: Partial<Client> };
}

export default function ManagerBdcPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: listData, isLoading } = useGetBdcs(page, pageSize);

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const columns: Column<BdcRow>[] = [
    { key: '#', label: '#', render: (_item, idx) => String(idx + 1) },
    { key: 'bdc', label: 'Référence BDC' },
    {
      key: 'contract',
      label: 'Contrat',
      render: (item) => (
        <span className="inline-block rounded-[6px] bg-[#EFF6FF] px-2.5 py-1 text-sm font-medium text-[#111111]">
          {item.contract?.ref ?? '—'}
        </span>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (item) => item.contract?.client?.raison_sociale ?? '—',
    },
    { key: 'mission', label: 'Mission', render: (item) => item.mission?.title ?? '—' },
    { key: 'totalDays', label: 'Jours Total', render: (item) => String(item.totalDays) },
    { key: 'daysLeft', label: 'Jours Restants', render: (item) => String(item.daysLeft) },
    {
      key: 'remainingPct',
      label: 'Restant %',
      render: (item) => {
        const pct = item.totalDays > 0 ? Math.round((item.daysLeft / item.totalDays) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 rounded-full bg-[#e5e7eb]">
              <div
                className={`h-2 rounded-full ${pct > 50 ? 'bg-[#10b981]' : pct > 20 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-[#6b7280]">{pct}%</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Statut',
      render: (item) => (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {item.isActive ? 'Actif' : 'Inactif'}
        </span>
      ),
    },
    { key: 'startDate', label: 'Date Début', render: (item) => formatDate(item.startDate) },
    { key: 'endDate', label: 'Date Fin', render: (item) => (item.endDate ? formatDate(item.endDate) : '—') },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => navigate(`/manager/bons-de-commande/${item.id}`)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-[6px] bg-[#EFF6FF] px-2.5 py-1 text-xs font-medium text-primary-blue transition-colors hover:bg-blue-100"
          >
            <Eye size={14} className="md:hidden" />
            <span className="hidden md:inline">Détails</span>
          </button>
        </div>
      ),
    },
  ];

  const data = (listData?.data ?? []) as BdcRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111111]">Bons de commande</h1>
      </div>

      <DataTable
        columns={columns}
        data={data}
        pagination={
          listData?.pagination ?? {
            totalItems: 0,
            totalPages: 0,
            currentPage: 1,
            itemsPerPage: 10,
          }
        }
        isLoading={isLoading}
        isEmpty={(data?.length ?? 0) === 0 && !isLoading}
        emptyMessage="Aucun bon de commande trouvé"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
