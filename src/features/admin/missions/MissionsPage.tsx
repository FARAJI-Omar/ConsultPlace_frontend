import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataTable, type Column } from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import MissionForm from './MissionForm';
import { useGetMissions, useCloseMission, type Mission } from '../../../hooks/useMissions';
import { formatDate } from '../../../lib/utils';

export default function MissionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState<Mission | null>(null);

  const { data, isLoading } = useGetMissions(page, pageSize);
  const closeMutation = useCloseMission();

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

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
      key: 'consultant',
      label: 'Consultant',
      render: (item) => item.consultant?.name ?? '—',
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
        <div className="flex items-center gap-1">
          <Link
            to={`/admin/missions/${item.id}`}
            className="inline-flex cursor-pointer rounded p-1.5 text-[#6b7280] transition-colors hover:bg-light-blue hover:text-primary-blue"
          >
            <Eye className="h-4 w-4" />
          </Link>
          {item.status === 'ACTIVE' && (
            <button
              onClick={() => setConfirmClose(item)}
              className="cursor-pointer rounded-[8px] border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Clôturer
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
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
        onClose={() => setModalOpen(false)}
        title="Créer une mission"
        size="md"
      >
        <MissionForm onSuccess={() => setModalOpen(false)} />
      </Modal>

      {confirmClose && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmClose(null); }}
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
