import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataTable, type Column } from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import AlertRuleForm from '../../admin/system/AlertRuleForm';
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
    { key: '#', label: '#', render: (_item, idx) => String(idx + 1) },
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
          LOW_BDC_DAYS: 'BDC faible en jours',
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
      <div className="flex items-center gap-4">
        <Link
          to="/manager/alerts"
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-1.5 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>
        <h1 className="text-2xl font-semibold text-[#111111]">Règles d'alerte</h1>
        <div className="ml-auto">
          <button
            onClick={openCreate}
            className="cursor-pointer rounded-[8px] bg-primary-blue px-4 py-2 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90"
          >
            Créer une règle
          </button>
        </div>
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
            className="max-w-lg w-full rounded-[12px] bg-[#ffffff] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#111111]">Message personnalisé</h3>
              <button
                onClick={() => setPopoverMessage(null)}
                className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-4 py-1.5 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
              >
                Annuler
              </button>
            </div>
            <p className="text-sm text-[#111111] whitespace-pre-wrap break-words">{popoverMessage.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
