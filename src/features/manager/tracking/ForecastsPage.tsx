import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Line,
  Legend,
} from 'recharts';
import { TrendingUp, DollarSign, Users, PieChart, ArrowUpRight, Wallet, BarChart3 } from 'lucide-react';
import { useTurnoverForecast, useMarginForecast } from '../../../hooks/manager/useAdvancedTracking';
import { cn } from '../../../lib/utils';

const MONTHS_OPTIONS = [3, 6, 12] as const;

const colors = {
  primary: '#111111',
  brandAccent: '#3b82f6',
  muted: '#6b7280',
  hairline: '#e5e7eb',
  surfaceSoft: '#f8f9fa',
  surfaceCard: '#f5f5f5',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
} as const;

function getDefaultStartDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}

function getDefaultEndDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-12-31`;
}

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function formatMonth(month: string): string {
  const [y, m] = month.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

function marginColorClass(pct: number): string {
  if (pct >= 30) return 'text-[#10b981]';
  if (pct >= 15) return 'text-[#f59e0b]';
  return 'text-[#ef4444]';
}

function marginBgClass(pct: number): string {
  if (pct >= 30) return 'bg-[#10b981]';
  if (pct >= 15) return 'bg-[#f59e0b]';
  return 'bg-[#ef4444]';
}

const barRadius = [6, 6, 0, 0] as [number, number, number, number];

const chartGridProps = {
  strokeDasharray: '3 3' as const,
  stroke: colors.hairline,
  vertical: false,
};

const axisTickProps = { fontSize: 12, fill: colors.muted };

const tooltipContentStyle = {
  background: '#ffffff',
  border: `1px solid ${colors.hairline}`,
  borderRadius: 8,
  fontSize: 13,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

const inputClass = 'rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors';

const cardClass = 'rounded-[12px] bg-white border border-[#e5e7eb] p-6';

const sectionTitleClass = 'mb-4 text-lg font-semibold text-[#111111]';

const thClass = 'px-4 py-3 text-left text-xs font-medium text-[#6b7280] bg-[#f8f9fa] first:rounded-l-[8px] last:rounded-r-[8px]';

const tdClass = 'px-4 py-3 text-sm border-b border-[#e5e7eb]';

function KpiCard({ icon: Icon, label, value, className }: { icon: React.ElementType; label: string; value: string | number; className?: string }) {
  return (
    <div className={cn('rounded-[12px] bg-white border border-[#e5e7eb] p-4 md:p-6 hover:shadow-sm transition-shadow', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs md:text-sm text-[#6b7280]">{label}</p>
          <p className="mt-1 text-lg md:text-2xl font-semibold text-[#111111]">{value}</p>
        </div>
        <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-[8px] bg-[#f8f9fa]">
          <Icon className="h-4 w-4 md:h-5 md:w-5 text-[#111111]" />
        </div>
      </div>
    </div>
  );
}

function MiniBar({ pct }: { pct: number }) {
  const barColor = marginBgClass(pct);
  return (
    <div className="ml-2 inline-flex h-1.5 w-16 overflow-hidden rounded-full bg-[#e5e7eb] align-middle">
      <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function ForecastsPage() {
  const [tab, setTab] = useState<'turnover' | 'margin'>('turnover');
  const [forecastMonths, setForecastMonths] = useState(3);
  const [marginStartDate, setMarginStartDate] = useState(getDefaultStartDate);
  const [marginEndDate, setMarginEndDate] = useState(getDefaultEndDate);

  const { data: turnoverData, isLoading: turnoverLoading } = useTurnoverForecast(forecastMonths);
  const { data: marginData, isLoading: marginLoading } = useMarginForecast(marginStartDate, marginEndDate);

  const turnover = turnoverData?.data;
  const margin = marginData?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111111]">Prévisions et Rentabilité</h1>
      </div>

      <div className="inline-flex rounded-[9999px] bg-[#f8f9fa] p-[6px]" role="tablist">
        <button
          role="tab"
          onClick={() => setTab('turnover')}
          className={cn(
            'cursor-pointer rounded-[8px] px-5 py-2 text-sm font-medium transition-all',
            tab === 'turnover'
              ? 'bg-white text-[#111111] shadow-sm'
              : 'text-[#6b7280] hover:text-[#111111]',
          )}
        >
          Prévision d'affaires
        </button>
        <button
          role="tab"
          onClick={() => setTab('margin')}
          className={cn(
            'cursor-pointer rounded-[8px] px-5 py-2 text-sm font-medium transition-all',
            tab === 'margin'
              ? 'bg-white text-[#111111] shadow-sm'
              : 'text-[#6b7280] hover:text-[#111111]',
          )}
        >
          Marge cabinet
        </button>
      </div>

      {tab === 'turnover' && (
        <div className="space-y-6">
          {turnoverLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-[12px] bg-[#e5e7eb]" />
              ))}
            </div>
          ) : turnover ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <KpiCard icon={DollarSign} label="CA estimé total" value={`${turnover.totalEstimatedRevenue.toLocaleString()} DH`} />
                <KpiCard icon={TrendingUp} label="Moyenne mensuelle" value={`${turnover.avgMonthlyRevenue.toLocaleString()} DH`} />
                <KpiCard icon={Users} label="Missions actives" value={turnover.activeMissionsCount} />
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-[#6b7280]">Période de prévision :</label>
                <select
                  value={forecastMonths}
                  onChange={(e) => setForecastMonths(Number(e.target.value))}
                  className={inputClass}
                >
                  {MONTHS_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m} mois</option>
                  ))}
                </select>
              </div>

              {turnover.monthlyBreakdown.length > 0 && (
                <>
                  <div className={cardClass}>
                    <div className="mb-5 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-[#3b82f6]" />
                      <h2 className={sectionTitleClass}>CA prévu par mois</h2>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={turnover.monthlyBreakdown} barCategoryGap="20%">
                        <CartesianGrid {...chartGridProps} />
                        <XAxis dataKey="month" tickFormatter={formatMonth} tick={axisTickProps} />
                        <YAxis tick={axisTickProps} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={tooltipContentStyle} />
                        <Bar
                          dataKey="totalRevenue"
                          fill={colors.brandAccent}
                          radius={barRadius}
                          maxBarSize={48}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className={cardClass}>
                    <h2 className={sectionTitleClass}>Détail mensuel</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr>
                            <th className={thClass}>Mois</th>
                            <th className={thClass}>CA prévu</th>
                            <th className={thClass}>Missions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {turnover.monthlyBreakdown.map((mb) => (
                            <tr key={mb.month} className="hover:bg-[#f8f9fa] transition-colors">
                              <td className={tdClass}>{formatMonth(mb.month)}</td>
                              <td className={tdClass}>{mb.totalRevenue.toLocaleString()} DH</td>
                              <td className={tdClass}>{mb.missions.length}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              <div className={cardClass}>
                <h2 className={sectionTitleClass}>Détail par mission active</h2>
                {turnover.missions.length === 0 ? (
                  <p className="text-sm text-[#6b7280]">Aucune mission active</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className={thClass}>Mission</th>
                          <th className={thClass}>Client</th>
                          <th className={thClass}>Consultant</th>
                          <th className={thClass}>TJ</th>
                          <th className={thClass}>J/mois</th>
                          <th className={thClass}>CA/mois</th>
                          <th className={thClass}>Mois rest.</th>
                          <th className={thClass}>CA total est.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {turnover.missions.map((m) => (
                          <tr key={m.missionId} className="hover:bg-[#f8f9fa] transition-colors">
                            <td className={tdClass}>{m.missionTitle}</td>
                            <td className={tdClass}>{m.clientName}</td>
                            <td className={tdClass}>{m.consultantName}</td>
                            <td className={tdClass}>{m.dailyRate} DH</td>
                            <td className={tdClass}>{m.estimatedDaysPerMonth}</td>
                            <td className={tdClass}>{m.estimatedRevenuePerMonth.toLocaleString()} DH</td>
                            <td className={tdClass}>{m.monthsRemaining}</td>
                            <td className={cn(tdClass, 'font-semibold text-[#111111]')}>{m.totalEstimatedRevenue.toLocaleString()} DH</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-[#6b7280]">Impossible de charger les prévisions.</p>
          )}
        </div>
      )}

      {tab === 'margin' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-[#6b7280]">Du :</label>
              <input
                type="date"
                value={marginStartDate}
                onChange={(e) => setMarginStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-[#6b7280]">Au :</label>
              <input
                type="date"
                value={marginEndDate}
                onChange={(e) => setMarginEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {marginLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-[12px] bg-[#e5e7eb]" />
              ))}
            </div>
          ) : margin ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard icon={DollarSign} label="Revenu total (HT)" value={`${margin.summary.totalRevenue.toLocaleString()} DH`} />
                <KpiCard icon={Wallet} label="Total versé (consult.)" value={`${margin.summary.totalPayouts.toLocaleString()} DH`} />
                <KpiCard icon={ArrowUpRight} label="Marge cabinet" value={`${margin.summary.cabinetMargin.toLocaleString()} DH`} />
                <KpiCard
                  icon={PieChart}
                  label="Taux moyen de marge"
                  value={`${margin.summary.marginPercentage.toFixed(1)}%`}
                  className={marginColorClass(margin.summary.marginPercentage)}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className={cardClass}>
                  <h2 className={sectionTitleClass}>Par client</h2>
                  {margin.byClient.length === 0 ? (
                    <p className="text-sm text-[#6b7280]">Aucune donnée</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr>
                            <th className={thClass}>Client</th>
                            <th className={thClass}>CA</th>
                            <th className={thClass}>Versé</th>
                            <th className={thClass}>Marge</th>
                            <th className={thClass}>Taux</th>
                          </tr>
                        </thead>
                        <tbody>
                          {margin.byClient.map((c) => (
                            <tr key={c.clientId} className="hover:bg-[#f8f9fa] transition-colors">
                              <td className={cn(tdClass, 'font-medium text-[#111111]')}>{c.clientName}</td>
                              <td className={tdClass}>{c.totalRevenue.toLocaleString()} DH</td>
                              <td className={tdClass}>{c.totalPayout.toLocaleString()} DH</td>
                              <td className={cn(tdClass, 'font-medium', marginColorClass(c.marginPercentage))}>
                                {c.margin.toLocaleString()} DH
                              </td>
                              <td className={tdClass}>
                                <span className={cn('font-medium', marginColorClass(c.marginPercentage))}>
                                  {c.marginPercentage.toFixed(1)}%
                                </span>
                                <MiniBar pct={c.marginPercentage} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className={cardClass}>
                  <h2 className={sectionTitleClass}>Par consultant</h2>
                  {margin.byConsultant.length === 0 ? (
                    <p className="text-sm text-[#6b7280]">Aucune donnée</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr>
                            <th className={thClass}>Consultant</th>
                            <th className={thClass}>CA généré</th>
                            <th className={thClass}>Versé</th>
                            <th className={thClass}>Marge</th>
                            <th className={thClass}>Taux</th>
                          </tr>
                        </thead>
                        <tbody>
                          {margin.byConsultant.map((c) => (
                            <tr key={c.consultantId} className="hover:bg-[#f8f9fa] transition-colors">
                              <td className={cn(tdClass, 'font-medium text-[#111111]')}>{c.consultantName}</td>
                              <td className={tdClass}>{c.totalRevenue.toLocaleString()} DH</td>
                              <td className={tdClass}>{c.totalPayout.toLocaleString()} DH</td>
                              <td className={cn(tdClass, 'font-medium', marginColorClass(c.marginPercentage))}>
                                {c.margin.toLocaleString()} DH
                              </td>
                              <td className={tdClass}>
                                <span className={cn('font-medium', marginColorClass(c.marginPercentage))}>
                                  {c.marginPercentage.toFixed(1)}%
                                </span>
                                <MiniBar pct={c.marginPercentage} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {margin.monthlyTrend.length > 0 && (
                <div className={cardClass}>
                  <div className="mb-5 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#3b82f6]" />
                    <h2 className={sectionTitleClass}>Évolution mensuelle de la marge</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={margin.monthlyTrend} barCategoryGap="16%">
                      <CartesianGrid {...chartGridProps} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.muted }} />
                      <YAxis yAxisId="left" tick={axisTickProps} />
                      <YAxis yAxisId="right" orientation="right" tick={axisTickProps} domain={[0, 100]} />
                      <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={tooltipContentStyle} />
                      <Legend
                        wrapperStyle={{ fontSize: 13, paddingTop: 12 }}
                        iconType="rect"
                        iconSize={10}
                      />
                      <Bar yAxisId="left" dataKey="totalRevenue" name="Revenu" fill={colors.brandAccent} radius={barRadius} maxBarSize={36} />
                      <Bar yAxisId="left" dataKey="totalPayouts" name="Versé" fill={colors.hairline} radius={barRadius} maxBarSize={36} />
                      <Line
                        yAxisId="right"
                        dataKey="marginPercentage"
                        name="Taux de marge (%)"
                        stroke={colors.success}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#ffffff', stroke: colors.success, strokeWidth: 2.5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[#6b7280">Impossible de charger les données de marge.</p>
          )}
        </div>
      )}
    </div>
  );
}
