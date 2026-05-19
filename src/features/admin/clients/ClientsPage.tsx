import { useState, useCallback } from 'react';
import { Pencil } from 'lucide-react';
import { DataTable, type Column } from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ClientForm from './ClientForm';
import { useGetClients } from '../../../hooks/useClients';

interface ClientRow {
  id: number;
  raison_sociale: string;
  rc: string;
  contact: string;
  email: string;
  address: string;
  phone_n: string | null;
  total_contracts: number;
}

export default function ClientsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);

  const { data, isLoading } = useGetClients(page, pageSize);

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const openCreate = () => {
    setEditingClient(null);
    setModalOpen(true);
  };

  const openEdit = (client: ClientRow) => {
    setEditingClient(client);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingClient(null);
  };

  const columns: Column<ClientRow>[] = [
    { key: 'raison_sociale', label: 'Raison sociale' },
    { key: 'rc', label: 'Registre de Commerce' },
    { key: 'contact', label: 'Contact' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Adresse' },
    {
      key: 'phone_n',
      label: 'Téléphone',
      render: (item) => item.phone_n ?? '—',
    },
    {
      key: 'total_contracts',
      label: 'Contrats',
      render: (item) => String(item.total_contracts),
    },
    {
      key: 'actions',
      label: '',
      render: (item) => (
        <button
          onClick={() => openEdit(item)}
          className="cursor-pointer rounded p-1.5 text-[#6b7280] transition-colors hover:bg-light-blue hover:text-primary-blue"
          aria-label="Modifier"
        >
          <Pencil className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111111]">Clients</h1>
        <button
          onClick={openCreate}
          className="cursor-pointer rounded-[8px] bg-primary-blue px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90"
        >
          Créer un client
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
        emptyMessage="Aucun client trouvé"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingClient ? 'Modifier le client' : 'Créer un client'}
        size="md"
      >
        <ClientForm
          client={editingClient ?? undefined}
          onSuccess={closeModal}
        />
      </Modal>
    </div>
  );
}
