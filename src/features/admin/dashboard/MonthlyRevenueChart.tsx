import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ClientRevenue {
  clientName: string;
  totalRevenue: number;
  invoiceCount: number;
}

interface MonthlyRevenueChartProps {
  data: ClientRevenue[];
  isLoading: boolean;
}

function ChartTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  const entry = payload[0] as Record<string, unknown> | undefined;
  const invoiceCount = (entry?.payload as Record<string, unknown> | undefined)?.invoiceCount;
  return (
    <div className="rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-2 shadow-sm">
      <p className="mb-1 text-xs font-semibold text-[#111111]">{String(label)}</p>
      <p className="text-sm text-[#6b7280]">
        {Number(entry?.value ?? 0).toLocaleString()} DH
      </p>
      {invoiceCount != null && (
        <p className="text-xs text-[#9ca3af]">{String(invoiceCount)} factures</p>
      )}
    </div>
  );
}

export default function MonthlyRevenueChart({ data, isLoading }: MonthlyRevenueChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6">
        <div className="mb-6 h-5 w-48 animate-pulse rounded bg-[#e5e7eb]" />
        <div className="h-80 animate-pulse rounded bg-[#f3f4f6]" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6">
        <h2 className="mb-1 text-base font-semibold text-[#111111]">Revenu par client</h2>
        <p className="text-sm text-[#9ca3af]">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6">
      <h2 className="mb-1 text-base font-semibold text-[#111111]">Revenu par client</h2>
      <p className="mb-6 text-sm text-[#6b7280]">
        Répartition du chiffre d'affaires par client (année en cours)
      </p>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 13, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="clientName"
              tick={{ fontSize: 13, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={140}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="totalRevenue"
              fill="var(--color-primary-yellow)"
              radius={[0, 6, 6, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
