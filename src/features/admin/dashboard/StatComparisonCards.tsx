import { DollarSign, TrendingUp, Briefcase, BarChart3, type LucideIcon } from 'lucide-react';

interface StatCardData {
  label: string;
  value: string;
  icon: LucideIcon;
  sub?: string;
}

interface StatComparisonCardsProps {
  totalRevenue: number;
  cabinetMargin: number;
  marginPercentage: number;
  activeMissions: number;
  avgMonthlyRevenue: number;
  isLoading: boolean;
}

export default function StatComparisonCards({
  totalRevenue,
  cabinetMargin,
  marginPercentage,
  activeMissions,
  avgMonthlyRevenue,
  isLoading,
}: StatComparisonCardsProps) {
  const cards: StatCardData[] = [
    {
      label: 'Revenu (année en cours)',
      value: `${totalRevenue.toLocaleString()} DH`,
      icon: DollarSign,
      sub: `${avgMonthlyRevenue.toLocaleString()} DH / mois en moyenne`,
    },
    {
      label: 'Marge cabinet',
      value: `${cabinetMargin.toLocaleString()} DH`,
      icon: TrendingUp,
      sub: `Soit ${marginPercentage}% du revenu`,
    },
    {
      label: 'Missions actives',
      value: `${activeMissions}`,
      icon: Briefcase,
    },
    {
      label: 'Revenu mensuel moyen',
      value: `${avgMonthlyRevenue.toLocaleString()} DH`,
      icon: BarChart3,
      sub: 'Basé sur les missions en cours',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6b7280]">{card.label}</span>
              <Icon className="h-5 w-5 text-[#9ca3af]" />
            </div>
            {isLoading ? (
              <div className="mt-2 h-8 w-32 animate-pulse rounded bg-[#e5e7eb]" />
            ) : (
              <p className="mt-2 text-2xl font-semibold text-[#111111]">{card.value}</p>
            )}
            {card.sub && !isLoading && (
              <p className="mt-1 text-xs text-[#9ca3af]">{card.sub}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
