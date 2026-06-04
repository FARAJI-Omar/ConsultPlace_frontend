import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConsultantForm from './ConsultantForm';
import { cn } from '../../../lib/utils';
import { useGetConsultants, useToggleConsultantStatus } from '../../../hooks/useConsultants';

interface ConsultantRow {
  id: number;
  name: string;
  email: string;
  profile: string;
  dailyRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ConsultantsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState<ConsultantRow | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{ id: number; isActive: boolean } | null>(null);

  const { data, isLoading } = useGetConsultants(page, pageSize);
  const toggleStatus = useToggleConsultantStatus();

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const handleEdit = (item: ConsultantRow) => {
    setEditingConsultant(item);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingConsultant(null);
  };

  const handleToggle = (id: number, current: boolean) => {
    setConfirmToggle({ id, isActive: !current });
  };

  const handleConfirmToggle = () => {
    if (!confirmToggle) return;
    toggleStatus.mutate(
      confirmToggle,
      {
        onSuccess: () => {
          toast.success(`Consultant ${confirmToggle.isActive ? 'activé' : 'désactivé'} avec succès`);
          setConfirmToggle(null);
        },
        onError: () => {
          toast.error('Erreur lors du changement de statut');
        },
      },
    );
  };

  const columns: Column<ConsultantRow>[] = [
    { key: 'name', label: 'Nom complet', render: (item) => (
      <span className="inline-block rounded-[6px] bg-[#EFF6FF] px-2.5 py-1 text-sm font-medium text-[#111111]">{item.name}</span>
    ) },
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
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(item)}
            className="cursor-pointer rounded-[6px] bg-[#03b5537c] text-green-800 px-2.5 py-1 text-xs font-medium  transition-colors hover:bg-green-700"
          >
            Modifier
          </button>
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
        </div>
      ),
    },
  ];

  return (
    <div className={cn("space-y-6", toggleStatus.isPending && "pointer-events-none opacity-50")}>
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
        onClose={handleCloseModal}
        title={editingConsultant ? 'Modifier le consultant' : 'Créer un consultant'}
        size="lg"
      >
        <ConsultantForm
          key={editingConsultant?.id ?? 'create'}
          consultant={editingConsultant ?? undefined}
          onSuccess={handleCloseModal}
        />
      </Modal>

      {confirmToggle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmToggle(null); }}
        >
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">
              {confirmToggle.isActive ? 'Activer' : 'Désactiver'} le consultant
            </h2>
            <p className="mb-6 text-sm text-[#6b7280]">
              Êtes-vous sûr de vouloir {confirmToggle.isActive ? 'activer' : 'désactiver'} ce consultant&nbsp;?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmToggle(null)}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmToggle}
                disabled={toggleStatus.isPending}
                className={`cursor-pointer rounded-[8px] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50 ${
                  confirmToggle.isActive ? 'bg-green-600' : 'bg-red-600'
                }`}
              >
                {toggleStatus.isPending ? 'Confirmation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
