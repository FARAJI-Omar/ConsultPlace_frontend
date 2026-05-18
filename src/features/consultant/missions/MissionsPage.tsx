import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/common/DataTable';
import type { Column } from '../../../components/common/DataTable';
import { useConsultantMissions } from '../../../hooks/consultant/useConsultantMissions';
import type { ConsultantMission } from '../../../types/consultant';

const STATUS_OPTIONS = [
  { label: 'Toutes', value: '' },
  { label: 'Actives', value: 'ACTIVE' },
  { label: 'Cloturée', value: 'CLOSED' },
];

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-[#d1fae5] text-[#065f46]',
  CLOSED: 'bg-[#f5f5f5] text-[#6b7280]',
};

export default function MissionsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useConsultantMissions({
    page,
    limit,
    status: status ? (status as 'ACTIVE' | 'CLOSED') : undefined,
  });

  const missions = data?.data ?? [];
  const pagination = data?.pagination ?? {
    totalItems: 0,
    totalPages: 1,
    currentPage: page,
    itemsPerPage: limit,
  };

  const columns: Column<ConsultantMission>[] = [
    { key: 'title', label: 'Titre' },
    {
      key: 'status',
      label: 'Statut',
      render: (mission) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[mission.status] ?? 'bg-[#f5f5f5] text-[#6b7280]'}`}
        >
          {mission.status === 'ACTIVE' ? 'Active' : 'Cloturée'}
        </span>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (mission) => mission.contract?.client?.raison_sociale ?? '-',
    },
    {
      key: 'startDate',
      label: 'Date début',
      render: (mission) =>
        new Date(mission.startDate).toLocaleDateString('fr-FR'),
    },
    {
      key: 'endDate',
      label: 'Date fin',
      render: (mission) =>
        mission.endDate
          ? new Date(mission.endDate).toLocaleDateString('fr-FR')
          : '-',
    },
    {
      key: 'actions',
      label: '',
      render: (mission) => (
        <button
          onClick={() => navigate(`/consultant/missions/${mission.id}`)}
          className="cursor-pointer text-[#3b82f6] hover:text-[#111111] transition-colors text-sm font-medium"
        >
          Voir détails
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-[22px] font-semibold text-[#111111] leading-[1.3] tracking-[-0.3px]">
        Mes missions
      </h1>

      <div className="flex items-center gap-2 bg-[#f8f9fa] rounded-full p-1.5 w-fit">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setStatus(opt.value);
              setPage(1);
            }}
            className={`cursor-pointer px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
              status === opt.value
                ? 'bg-[#ffffff] text-[#111111]'
                : 'text-[#6b7280] hover:text-[#111111]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <DataTable<ConsultantMission>
        columns={columns}
        data={missions}
        pagination={pagination}
        isLoading={isLoading}
        isEmpty={missions.length === 0 && !isLoading}
        emptyMessage="Aucune mission trouvée"
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setLimit(size);
          setPage(1);
        }}
      />
    </div>
  );
}
