import { useState, useCallback } from 'react';
import { DataTable, type Column } from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import GestionnaireForm from './GestionnaireForm';
import { useGetGestionnaires } from '../../../hooks/useGestionnaires';

interface GestionnaireRow {
  id: number;
  email: string;
  role: string;
}

export default function GestionnairesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useGetGestionnaires(page, pageSize);

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const columns: Column<GestionnaireRow>[] = [
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Rôle' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111111]">Gestionnaires</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="cursor-pointer rounded-[8px] bg-primary-blue px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90"
        >
          Créer un gestionnaire
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
        emptyMessage="Aucun gestionnaire trouvé"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Créer un gestionnaire"
        size="lg"
      >
        <GestionnaireForm onSuccess={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
