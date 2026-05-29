import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { toast } from 'sonner';
import { DataTable, type Column } from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ContractForm from './ContractForm';
import { useGetContracts, useToggleContractArchive } from '../../../hooks/useContracts';
import { cn, formatDate } from '../../../lib/utils';

interface ContractRow {
  id: number;
  ref: string;
  client?: { id: number; raison_sociale: string };
  startDate: string;
  endDate: string;
  profile: string;
  dailyRate: number;
  isArchived: boolean;
}

export default function ContractsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useGetContracts(page, pageSize);
  const toggleArchive = useToggleContractArchive();

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const handleToggleArchive = (item: ContractRow) => {
    const newState = !item.isArchived;
    toggleArchive.mutate(
      { id: item.id, isArchived: newState },
      {
        onSuccess: () => {
          toast.success(newState ? 'Contrat archivé avec succès' : 'Contrat restauré avec succès');
        },
        onError: () => {
          toast.error("Une erreur est survenue");
        },
      },
    );
  };

  const columns: Column<ContractRow>[] = [
    { key: 'ref', label: 'Référence', render: (item) => (
      <div className="flex items-center gap-2">
        <span>{item.ref}</span>
        {item.isArchived && <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Archivé</span>}
      </div>
    ) },
    {
      key: 'client',
      label: 'Client',
      render: (item) => (
        <span className="inline-block rounded-[6px] bg-[#EFF6FF] px-2.5 py-1 text-sm font-medium text-[#111111]">{item.client?.raison_sociale ?? '—'}</span>
      ),
    },
    { key: 'startDate', label: 'Date de Début', render: (item) => formatDate(item.startDate) },
    { key: 'endDate', label: 'Date de Fin', render: (item) => formatDate(item.endDate) },
    { key: 'profile', label: 'Profil' },
    {
      key: 'dailyRate',
      label: 'Taux (DH)',
      render: (item) => `${item.dailyRate} DH`,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => navigate(`/admin/contracts/${item.id}`)}
            className="cursor-pointer rounded-[6px] bg-[#EFF6FF] px-2.5 py-1 text-xs font-medium text-primary-blue transition-colors hover:bg-blue-100"
          >
            Détails
          </button>
          <button
            onClick={() => handleToggleArchive(item)}
            disabled={toggleArchive.isPending}
            className="cursor-pointer rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: item.isArchived ? '#d1fae5' : '#fef3c7', color: item.isArchived ? '#065f46' : '#92400e' }}
          >
            {item.isArchived ? 'Restaurer' : 'Archiver'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={cn("space-y-6", toggleArchive.isPending && "pointer-events-none opacity-50")}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111111]">Contrats</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="cursor-pointer rounded-[8px] bg-primary-blue px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90"
        >
          Créer un contrat
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
        emptyMessage="Aucun contrat trouvé"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Créer un contrat"
        size="lg"
      >
        <ContractForm onSuccess={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
