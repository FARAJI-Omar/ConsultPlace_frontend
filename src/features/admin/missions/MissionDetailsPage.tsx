import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FileText, Download } from 'lucide-react';
import { useGetMissionById } from '../../../hooks/useMissions';
import { formatDate } from '../../../lib/utils';
import Modal from '../../../components/common/Modal';
import MissionForm from './MissionForm';

const statusBadge: Record<string, string> = {
  BROUILLON: 'bg-[#e5e7eb] text-[#6b7280]',
  SOUMIS: 'bg-[#fef3c7] text-[#f59e0b]',
  VALIDE: 'bg-[#d1fae5] text-[#10b981]',
  REJETE: 'bg-[#fee2e2] text-[#ef4444]',
  FACTURE: 'bg-[#ffedd5] text-[#f97316]',
  PAYE: 'bg-[#d1fae5] text-[#10b981]',
};

const statusLabels: Record<string, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS: 'Soumis',
  VALIDE: 'Validé',
  REJETE: 'Rejeté',
  FACTURE: 'Facturé',
  PAYE: 'Payé',
};

export default function MissionDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const missionId = Number(id);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { data: mission, isLoading } = useGetMissionById(missionId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-[#e5e7eb]" />
        <div className="h-64 animate-pulse rounded-[12px] bg-[#e5e7eb]" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-[#6b7280]">Mission introuvable</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/missions"
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-1.5 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>
        <h1 className="text-2xl font-semibold text-[#111111]">
          Mission {mission.title}
        </h1>
        <button
          onClick={() => setEditModalOpen(true)}
          className="ml-auto cursor-pointer rounded-[8px] bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
        >
          Modifier
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">
            Informations de la mission
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Titre</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd className="shrink-0 font-medium text-[#111111]">{mission.title}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Créée le</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd className="shrink-0 font-medium text-[#111111]">{formatDate(mission.createdAt)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Contrat</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd className="shrink-0 font-medium text-[#111111]">
                {mission.contract?.ref ? (
                  <Link to={`/admin/contracts/${mission.contractId}`} className="text-[#3b82f6] hover:underline">
                    {mission.contract.ref}
                  </Link>
                ) : '—'}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Profil demandé</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd className="shrink-0 font-medium text-[#111111]">
                {mission.contract?.profile ?? '—'}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Taux journalier</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd className="shrink-0 font-medium text-[#111111]">
                {mission.missionDailyRate ? `${mission.missionDailyRate} DH` : '—'}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Consultant(s)</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd className="shrink-0 font-medium text-[#111111]">
                {(() => {
                  const list = mission.consultants ?? [];
                  if (list.length > 0) {
                    return list.map((mc) => mc.consultant.name).join(', ');
                  }
                  return mission.consultant?.name ?? '—';
                })()}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Date de début</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd className="shrink-0 font-medium text-[#111111]">{formatDate(mission.startDate)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Date de fin</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd className="shrink-0 font-medium text-[#111111]">{formatDate(mission.endDate)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Statut</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    mission.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {mission.status === 'ACTIVE' ? 'Active' : 'Clôturée'}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {mission.attachments && mission.attachments.length > 0 && (
        <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">
            Documents
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {mission.attachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-3 transition-colors hover:bg-[#f9fafb]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#eff6ff]">
                  <FileText className="h-5 w-5 text-[#3b82f6]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#111111]">{att.filename}</p>
                  <p className="text-xs text-[#6b7280]">Document</p>
                </div>
                <Download className="h-4 w-4 shrink-0 text-[#6b7280]" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#111111]">
          Relevés associés ({(mission.timesheets ?? []).length})
        </h2>
        {mission.timesheets && mission.timesheets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">Mois</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">Jours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">Heures</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">Soumis le</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]"></th>
                </tr>
              </thead>
              <tbody>
                {mission.timesheets.map((ts) => (
                  <tr key={ts.id} className="border-b border-[#e5e7eb] transition-colors hover:bg-[#f9fafb]">
                    <td className="px-4 py-3 text-[#111111]">{ts.month}</td>
                    <td className="px-4 py-3 text-[#111111]">{ts.days}</td>
                    <td className="px-4 py-3 text-[#111111]">{ts.totalHours}h</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[ts.status] ?? ''}`}>
                        {statusLabels[ts.status] ?? ts.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#111111]">{formatDate(ts.submittedAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/manager/timesheets/${ts.id}`)}
                        className="cursor-pointer rounded-[6px] bg-[#EFF6FF] px-2 py-0.5 text-xs font-medium text-primary-blue transition-colors hover:bg-blue-100"
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#6b7280]">Aucun relevé pour cette mission</p>
        )}
      </div>

      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Modifier la mission"
        size="lg"
      >
        <MissionForm
          key={mission.id}
          mission={mission}
          onSuccess={() => setEditModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
