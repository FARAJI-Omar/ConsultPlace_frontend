import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConsultantForm from './ConsultantForm';
import { useGetConsultants, useToggleConsultantStatus } from '../../../hooks/useConsultants';

interface ConsultantRow {
  id: number;
  name: string;
  email: string;
  profile: string;
  dailyRate: number;
  isActive: boolean;
}

export default function ConsultantsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useGetConsultants(page, pageSize);
  const toggleStatus = useToggleConsultantStatus();

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const handleToggle = (id: number, current: boolean) => {
    toggleStatus.mutate(
      { id, isActive: !current },
      {
        onSuccess: () => {
          toast.success(`Consultant ${!current ? 'activé' : 'désactivé'} avec succès`);
        },
        onError: () => {
          toast.error('Erreur lors du changement de statut');
        },
      },
    );
  };

  const columns: Column<ConsultantRow>[] = [
    { key: 'name', label: 'Nom' },
    { key: 'email', label: 'Email' },
    { key: 'profile', label: 'Profil' },
    {
      key: 'dailyRate',
      label: 'Taux journalier',
      render: (item) => `${item.dailyRate.toLocaleString()} DH`,
    },
    {
      key: 'isActive',
      label: 'Statut',
      render: (item) => (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            item.isActive
              ? 'bg-success-light text-success'
              : 'bg-danger-light text-danger'
          }`}
        >
          {item.isActive ? 'Actif' : 'Inactif'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <button
          onClick={() => handleToggle(item.id, item.isActive)}
          disabled={toggleStatus.isPending}
          className={`cursor-pointer rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors ${
            item.isActive
              ? 'border border-red-600 hover:bg-red-600/40'
              : 'border border-green-600 text-success hover:bg-green-600/40'
          } disabled:opacity-50`}
        >
          {item.isActive ? 'Désactiver' : 'Activer'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111111]">Consultants</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="cursor-pointer rounded-[8px] bg-primary-blue px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90"
        >
          Créer un consultant
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
        emptyMessage="Aucun consultant trouvé"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Créer un consultant"
        size="md"
      >
        <ConsultantForm onSuccess={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
