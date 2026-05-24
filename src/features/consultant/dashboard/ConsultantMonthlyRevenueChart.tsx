import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TrackingEntry } from '../../../types/consultant';

const MONTH_LABELS: Record<string, string> = {
  '01': 'Janvier', '02': 'Février', '03': 'Mars', '04': 'Avril',
  '05': 'Mai', '06': 'Juin', '07': 'Juillet', '08': 'Août',
  '09': 'Septembre', '10': 'Octobre', '11': 'Novembre', '12': 'Décembre',
};

interface MonthlyRevenue {
  monthKey: string;
  monthLabel: string;
  totalRevenue: number;
}

function aggregateByMonth(entries: TrackingEntry[]): MonthlyRevenue[] {
  const map = new Map<string, number>();
  for (const entry of entries) {
    const current = map.get(entry.month) ?? 0;
    map.set(entry.month, current + (entry.paymentAmount ?? 0));
  }
  return Array.from(map.entries())
    .map(([monthKey, totalRevenue]) => ({
      monthKey,
      monthLabel: MONTH_LABELS[monthKey.slice(5)] ?? monthKey,
      totalRevenue,
    }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

function ChartTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  const entry = payload[0] as Record<string, unknown> | undefined;
  return (
    <div className="rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-2 shadow-sm">
      <p className="mb-1 text-xs font-semibold text-[#111111]">{String(label)}</p>
      <p className="text-sm text-[#6b7280]">
        {Number(entry?.value ?? 0).toLocaleString()} DH
      </p>
    </div>
  );
}

interface Props {
  data: TrackingEntry[];
  isLoading: boolean;
}

export default function ConsultantMonthlyRevenueChart({ data, isLoading }: Props) {
  const chartData = useMemo(() => aggregateByMonth(data), [data]);

  if (isLoading) {
    return (
      <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6">
        <div className="mb-6 h-5 w-48 animate-pulse rounded bg-[#e5e7eb]" />
        <div className="h-64 animate-pulse rounded bg-[#f3f4f6]" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6">
        <h2 className="mb-1 text-base font-semibold text-[#111111]">Revenu mensuel</h2>
        <p className="text-sm text-[#9ca3af]">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6">
      <h2 className="mb-1 text-base font-semibold text-[#111111]">Revenu mensuel</h2>
      <p className="mb-6 text-sm text-[#6b7280]">
        Évolution du chiffre d'affaires par mois
      </p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="totalRevenue"
              fill="var(--secondary-green)"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
