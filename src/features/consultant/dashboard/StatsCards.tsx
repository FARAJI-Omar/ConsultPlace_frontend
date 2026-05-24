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
      label: `Gains totaux ${new Date().getFullYear()}`,
      value: `${totalEarnings.toLocaleString()} DH`,
    },
    {
      label: 'Moyenne (par mission)',
      value: `${averageByMission.toLocaleString()} DH`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const isGainsTotaux = stat.label === 'Gains totaux';
        return (
          <div
            key={stat.label}
            className={`rounded-[12px] p-8 transition-all ${
              isGainsTotaux
                ? 'bg-green-500/20 border border-transparent shadow-sm'
                : 'bg-[#f5f5f5] border border-transparent shadow-sm'
            }`}
          >
            <p
              className="text-[18px] font-semibold leading-[1.4] mb-2 text-[#111111]"
            >
              {stat.value}
            </p>
            <p
              className="text-[16px] leading-[1.5] text-[#374151]"
            >
              {stat.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
