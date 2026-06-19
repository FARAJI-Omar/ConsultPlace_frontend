import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { DataTable, type Column } from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import GestionnaireForm from './GestionnaireForm';
import { cn } from '../../../lib/utils';
import { useGetGestionnaires, useDeleteGestionnaire } from '../../../hooks/useGestionnaires';

interface GestionnaireRow {
  id: number;
  email: string;
  role: string;
}

export default function GestionnairesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<GestionnaireRow | null>(null);

  const { data, isLoading } = useGetGestionnaires(page, pageSize);
  const deleteGestionnaire = useDeleteGestionnaire();

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    deleteGestionnaire.mutate(confirmDelete.id, {
      onSuccess: () => {
        toast.success('Gestionnaire supprimé avec succès');
        setConfirmDelete(null);
      },
      onError: () => {
        toast.error("Une erreur est survenue lors de la suppression");
      },
    });
  };

  const columns: Column<GestionnaireRow>[] = [
    { key: '#', label: '#', render: (_item, idx) => String(idx + 1) },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Rôle' },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setConfirmDelete(item)}
            disabled={deleteGestionnaire.isPending}
            className="inline-flex cursor-pointer items-center gap-1 rounded-[6px] bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50"
          >
            <Trash2 size={14} className="lg:hidden" />
            <span className="hidden lg:inline">Supprimer</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={cn("space-y-6", deleteGestionnaire.isPending && "pointer-events-none opacity-50")}>
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

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">
              Supprimer le gestionnaire
            </h2>
            <p className="mb-6 text-sm text-[#6b7280]">
              Êtes-vous sûr de vouloir supprimer ce gestionnaire&nbsp;?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteGestionnaire.isPending}
                className="cursor-pointer rounded-[8px] bg-red-600 px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deleteGestionnaire.isPending ? 'Confirmation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
