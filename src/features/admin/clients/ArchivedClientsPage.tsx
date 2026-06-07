import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { toast } from 'sonner';
import { DataTable, type Column } from '../../../components/common/DataTable';
import { cn } from '../../../lib/utils';
import { useGetClients, useToggleClientArchive } from '../../../hooks/useClients';

interface ClientRow {
  id: number;
  raison_sociale: string;
  rc?: string;
  identifiant_commun: string;
  identifiant_fiscal: string | null;
  contact: string;
  email: string;
  address: string;
  phone_n: string | null;
  total_contracts: number;
  isArchived: boolean;
}

export default function ArchivedClientsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmRestore, setConfirmRestore] = useState<ClientRow | null>(null);

  const { data, isLoading } = useGetClients(page, pageSize, true);
  const toggleArchive = useToggleClientArchive();

  const archived = data?.data?.filter((item) => item.isArchived) ?? [];

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const handleConfirmRestore = () => {
    if (!confirmRestore) return;
    toggleArchive.mutate(
      { id: confirmRestore.id, isArchived: false },
      {
        onSuccess: () => {
          toast.success('Client restauré avec succès');
          setConfirmRestore(null);
        },
        onError: () => {
          toast.error('Une erreur est survenue');
        },
      },
    );
  };

  const columns: Column<ClientRow>[] = [
    { key: 'raison_sociale', label: 'Raison sociale', render: (item) => (
      <div className="flex items-center gap-2">
        <span className="inline-block rounded-[6px] bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-500">{item.raison_sociale}</span>
        <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Archivé</span>
      </div>
    ) },
    { key: 'rc', label: 'Registre de Commerce', render: (item) => item.rc ?? '—' },
    { key: 'identifiant_commun', label: 'ICE', render: (item) => item.identifiant_commun || '—' },
    { key: 'identifiant_fiscal', label: 'IF', render: (item) => item.identifiant_fiscal ?? '—' },
    { key: 'contact', label: 'Contact' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Adresse' },
    { key: 'phone_n', label: 'Téléphone', render: (item) => item.phone_n ?? '—' },
    { key: 'total_contracts', label: 'Contrats', render: (item) => String(item.total_contracts) },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => navigate(`/admin/clients/${item.id}`)}
            className="cursor-pointer rounded-[6px] bg-[#EFF6FF] px-2.5 py-1 text-xs font-medium text-primary-blue transition-colors hover:bg-blue-100"
          >
            Détails
          </button>
          <button
            onClick={() => setConfirmRestore(item)}
            disabled={toggleArchive.isPending}
            className="cursor-pointer rounded-[6px] bg-[#d1fae5] px-2.5 py-1 text-xs font-medium text-[#065f46] transition-colors hover:bg-green-200 disabled:opacity-50"
          >
            Restaurer
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={cn("space-y-6", toggleArchive.isPending && "pointer-events-none opacity-50")}>
      <div className="flex items-center gap-4">
        <Link
          to="/admin/clients"
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-1.5 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>
        <h1 className="text-2xl font-semibold text-[#111111]">Clients archivés</h1>
      </div>

      <DataTable
        columns={columns}
        data={archived}
        pagination={
          data?.pagination ?? {
            totalItems: 0,
            totalPages: 0,
            currentPage: 1,
            itemsPerPage: 10,
          }
        }
        isLoading={isLoading}
        isEmpty={archived.length === 0 && !isLoading}
        emptyMessage="Aucun client archivé"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[12px] bg-[#ffffff] p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-[#111111]">Restaurer le client</h2>
            <p className="mb-6 text-sm text-[#6b7280]">
              Êtes-vous sûr de vouloir restaurer ce client&nbsp;?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmRestore(null)}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={toggleArchive.isPending}
                className="cursor-pointer rounded-[8px] bg-green-600 px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
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
