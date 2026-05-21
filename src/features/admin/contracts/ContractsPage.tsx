import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { DataTable, type Column } from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ContractForm from './ContractForm';
import { useGetContracts } from '../../../hooks/useContracts';
import { formatDate } from '../../../lib/utils';

interface ContractRow {
  id: number;
  ref: string;
  client?: { id: number; raison_sociale: string };
  startDate: string;
  endDate: string;
  profile: string;
  dailyRate: number;
}

export default function ContractsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useGetContracts(page, pageSize);

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const columns: Column<ContractRow>[] = [
    { key: 'ref', label: 'Référence' },
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
        <button
          onClick={() => navigate(`/admin/contracts/${item.id}`)}
          className="cursor-pointer rounded p-1.5 text-[#6b7280] transition-colors hover:bg-light-blue hover:text-primary-blue"
          aria-label="Voir les détails"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
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
