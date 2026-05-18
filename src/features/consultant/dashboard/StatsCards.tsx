interface StatsCardsProps {
  totalMissions: number;
  activeMissions: number;
  totalEarnings: number;
  averageByMission: number;
}

export default function StatsCards({
  totalMissions,
  activeMissions,
  totalEarnings,
  averageByMission,
}: StatsCardsProps) {
  const stats = [
    {
      label: 'Total Missions',
      value: String(totalMissions),
    },
    {
      label: 'Missions actifs',
      value: String(activeMissions),
    },
    {
      label: 'Gains totaux',
      value: `${totalEarnings.toLocaleString()} DH`,
    },
    {
      label: 'Moyenne (par mission)',
      value: `${averageByMission.toLocaleString()} DH`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-[12px] bg-[#f5f5f5] p-8"
        >
          <p className="text-[18px] font-semibold text-[#111111] leading-[1.4] mb-2">
            {stat.value}
          </p>
          <p className="text-[16px] text-[#374151] leading-[1.5]">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
