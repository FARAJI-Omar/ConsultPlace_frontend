import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { toast } from 'sonner';
import { DataTable, type Column } from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ContractForm from './ContractForm';
import { useGetContracts, useGetContractById, useToggleContractArchive, type Contract } from '../../../hooks/useContracts';
import { cn, formatDate } from '../../../lib/utils';

interface ContractRow extends Contract {}

export default function ContractsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractRow | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<ContractRow | null>(null);

  const { data, isLoading } = useGetContracts(page, pageSize);
  const { data: fullContract } = useGetContractById(editingContract?.id);
  const toggleArchive = useToggleContractArchive();

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const handleEdit = (item: ContractRow) => {
    setEditingContract(item);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingContract(null);
  };

  const handleConfirmArchive = () => {
    if (!confirmArchive) return;
    const newState = !confirmArchive.isArchived;
    toggleArchive.mutate(
      { id: confirmArchive.id, isArchived: newState },
      {
        onSuccess: () => {
          toast.success(newState ? 'Contrat archivé avec succès' : 'Contrat restauré avec succès');
          setConfirmArchive(null);
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
            onClick={() => handleEdit(item)}
            className="cursor-pointer rounded-[6px] bg-[#03b5537c] text-green-800 px-2.5 py-1 text-xs font-medium  transition-colors hover:bg-green-700"
          >
            Modifier
          </button>
          <button
            onClick={() => navigate(`/admin/contracts/${item.id}`)}
            className="cursor-pointer rounded-[6px] bg-[#EFF6FF] px-2.5 py-1 text-xs font-medium text-primary-blue transition-colors hover:bg-blue-100"
          >
            Détails
          </button>
          <button
            onClick={() => setConfirmArchive(item)}
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

      <div className="flex justify-center">
        <Link
          to="/admin/contracts/archived"
          className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-2 text-sm font-medium text-[#6b7280] transition-colors hover:bg-[#f3f4f6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v6m-3-3l3 3 3-3" />
          </svg>
          Voir archivés
        </Link>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingContract ? 'Modifier le contrat' : 'Créer un contrat'}
        size="lg"
      >
        <ContractForm
          key={editingContract?.id ?? 'create'}
          contract={editingContract ? (fullContract ?? editingContract) : undefined}
          onSuccess={handleCloseModal}
        />
      </Modal>

      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">
              {confirmArchive.isArchived ? 'Restaurer' : 'Archiver'} le contrat
            </h2>
            <p className="mb-6 text-sm text-[#6b7280]">
              Êtes-vous sûr de vouloir {confirmArchive.isArchived ? 'restaurer' : 'archiver'} ce contrat&nbsp;?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmArchive(null)}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmArchive}
                disabled={toggleArchive.isPending}
                className={`cursor-pointer rounded-[8px] px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50 ${
                  confirmArchive.isArchived ? 'bg-green-600' : 'bg-red-600'
                }`}
              >
                {toggleArchive.isPending ? 'Confirmation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
