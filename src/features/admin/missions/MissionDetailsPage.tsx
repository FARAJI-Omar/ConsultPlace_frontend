import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useGetMissionById } from '../../../hooks/useMissions';
import { formatDate } from '../../../lib/utils';

export default function MissionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const missionId = Number(id);
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
      <Link
        to="/admin/missions"
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-[#6b7280] transition-colors hover:text-primary-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux missions
      </Link>

      <h1 className="text-2xl font-semibold text-[#111111]">
        Mission {mission.title}
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[12px] border border-[#e5e7eb] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">
            Informations de la mission
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#6b7280]">Titre</dt>
              <dd className="font-medium text-[#111111]">{mission.title}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6b7280]">Contrat</dt>
              <dd className="font-medium text-[#111111]">
                {mission.contract?.ref ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6b7280]">Consultant</dt>
              <dd className="font-medium text-[#111111]">
                {mission.consultant?.name ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6b7280]">Date de début</dt>
              <dd className="font-medium text-[#111111]">{formatDate(mission.startDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6b7280]">Date de fin</dt>
              <dd className="font-medium text-[#111111]">{formatDate(mission.endDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6b7280]">Statut</dt>
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
    </div>
  );
}
