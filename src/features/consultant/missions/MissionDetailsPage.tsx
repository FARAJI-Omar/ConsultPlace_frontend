import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../lib/apiClient';
import { useConsultantTimesheets } from '../../../hooks/consultant/useConsultantDashboard';
import { formatDate } from '../../../lib/utils';
import type { PaginatedResponse, ApiResponse } from '../../../types/api';
import type { ConsultantMission, TrackingEntry } from '../../../types/consultant';

const STATUS_BADGE: Record<string, string> = {
  BROUILLON: 'bg-[#f5f5f5] text-[#6b7280]',
  SOUMIS: 'bg-[#fef3c7] text-[#92400e]',
  VALIDE: 'bg-[#d1fae5] text-[#065f46]',
  REJETE: 'bg-[#fee2e2] text-[#991b1b]',
  FACTURE: 'bg-[#ffedd5] text-[#9a3412]',
  PAYE: 'bg-[#d1fae5] text-[#065f46]',
};

const TABS = [
  { label: 'Relevés mensuels', value: 'timesheets' },
  { label: 'Historique des paiements', value: 'payouts' },
];

export default function MissionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const missionId = Number(id);
  const [activeTab, setActiveTab] = useState('timesheets');

  const { data: mission, isLoading: missionLoading } = useQuery({
    queryKey: ['consultant-mission-detail', missionId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ConsultantMission>>(
        '/consultant/missions?limit=500',
      );
      return data.data.find((m) => m.id === missionId) ?? null;
    },
    enabled: !isNaN(missionId),
  });

  const { data: timesheetsData } = useConsultantTimesheets();
  const allTimesheets = timesheetsData ?? [];

  const { data: trackingData } = useQuery({
    queryKey: ['consultant-tracking'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TrackingEntry[]>>(
        '/consultant/tracking',
      );
      return data.data;
    },
  });
  const tracking = trackingData ?? [];

  if (isNaN(missionId)) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-[#ef4444]">Mission invalide.</p>
      </div>
    );
  }

  if (missionLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-[#6b7280]">Chargement...</p>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-[#ef4444]">Mission introuvable.</p>
      </div>
    );
  }

  const associatedTimesheets = allTimesheets.filter(
    (ts) => ts.missionId === missionId,
  );

  const payoutHistory = tracking.filter(
    (t) => t.missionTitle === mission.title,
  );

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/consultant/missions')}
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#111111] transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Retour aux missions
      </button>

      <div className="rounded-[12px] bg-[#f5f5f5] p-8">
        <h1 className="text-[22px] font-semibold text-[#111111] leading-[1.3] tracking-[-0.3px] mb-6">
          {mission.title}
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-[#6b7280] mb-1">Client</p>
            <p className="text-[16px] text-[#111111] font-medium">
              {mission.contract?.client?.raison_sociale ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#6b7280] mb-1">Référence contrat</p>
            <p className="text-[16px] text-[#111111] font-medium">
              {mission.contract?.ref ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#6b7280] mb-1">Profil</p>
            <p className="text-[16px] text-[#111111] font-medium">
              {mission.contract?.profile ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#6b7280] mb-1">Taux journalier</p>
            <p className="text-[16px] text-[#111111] font-medium">
              {mission.contract?.dailyRate
                ? `${mission.contract.dailyRate} DH`
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#6b7280] mb-1">Date début</p>
            <p className="text-[16px] text-[#111111] font-medium">
              {formatDate(mission.startDate)}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#6b7280] mb-1">Date fin</p>
            <p className="text-[16px] text-[#111111] font-medium">
              {formatDate(mission.endDate)}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#6b7280] mb-1">Statut</p>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                mission.status === 'ACTIVE'
                  ? 'bg-[#d1fae5] text-[#065f46]'
                  : 'bg-[#f5f5f5] text-[#6b7280]'
              }`}
            >
              {mission.status === 'ACTIVE' ? 'Active' : 'Cloturée'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-[#f8f9fa] rounded-full p-1.5 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`cursor-pointer px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.value
                ? 'bg-[#ffffff] text-[#111111]'
                : 'text-[#6b7280] hover:text-[#111111]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'timesheets' && (
        <div className="rounded-[12px] bg-[#f5f5f5] p-8">
          <h2 className="text-[18px] font-semibold text-[#111111] leading-[1.4] mb-4">
            Relevés mensuels associés
          </h2>
          {associatedTimesheets.length === 0 ? (
            <p className="text-sm text-[#6b7280]">
              Aucun relevé pour cette mission.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                      Mois
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                      Heures
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                      Soumis le
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {associatedTimesheets.map((ts) => (
                    <tr
                      key={ts.id}
                      className="border-b border-[#e5e7eb] hover:bg-[#f9fafb]"
                    >
                      <td className="px-4 py-3 text-[#111111]">{ts.month}</td>
                      <td className="px-4 py-3 text-[#111111]">
                        {ts.totalHours}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_BADGE[ts.status] ??
                            'bg-[#f5f5f5] text-[#6b7280]'
                          }`}
                        >
                          {ts.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#111111]">
                        {formatDate(ts.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="rounded-[12px] bg-[#f5f5f5] p-8">
          <h2 className="text-[18px] font-semibold text-[#111111] leading-[1.4] mb-4">
            Historique des paiements
          </h2>
          {payoutHistory.length === 0 ? (
            <p className="text-sm text-[#6b7280]">
              Aucun paiement pour cette mission.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                      Mois
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                      Ref Paiement
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                      Montant versé
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                      Ref Facture
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payoutHistory.map((entry) => (
                    <tr
                      key={entry.timesheetId}
                      className="border-b border-[#e5e7eb] hover:bg-[#f9fafb]"
                    >
                      <td className="px-4 py-3 text-[#111111]">
                        {entry.date.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 text-[#111111]">
                        {entry.paymentRef}
                      </td>
                      <td className="px-4 py-3 text-[#111111]">
                        {(entry.paymentAmount ?? 0).toLocaleString()} DH
                      </td>
                      <td className="px-4 py-3 text-[#111111]">
                        {entry.invoices.map((inv) => inv.ref).join(', ') || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
