import { useState } from 'react';
import { DataTable, type Column } from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import AlertRuleForm from './AlertRuleForm';
import { useGetAlertRules } from '../../../hooks/useAlertRules';
import type { AlertRule } from '../../../hooks/useAlertRules';

export default function AlertRulesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [popoverMessage, setPopoverMessage] = useState<{ id: number; text: string } | null>(null);

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
      render: (item) => {
        const typeLabels: Record<string, string> = {
          CRITICAL: 'Critique',
          WARNING: 'Avertissement',
          INFO: 'Information',
        };
        return (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              item.type === 'CRITICAL' ? 'bg-red-100 text-red-700' :
              item.type === 'WARNING' ? 'bg-yellow-100 text-yellow-700' :
              'bg-blue-100 text-blue-700'
            }`}
          >
            {typeLabels[item.type] ?? item.type}
          </span>
        );
      }
    },
    {
      key: 'event',
      label: 'Événement',
      render: (item) => {
        const labels: Record<string, string> = {
          LATE_INVOICE: 'Facture en retard',
          LATE_PAYOUT: 'Paiement en retard',
          UNBILLED_CRA: 'Relevé non facturé',
          PENDING_CRA: 'Relevé en attente',
          UPCOMING_BILL: 'Facture à venir',
        };
        return labels[item.event] ?? item.event;
      },
    },
    {
      key: 'threshold',
      label: 'Seuil (jours)',
      render: (item) => {
        const prefix =
          item.event === 'LATE_INVOICE' && item.type === 'CRITICAL' ? '>' :
          item.event === 'LATE_INVOICE' && item.type === 'WARNING' ? '<' : '';
        return `${prefix}${item.threshold} jours`;
      },
    },
    {
      key: 'titleTemplate',
      label: 'Titre personnalisé',
      render: (item) => (
        <span className="max-w-[180px] truncate block text-xs" title={item.titleTemplate ?? ''}>
          {item.titleTemplate ?? '—'}
        </span>
      ),
    },
    {
      key: 'messageTemplate',
      label: 'Message personnalisé',
      render: (item) => (
        <span
          onClick={() => setPopoverMessage({ id: item.id, text: item.messageTemplate ?? '' })}
          className="max-w-[200px] truncate block text-xs cursor-pointer hover:text-primary-blue transition-colors"
          title={item.messageTemplate ?? ''}
        >
          {item.messageTemplate ?? '—'}
        </span>
      ),
    },
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
      label: 'Actions',
      render: (item) => (
        <button
          onClick={() => openEdit(item)}
          className="cursor-pointer rounded-[6px] bg-[#03b5537c] text-green-800 px-2.5 py-1 text-xs font-medium  transition-colors hover:bg-green-700"
        >
          Modifier
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
        size="lg"
      >
        <AlertRuleForm
          rule={editingRule ?? undefined}
          onSuccess={closeModal}
        />
      </Modal>

      {popoverMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
        >
          <div
            className="max-w-lg w-full rounded-[12px] bg-[#ffffff] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-sm font-semibold text-[#111111]">Message personnalisé</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-[#111111] whitespace-pre-wrap break-words">{popoverMessage.text}</p>
            </div>
            <div className="flex justify-end border-t border-[#e5e7eb] px-5 py-3">
              <button
                onClick={() => setPopoverMessage(null)}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-1.5 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
