import { useConsultantDashboard } from '../../../hooks/consultant/useConsultantDashboard';
import StatsCards from './StatsCards';
import Reminders from './Reminders';

export default function ConsultantDashboard() {
  const { timesheets, earnings, totalMissions, activeMissions, isLoading, isError } =
    useConsultantDashboard();

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-[#6b7280]">Chargement du tableau de bord...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-[#ef4444]">Échec du chargement des données.</p>
      </div>
    );
  }

  const totalEarnings = earnings?.totalEarnings ?? 0;
  const averageByMission =
    totalMissions > 0 ? Math.round(totalEarnings / totalMissions) : 0;

  const unsubmittedDrafts = timesheets.filter(
    (ts) => ts.status === 'BROUILLON',
  );

  return (
    <div className="space-y-8">
      <h1 className="text-[22px] font-semibold text-[#111111] leading-[1.3] tracking-[-0.3px]">
        Tableau de bord
      </h1>

      <StatsCards
        totalMissions={totalMissions}
        activeMissions={activeMissions}
        totalEarnings={totalEarnings}
        averageByMission={averageByMission}
      />

      <Reminders
        unsubmittedDrafts={unsubmittedDrafts}
        activeMissionCount={activeMissions}
      />
    </div>
  );
}
