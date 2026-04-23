import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { UserPortalChartEmpty } from '../../components/user-portal/UserPortalEmptyState';
import { AppCard } from '../../components/station-admin/Primitives';
import { useAuth } from '../../context/AuthContext';
import {
  fetchUserAnalyticsViews,
  type UserAnalyticsPeriod,
  type UserAnalyticsViewsResponse,
} from '../../api/userAnalytics';
import { userFacingApiErrorMessage } from '../../api/http';
import {
  userPortalListPageShell,
  userPortalPageHeaderRow,
  userPortalPageTitle,
  userPortalTabActive,
  userPortalTabBar,
  userPortalTabIdle,
} from '../../styles/userPortalTheme';

function ChartLineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3 3v18h18M7 15l3-3 4 4 5-7"
      />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 19V9m4 10V5m4 14v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function pctChange(curr: number, prev: number): string | null {
  if (prev === 0) return curr === 0 ? null : '—';
  const p = ((curr - prev) / prev) * 100;
  if (!Number.isFinite(p)) return null;
  const sign = p > 0 ? '+' : '';
  return `${sign}${p.toFixed(1)}%`;
}

const PERIOD_OPTIONS: { value: UserAnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7 днів' },
  { value: '30d', label: '30 днів' },
  { value: 'all', label: 'Увесь час' },
];

