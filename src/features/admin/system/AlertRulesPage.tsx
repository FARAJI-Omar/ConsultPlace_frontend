import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { DataTable, type Column } from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import AlertRuleForm from './AlertRuleForm';
import { useGetAlertRules } from '../../../hooks/useAlertRules';
import type { AlertRule } from '../../../hooks/useAlertRules';

export default function AlertRulesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const { data, isLoading } = useGetAlertRules();

  const openCreate = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  const openEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRule(null);
  };

  const columns: Column<AlertRule>[] = [
    { key: 'type', label: 'Type',
      render: (item) => (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            item.type === 'CRITICAL' ? 'bg-red-100 text-red-700' :
            item.type === 'WARNING' ? 'bg-yellow-100 text-yellow-700' :
            'bg-blue-100 text-blue-700'
          }`}
        >
          {item.type}
        </span>
      )
    },
    {
      key: 'event',
      label: 'Événement',
      render: (item) => {
        const labels: Record<string, string> = {
          LATE_INVOICE: 'Facture en retard',
          LATE_PAYOUT: 'Paiement en retard',
          UNBILLED_CRA: 'CRA non facturé',
          PENDING_CRA: 'CRA en attente',
          UPCOMING_BILL: 'Facture à venir',
        };
        return labels[item.event] ?? item.event;
      },
    },
    { key: 'threshold', label: 'Seuil (jours)', render: (item) => `${item.threshold} jours` },
    {
      key: 'isActive',
      label: 'Active',
      render: (item) => (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {item.isActive ? 'Oui' : 'Non'}
        </span>
      ),
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
        <h1 className="text-2xl font-semibold text-[#111111]">Règles d'alerte</h1>
        <button
          onClick={openCreate}
          className="cursor-pointer rounded-[8px] bg-primary-blue px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90"
        >
          Créer une règle
        </button>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        pagination={{ totalItems: (data ?? []).length, totalPages: 1, currentPage: 1, itemsPerPage: (data ?? []).length }}
        isLoading={isLoading}
        isEmpty={(data?.length ?? 0) === 0 && !isLoading}
        emptyMessage="Aucune règle d'alerte trouvée"
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingRule ? "Modifier la règle d'alerte" : "Créer une règle d'alerte"}
        size="md"
      >
        <AlertRuleForm
          rule={editingRule ?? undefined}
          onSuccess={closeModal}
        />
      </Modal>
    </div>
  );
}
