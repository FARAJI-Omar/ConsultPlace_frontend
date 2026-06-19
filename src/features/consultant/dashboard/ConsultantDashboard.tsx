import { useConsultantDashboard, useConsultantTracking } from '../../../hooks/consultant/useConsultantDashboard';
import StatsCards from './StatsCards';
import ConsultantMonthlyRevenueChart from './ConsultantMonthlyRevenueChart';
import Reminders from './Reminders';

export default function ConsultantDashboard() {
  const { timesheets, earnings, totalMissions, activeMissions, isLoading, isError } =
    useConsultantDashboard();

  const { data: trackingData, isLoading: trackingLoading } = useConsultantTracking();

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

  const draftCount = timesheets.filter(
    (ts) => ts.status === 'BROUILLON' && ts.mission?.status !== 'CLOSED',
  ).length;
  const rejectedCount = timesheets.filter((ts) => ts.status === 'REJETE').length;

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

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-[30%] md:order-2 border border-[#e5e7eb] rounded-xl">
          <Reminders
            draftCount={draftCount}
            rejectedCount={rejectedCount}
          />
        </div>
        <div className="w-full md:w-[70%] md:order-1">
          <ConsultantMonthlyRevenueChart
            data={trackingData ?? []}
            isLoading={trackingLoading}
          />
        </div>
      </div>
    </div>
  );
}
