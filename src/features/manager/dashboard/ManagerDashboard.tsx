import { useDashboardKPIs, useMonthlySummary, useAlerts } from '../../../hooks/manager/useTracking';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../../../components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts';
import { Skeleton, SkeletonCard } from '../../../components/ui/skeleton';

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function ManagerDashboard() {
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: monthlySummary } = useMonthlySummary();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();

  const criticalAlerts = alerts?.critical ?? [];

  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const summary = monthlySummary;
  const clients = summary?.clients ?? [];

  const chartConfig: ChartConfig = {};
  for (const c of clients) {
    chartConfig[c.clientName] = { label: c.clientName };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#111111]">
          Tableau de bord
        </h1>
        <p className="text-sm text-[#6b7280] mt-1 italic">Année: {new Date().getFullYear()}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpisLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : <>
              <div className="rounded-[12px] bg-[#f5f5f5] p-6">
                <p className="text-sm font-medium text-[#6b7280]">Factures en attente</p>
                <p className="mt-2 text-3xl font-semibold text-[#111111]">{kpis?.pendingInvoices ?? 0}</p>
              </div>
              <div className="rounded-[12px] bg-[#f5f5f5] p-6">
                <p className="text-sm font-medium text-[#6b7280]">CA facturé (HT)</p>
                <p className="mt-2 text-3xl font-semibold text-[#111111]">{(kpis?.totalRevenue ?? 0).toLocaleString()} DH</p>
              </div>
              <div className="rounded-[12px] bg-[#f5f5f5] p-6">
                <p className="text-sm font-medium text-[#6b7280]">Encaissé (TTC)</p>
                <p className="mt-2 text-3xl font-semibold text-[#111111]">{(kpis?.totalReceived ?? 0).toLocaleString()} DH</p>
              </div>
              <div className="rounded-[12px] bg-[#f5f5f5] p-6">
                <p className="text-sm font-medium text-[#6b7280]">En attente (TTC)</p>
                <p className="mt-2 text-3xl font-semibold text-[#111111]">{(kpis?.totalPendingInvoices ?? 0).toLocaleString()} DH</p>
              </div>
            </>
        }
      </div>

      <div className="rounded-[12px] bg-[#f5f5f5] p-6">
        <h2 className="text-lg font-semibold text-[#111111]">Alertes critiques</h2>
        {alertsLoading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-[8px] border border-[#e5e7eb] px-4 py-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-8 w-28 shrink-0" />
              </div>
            ))}
          </div>
        ) : criticalAlerts.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b7280]">Aucune alerte critique</p>
        ) : (
          <div className="mt-4 space-y-3">
            {criticalAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-[8px] border border-[#ef4444] bg-red-100 px-4 py-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#111111]">{alert.title}</p>
                  <p className="text-xs text-[#6b7280]">{alert.message}</p>
                </div>
                <button
                  disabled
                  className="cursor-not-allowed rounded-[8px] bg-[#e5e7eb] px-3 py-1.5 text-xs font-medium text-[#6b7280]"
                >
                  Bientôt disponible
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {clients.length > 0 && (
        <div className="rounded-[12px] bg-[#f5f5f5] p-6">
          <h2 className="text-lg font-semibold text-[#111111] mb-4">
            Répartition CA par client ({monthNames[(summary!.month || 1) - 1]} {summary!.year})
          </h2>
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <BarChart data={clients} margin={{ top: 8, left: 8, right: 8, bottom: 8 }}>
              <XAxis dataKey="clientName" tickLine={false} axisLine={false} tick={{ fontSize: 14 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
              <Bar dataKey="totalRevenue" radius={[4, 4, 0, 0]} maxBarSize={120}>
                {clients.map((_, idx) => (
                  <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}
