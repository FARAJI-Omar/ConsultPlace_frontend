import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Pencil, Eye, FileLock } from 'lucide-react';
import { DataTable, type Column } from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import MissionForm from './MissionForm';
import { useGetMissions, useGetMissionById, useCloseMission, type Mission } from '../../../hooks/useMissions';
import { cn, formatDate } from '../../../lib/utils';

export default function MissionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [confirmClose, setConfirmClose] = useState<Mission | null>(null);

  const { data, isLoading } = useGetMissions(page, pageSize);
  const { data: fullMission } = useGetMissionById(editingMission?.id);
  const closeMutation = useCloseMission();

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const handleEdit = (item: Mission) => {
    setEditingMission(item);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingMission(null);
  };

  const handleCloseMission = () => {
    if (!confirmClose) return;
    closeMutation.mutate(confirmClose.id, {
      onSuccess: () => {
        toast.success('Mission clôturée avec succès');
        setConfirmClose(null);
      },
      onError: () => {
        toast.error("Erreur lors de la clôture de la mission");
      },
    });
  };

  const columns: Column<Mission>[] = [
    { key: '#', label: '#', render: (_item, idx) => String(idx + 1) },
    {
      key: 'title',
      label: 'Titre',
      render: (item) => (
        <Link
          to={`/admin/missions/${item.id}`}
          className="font-medium text-primary-blue transition-colors hover:text-primary-blue/80"
        >
          {item.title}
        </Link>
      ),
    },
    {
      key: 'contract',
      label: 'Contrat',
      render: (item) => item.contract?.ref ?? '—',
    },
    {
      key: 'consultants',
      label: 'Consultant(s)',
      render: (item) => {
        const list = item.consultants ?? [];
        if (list.length === 0) {
          return <span className="inline-block rounded-[6px] bg-[#EFF6FF] px-2.5 py-1 text-sm font-medium text-[#111111]">{item.consultant?.name ?? '—'}</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {list.map((mc) => (
              <span key={mc.consultantId} className="inline-block rounded-[6px] bg-[#EFF6FF] px-2.5 py-1 text-sm font-medium text-[#111111]">
                {mc.consultant.name} <span className="text-[#6b7280]">({mc.dailyRate.toLocaleString()} DH)</span>
              </span>
            ))}
          </div>
        );
      },
    },
    { key: 'startDate', label: 'Début', render: (item) => formatDate(item.startDate) },
    {
      key: 'endDate',
      label: 'Fin',
      render: (item) => formatDate(item.endDate),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (item) => (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            item.status === 'ACTIVE'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {item.status === 'ACTIVE' ? 'Active' : 'Clôturée'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center justify-left gap-2">
          <button
            onClick={() => handleEdit(item)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-[6px]  px-2.5 py-1 text-xs font-medium bg-[#03b5537c] text-green-800 transition-colors hover:bg-green-700"
          >
            <Pencil size={14} className="lg:hidden" />
            <span className="hidden lg:inline">Modifier</span>
          </button>
          <Link
            to={`/admin/missions/${item.id}`}
            className="inline-flex cursor-pointer items-center gap-1 rounded-[6px] bg-[#EFF6FF] px-2.5 py-1 text-xs font-medium text-primary-blue transition-colors hover:bg-blue-100"
          >
            <Eye size={14} className="lg:hidden" />
            <span className="hidden lg:inline">Détails</span>
          </Link>
          {item.status === 'ACTIVE' && (
            <button
              onClick={() => setConfirmClose(item)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-[6px] bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              <FileLock size={14} className="lg:hidden" />
              <span className="hidden lg:inline">Clôturer</span>
            </button>
          )}               
        </div>
      ),
    },
  ];

  return (
    <div className={cn("space-y-6", closeMutation.isPending && "pointer-events-none opacity-50")}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111111]">Missions</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="cursor-pointer rounded-[8px] bg-primary-blue px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90"
        >
          Créer une mission
        </button>
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
        emptyMessage="Aucune mission trouvée"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingMission ? 'Modifier la mission' : 'Créer une mission'}
        size="lg"
      >
        <MissionForm
          key={editingMission?.id ?? 'create'}
          mission={editingMission ? (fullMission ?? editingMission) : undefined}
          onSuccess={handleCloseModal}
        />
      </Modal>

      {confirmClose && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">
              Clôturer la mission
            </h2>
            <p className="mb-6 text-sm text-[#6b7280]">
              Êtes-vous sûr de vouloir clôturer la mission « {confirmClose.title} » ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmClose(null)}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Annuler
              </button>
              <button
                onClick={handleCloseMission}
                disabled={closeMutation.isPending}
                className="cursor-pointer rounded-[8px] bg-red-600 px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {closeMutation.isPending ? 'Clôture...' : 'Clôturer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