export default function UserAnalyticsPage() {
  const { user } = useAuth();
  const userId = Number(user?.id);

  const [period, setPeriod] = useState<UserAnalyticsPeriod>('30d');
  const [data, setData] = useState<UserAnalyticsViewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(userId) || userId <= 0) {
      setLoading(false);
      setError('Увійдіть у кабінет, щоб переглянути аналітику.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUserAnalyticsViews(userId, period);
      setData(res);
    } catch (e) {
      setData(null);
      setError(userFacingApiErrorMessage(e, 'Не вдалося завантажити аналітику.'));
    } finally {
      setLoading(false);
    }
  }, [userId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const periodLabel = useMemo(
    () => PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period,
    [period]
  );

  const byStationChart = useMemo(() => {
    const rows = data?.stationsInPeriod ?? [];
    return rows.map((r) => ({
      label: r.stationName.length > 18 ? `${r.stationName.slice(0, 17)}…` : r.stationName,
      kwh: Math.round(r.kwh * 10) / 10,
      spent: Math.round(r.spent * 100) / 100,
    }));
  }, [data?.stationsInPeriod]);

  const prev = data?.previousPeriodSummary;

  return (
    <div className={`space-y-6 ${userPortalListPageShell}`}>
      <div className={userPortalPageHeaderRow}>
        <div>
          <h1 className={userPortalPageTitle}>Аналітика</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Підсумки за період: SQL-функції з <code className="rounded bg-slate-100 px-1">User_analytics.sql</code> (сесії,
            графіки, ТОП станцій, бронювання); блоки з SQL VIEW — порівняння тижнів, авто, улюблені станції, активні сесії
            та майбутні бронювання.
          </p>
        </div>
        <div className={userPortalTabBar} role="tablist" aria-label="Період аналітики">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={period === o.value}
              className={period === o.value ? userPortalTabActive : userPortalTabIdle}
              onClick={() => setPeriod(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <AppCard className="!border-red-200 !bg-red-50/80 !p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </AppCard>
      ) : null}

      {loading ? (
        <AppCard className="!p-6">
          <p className="text-sm text-slate-600">Завантаження…</p>
        </AppCard>
      ) : null}

      {!loading && data?.partial ? (
        <AppCard className="!border-amber-200 !bg-amber-50/80 !p-4">
          <p className="text-sm text-amber-900">
            Частина даних недоступна (перевірте <code className="rounded bg-white/60 px-1">View.sql</code> та{" "}
            <code className="rounded bg-white/60 px-1">User_analytics.sql</code> у БД).
          </p>
        </AppCard>
      ) : null}

      {!loading && data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <AppCard className="!p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Сесій ({periodLabel})</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{data.periodSummary.sessionCount}</p>
              {prev ? (
                <p className="mt-1 text-xs text-slate-500">
                  Попереднє вікно: {prev.sessionCount}
                  {(() => {
                    const p = pctChange(data.periodSummary.sessionCount, prev.sessionCount);
                    return p ? (
                      <span className="ml-1 font-medium text-slate-700">({p})</span>
                    ) : null;
                  })()}
                </p>
              ) : null}
            </AppCard>
            <AppCard className="!p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Енергія ({periodLabel})</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                {data.periodSummary.totalKwh.toFixed(1)} кВт·год
              </p>
              {prev ? (
                <p className="mt-1 text-xs text-slate-500">
                  Попереднє вікно: {prev.totalKwh.toFixed(1)} кВт·год
                  {(() => {
                    const p = pctChange(data.periodSummary.totalKwh, prev.totalKwh);
                    return p ? <span className="ml-1 font-medium text-slate-700">({p})</span> : null;
                  })()}
                </p>
              ) : null}
            </AppCard>
            <AppCard className="!p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Сума рахунків ({periodLabel})</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-green-700">
                {data.periodSummary.totalSpent.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн
              </p>
              {prev ? (
                <p className="mt-1 text-xs text-slate-500">
                  Попереднє вікно:{' '}
                  {prev.totalSpent.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн
                  {(() => {
                    const p = pctChange(data.periodSummary.totalSpent, prev.totalSpent);
                    return p ? <span className="ml-1 font-medium text-slate-700">({p})</span> : null;
                  })()}
                </p>
              ) : null}
            </AppCard>
          </div>

          {data.bookingPeriod && data.bookingPeriod.totalBookings > 0 ? (
            <AppCard className="!p-5">
              <h2 className="text-sm font-semibold text-slate-900">Бронювання за період</h2>
              <p className="mt-1 text-xs text-slate-500">
                <code className="rounded bg-slate-100 px-1">GetUserBookingStatsForPeriod</code> — інтервал збігається з
                підсумками сесій вище.
              </p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <dt className="text-xs text-slate-500">Усього</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {data.bookingPeriod.totalBookings}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <dt className="text-xs text-slate-500">Завершені</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {data.bookingPeriod.cntCompleted}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <dt className="text-xs text-slate-500">Пропущені / скасовані</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {data.bookingPeriod.cntMissed + data.bookingPeriod.cntCancelled}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <dt className="text-xs text-slate-500">% завершених</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {data.bookingPeriod.pctCompleted != null
                      ? `${data.bookingPeriod.pctCompleted.toFixed(1)}%`
                      : '—'}
                  </dd>
                </div>
              </dl>
            </AppCard>
          ) : null}

          {data.comparison ? (
            <AppCard className="!p-5">
              <h2 className="text-sm font-semibold text-slate-900">VIEW: порівняння тижнів і місяць</h2>
              <p className="mt-1 text-xs text-slate-500">
                <code className="rounded bg-slate-100 px-1">View_UserAnalyticsComparison</code> — фіксовані вікна в
                БД (останні / попередні 7 днів за сумами рахунків; kWh з початку календарного місяця).
              </p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <dt className="text-xs text-slate-500">Витрати, останні 7 днів</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {num(data.comparison.money_last_7d).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <dt className="text-xs text-slate-500">Витрати, попередні 7 днів</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {num(data.comparison.money_prev_7d).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <dt className="text-xs text-slate-500">kWh з початку місяця</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {num(data.comparison.energy_this_month).toFixed(1)} кВт·год
                  </dd>
                </div>
              </dl>
            </AppCard>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <AppCard>
              <h2 className="text-sm font-semibold text-slate-900">Витрати по періоду</h2>
              <p className="mt-1 text-xs text-slate-500">
                {period === 'all' ? 'По місяцях (до 48 точок)' : 'По днях у межах обраного вікна'}
              </p>
              <div className="mt-4 h-64">
                {data.trend.length === 0 ? (
                  <UserPortalChartEmpty
                    icon={<ChartLineIcon className="h-6 w-6" />}
                    description="Немає сесій за цей період"
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9ca3af" interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <Tooltip
                        formatter={(v) => [`${Number(v ?? 0).toLocaleString('uk-UA')} грн`, 'Витрати']}
                        contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      />
                      <Line type="monotone" dataKey="spend" stroke="#16a34a" strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </AppCard>
            <AppCard>
              <h2 className="text-sm font-semibold text-slate-900">Енергія по періоду</h2>
              <p className="mt-1 text-xs text-slate-500">Ті самі інтервали, що й для витрат</p>
              <div className="mt-4 h-64">
                {data.trend.length === 0 ? (
                  <UserPortalChartEmpty
                    icon={<ChartBarIcon className="h-6 w-6" />}
                    description="Немає даних за обраний період"
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9ca3af" interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="kwh" fill="#86efac" radius={[6, 6, 0, 0]} name="кВт·год" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </AppCard>
          </div>

          <AppCard>
            <h2 className="text-sm font-semibold text-slate-900">Станції за період «{periodLabel}»</h2>
            <p className="mt-1 text-xs text-slate-500">Агрегат сесій і рахунків (не окремий VIEW)</p>
            <div className="mt-4 h-72">
              {byStationChart.length === 0 ? (
                <UserPortalChartEmpty
                  icon={<ChartBarIcon className="h-6 w-6" />}
                  description="Немає зарядок на станціях у цьому вікні"
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byStationChart} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 9 }} stroke="#9ca3af" />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="kwh" fill="#22c55e" radius={[0, 6, 6, 0]} name="кВт·год" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </AppCard>

          <AppCard className="!p-0 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">VIEW: статистика по авто</h2>
              <p className="mt-1 text-xs text-slate-500">
                <code className="rounded bg-slate-100 px-1">View_UserVehicleStats</code> — усі часи + зарядки за 30
                днів (поля VIEW).
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Авто</th>
                    <th className="px-5 py-3">Номер</th>
                    <th className="px-5 py-3 text-right">Сесій (усі)</th>
                    <th className="px-5 py-3 text-right">kWh (усі)</th>
                    <th className="px-5 py-3 text-right">За 30 дн.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.vehicleStats.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                        Немає прив’язаних авто або сесій
                      </td>
                    </tr>
                  ) : (
                    data.vehicleStats.map((row, i) => (
                      <tr key={`${String(row.license_plate)}-${i}`} className="text-slate-800">
                        <td className="px-5 py-3 font-medium">{String(row.car_name ?? '—')}</td>
                        <td className="px-5 py-3 tabular-nums text-slate-600">{String(row.license_plate ?? '')}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{num(row.total_charges)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{num(row.total_kwh).toFixed(1)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{num(row.charges_last_30d)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </AppCard>

          <AppCard className="!p-0 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">VIEW: улюблені станції (90 днів)</h2>
              <p className="mt-1 text-xs text-slate-500">
                <code className="rounded bg-slate-100 px-1">View_UserStationLoyalty</code> — лише сесії з рахунком,
                топ-10 за рангом.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">#</th>
                    <th className="px-5 py-3">Станція</th>
                    <th className="px-5 py-3 text-right">Візитів</th>
                    <th className="px-5 py-3 text-right">kWh</th>
                    <th className="px-5 py-3 text-right">Сума</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.stationLoyalty.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                        Немає даних за 90 днів з оплаченими рахунками
                      </td>
                    </tr>
                  ) : (
                    data.stationLoyalty.map((row, i) => (
                      <tr key={`${String(row.station_id)}-${i}`} className="text-slate-800">
                        <td className="px-5 py-3 tabular-nums text-slate-500">{num(row.preference_rank)}</td>
                        <td className="px-5 py-3 font-medium">{String(row.station_name ?? '')}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{num(row.visit_count)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{num(row.total_energy).toFixed(1)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {num(row.total_spent).toLocaleString('uk-UA', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </AppCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <AppCard className="!p-5">
              <h2 className="text-sm font-semibold text-slate-900">VIEW: активні зарядки</h2>
              <p className="mt-1 text-xs text-slate-500">
                <code className="rounded bg-slate-100 px-1">View_ActiveSessions</code>
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                {data.activeSessions.length === 0 ? (
                  <li className="text-slate-500">Немає активних сесій</li>
                ) : (
                  data.activeSessions.map((s, idx) => (
                    <li
                      key={String(s.session_id ?? s.sessionId ?? `as-${idx}`)}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                    >
                      <span className="font-medium text-slate-900">{String(s.station_name ?? '')}</span>
                      <span className="ml-2 text-slate-500">
                        порт {num(s.port_number ?? s.portNumber)} · {num(s.kwh_consumed ?? s.kwhConsumed).toFixed(2)}{' '}
                        kWh
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </AppCard>
            <AppCard className="!p-5">
              <h2 className="text-sm font-semibold text-slate-900">VIEW: майбутні бронювання</h2>
              <p className="mt-1 text-xs text-slate-500">
                <code className="rounded bg-slate-100 px-1">View_UpcomingBookings</code>
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                {data.upcomingBookings.length === 0 ? (
                  <li className="text-slate-500">Немає запланованих бронювань</li>
                ) : (
                  data.upcomingBookings.map((b, idx) => (
                    <li
                      key={String(b.booking_id ?? b.bookingId ?? `ub-${idx}`)}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                    >
                      <span className="font-medium text-slate-900">{String(b.station_name ?? '')}</span>
                      <span className="ml-2 text-slate-500">
                        {String(b.start_time ?? b.startTime ?? '').slice(0, 16).replace('T', ' ')}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </AppCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
