import { useState } from 'react';
import { useTurnoverForecast, useMarginForecast } from '../../../hooks/manager/useAdvancedTracking';

export default function ForecastsPage() {
  const [tab, setTab] = useState<'turnover' | 'margin'>('turnover');
  const [forecastMonths, setForecastMonths] = useState(6);

  const { data: turnoverData, isLoading: turnoverLoading } = useTurnoverForecast(forecastMonths);
  const { data: marginData, isLoading: marginLoading } = useMarginForecast();

  const turnover = turnoverData?.data;
  const margin = marginData?.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#111111]">Prévisions et Rentabilité</h1>

      <div className="flex gap-2 border-b border-[#e5e7eb]">
        <button
          onClick={() => setTab('turnover')}
          className={`cursor-pointer px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'turnover'
              ? 'border-b-2 border-[#111111] text-[#111111]'
              : 'text-[#6b7280] hover:text-[#111111]'
          }`}
        >
          Chiffre d'affaires
        </button>
        <button
          onClick={() => setTab('margin')}
          className={`cursor-pointer px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'margin'
              ? 'border-b-2 border-[#111111] text-[#111111]'
              : 'text-[#6b7280] hover:text-[#111111]'
          }`}
        >
          Marge cabinet
        </button>
      </div>

      {tab === 'turnover' && (
        <div className="space-y-6">
          {turnoverLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-[12px] bg-[#e5e7eb]" />
              ))}
            </div>
          ) : turnover ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-[12px] bg-[#f5f5f5] p-6">
                  <p className="text-sm text-[#6b7280]">CA estimé total</p>
                  <p className="mt-1 text-2xl font-semibold text-[#111111]">
                    {turnover.totalEstimatedRevenue.toLocaleString()} DH
                  </p>
                </div>
                <div className="rounded-[12px] bg-[#f5f5f5] p-6">
                  <p className="text-sm text-[#6b7280]">Moyenne mensuelle</p>
                  <p className="mt-1 text-2xl font-semibold text-[#111111]">
                    {turnover.avgMonthlyRevenue.toLocaleString()} DH
                  </p>
                </div>
                <div className="rounded-[12px] bg-[#f5f5f5] p-6">
                  <p className="text-sm text-[#6b7280]">Missions actives</p>
                  <p className="mt-1 text-2xl font-semibold text-[#111111]">
                    {turnover.activeMissionsCount}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm text-[#6b7280]">Période de prévision :</label>
                <select
                  value={forecastMonths}
                  onChange={(e) => setForecastMonths(Number(e.target.value))}
                  className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                >
                  <option value={3}>3 mois</option>
                  <option value={6}>6 mois</option>
                  <option value={12}>12 mois</option>
                </select>
              </div>

              <div className="rounded-[12px] bg-[#f5f5f5] p-6">
                <h2 className="mb-4 text-lg font-semibold text-[#111111]">Détail par mission active</h2>
                {turnover.missions.length === 0 ? (
                  <p className="text-sm text-[#6b7280]">Aucune mission active</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[#e5e7eb]">
                          <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Mission</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Client</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Consultant</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">TJ</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">J/mois</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">CA/mois</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Mois rest.</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">CA total est.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {turnover.missions.map((m) => (
                          <tr key={m.missionId} className="border-b border-[#e5e7eb]">
                            <td className="px-3 py-2 font-medium text-[#111111]">{m.missionTitle}</td>
                            <td className="px-3 py-2 text-[#6b7280]">{m.clientName}</td>
                            <td className="px-3 py-2 text-[#6b7280]">{m.consultantName}</td>
                            <td className="px-3 py-2 text-[#111111]">{m.dailyRate} DH</td>
                            <td className="px-3 py-2 text-[#111111]">{m.estimatedDaysPerMonth}</td>
                            <td className="px-3 py-2 text-[#111111]">{m.estimatedRevenuePerMonth.toLocaleString()} DH</td>
                            <td className="px-3 py-2 text-[#111111]">{m.monthsRemaining}</td>
                            <td className="px-3 py-2 font-semibold text-[#111111]">{m.totalEstimatedRevenue.toLocaleString()} DH</td>
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
          {marginLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-[12px] bg-[#e5e7eb]" />
              ))}
            </div>
          ) : margin ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[12px] bg-[#f5f5f5] p-6">
                  <p className="text-sm text-[#6b7280]">Revenu total</p>
                  <p className="mt-1 text-2xl font-semibold text-[#111111]">
                    {margin.summary.totalRevenue.toLocaleString()} DH
                  </p>
                </div>
                <div className="rounded-[12px] bg-[#f5f5f5] p-6">
                  <p className="text-sm text-[#6b7280]">Total payouts</p>
                  <p className="mt-1 text-2xl font-semibold text-[#111111]">
                    {margin.summary.totalPayouts.toLocaleString()} DH
                  </p>
                </div>
                <div className="rounded-[12px] bg-[#f5f5f5] p-6">
                  <p className="text-sm text-[#6b7280]">Marge cabinet</p>
                  <p className="mt-1 text-2xl font-semibold text-[#111111]">
                    {margin.summary.cabinet_margin.toLocaleString()} DH
                  </p>
                </div>
                <div className="rounded-[12px] bg-[#f5f5f5] p-6">
                  <p className="text-sm text-[#6b7280]">Taux de marge</p>
                  <p className="mt-1 text-2xl font-semibold text-[#111111]">
                    {margin.summary.marginPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-[12px] bg-[#f5f5f5] p-6">
                  <h2 className="mb-4 text-lg font-semibold text-[#111111]">Par client</h2>
                  {margin.byClient.length === 0 ? (
                    <p className="text-sm text-[#6b7280]">Aucune donnée</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-[#e5e7eb]">
                            <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Client</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">CA</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Factures</th>
                          </tr>
                        </thead>
                        <tbody>
                          {margin.byClient.map((c) => (
                            <tr key={c.clientId} className="border-b border-[#e5e7eb]">
                              <td className="px-3 py-2 font-medium text-[#111111]">{c.clientName}</td>
                              <td className="px-3 py-2 text-[#111111]">{c.totalRevenue.toLocaleString()} DH</td>
                              <td className="px-3 py-2 text-[#111111]">{c.invoiceCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="rounded-[12px] bg-[#f5f5f5] p-6">
                  <h2 className="mb-4 text-lg font-semibold text-[#111111]">Par consultant</h2>
                  {margin.byConsultant.length === 0 ? (
                    <p className="text-sm text-[#6b7280]">Aucune donnée</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-[#e5e7eb]">
                            <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Consultant</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280]">Total payé</th>
                          </tr>
                        </thead>
                        <tbody>
                          {margin.byConsultant.map((c) => (
                            <tr key={c.consultantId} className="border-b border-[#e5e7eb]">
                              <td className="px-3 py-2 font-medium text-[#111111]">{c.consultantName}</td>
                              <td className="px-3 py-2 text-[#111111]">{c.totalPayout.toLocaleString()} DH</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#6b7280]">Impossible de charger les données de marge.</p>
          )}
        </div>
      )}
    </div>
  );
}
