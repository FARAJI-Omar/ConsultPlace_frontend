import { useDashboardKPIs, useMarginReport, useTurnoverForecast } from '../../../hooks/useTracking';
import KPICards from './KPICards';
import StatComparisonCards from './StatComparisonCards';
import MonthlyRevenueChart from './MonthlyRevenueChart';

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: margin, isLoading: marginLoading } = useMarginReport();
  const { data: turnover, isLoading: turnoverLoading } = useTurnoverForecast();

  const isLoading = kpisLoading || marginLoading || turnoverLoading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#111111]">Tableau de bord</h1>

      <KPICards
        pendingInvoices={kpis?.pendingInvoices ?? 0}
        totalPendingInvoices={kpis?.totalPendingInvoices ?? 0}
        cabinetMargin={kpis?.cabinet_margin ?? 0}
        isLoading={kpisLoading}
      />

      <StatComparisonCards
        totalRevenue={margin?.summary.totalRevenue ?? 0}
        cabinetMargin={margin?.summary.cabinet_margin ?? 0}
        marginPercentage={margin?.summary.marginPercentage ?? 0}
        activeMissions={turnover?.activeMissionsCount ?? 0}
        avgMonthlyRevenue={turnover?.avgMonthlyRevenue ?? 0}
        isLoading={isLoading}
      />

      <MonthlyRevenueChart
        data={margin?.byClient ?? []}
        isLoading={marginLoading}
      />
    </div>
  );
}
