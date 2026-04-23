import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStationAdminNetwork } from '../../context/StationAdminNetworkContext';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStations } from '../../context/StationsContext';
import {
  fetchAdminAnalyticsViews,
  num,
  str,
  type AdminAnalyticsViewsResponse,
  type StationAdminAnalyticsPeriod,
} from '../../api/adminAnalytics';
import {
  userPortalTabActive,
  userPortalTabBar,
  userPortalTabIdle,
} from '../../styles/userPortalTheme';
import { ApiError } from '../../api/http';
import { StatusPill } from '../../components/station-admin/Primitives';
import { AdminAccentCard, AdminAccentRow } from '../../components/admin/AdminAccentCard';
import { stationStatusLabel, stationStatusTone } from '../../utils/stationLabels';
import {
  stationAdminLinkAccent,
  stationAdminLoadingBanner,
  stationAdminLoadingSpinner,
  stationAdminPageTitle,
  stationAdminUnderlineTabActive,
  stationAdminUnderlineTabIdle,
} from '../../styles/stationAdminTheme';

function shortLabel(name: string, max = 20) {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

type AnalyticsTab = 'trends' | 'stations';

const tabClass = (active: boolean) =>
  active ? stationAdminUnderlineTabActive : stationAdminUnderlineTabIdle;

const SQL_PERIOD_OPTIONS: { value: StationAdminAnalyticsPeriod; label: string }[] = [
  { value: 'today', label: 'Сьогодні' },
  { value: '7d', label: '7 днів' },
  { value: '30d', label: '30 днів' },
  { value: 'all', label: 'Увесь час' },
];

function sqlPeriodRangePhrase(snap: NonNullable<AdminAnalyticsViewsResponse['stationAdminSnapshot']>): string {
  if (snap.period === 'all') return 'Увесь час';
  const label = SQL_PERIOD_OPTIONS.find((o) => o.value === snap.period)?.label;
  if (snap.period === 'today') return label ?? 'Сьогодні';
  if (snap.periodDays != null) return `${label ?? 'Період'} · ~${snap.periodDays} дн.`;
  return label ?? 'Період';
}

export default function StationAnalyticsPage() {
  const { stations } = useStations();
  const { bookingsTotal, sessions, loading: networkLoading } = useStationAdminNetwork();
  const [tab, setTab] = useState<AnalyticsTab>('trends');
  const [analyticsData, setAnalyticsData] = useState<AdminAnalyticsViewsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [sqlPeriod, setSqlPeriod] = useState<StationAdminAnalyticsPeriod>('30d');
  /** Який `stationId` передавати в SQL-зріз: мережа, перша активна або обрана станція. */
  const [sqlPick, setSqlPick] = useState<'auto' | 'network' | number>('auto');

  const activeStations = useMemo(() => stations.filter((s) => !s.archived), [stations]);
  const firstActiveId = activeStations[0]?.id;
  const sqlStationQueryParam =
    sqlPick === 'network' ? undefined : sqlPick === 'auto' ? firstActiveId : sqlPick;

  useEffect(() => {
    let cancelled = false;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    void fetchAdminAnalyticsViews(sqlStationQueryParam, sqlPeriod)
      .then((d) => {
        if (!cancelled) setAnalyticsData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setAnalyticsData(null);
          setAnalyticsError(e instanceof ApiError ? e.message : 'Не вдалося завантажити аналітику з БД');
        }
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sqlStationQueryParam, sqlPeriod]);

  const cityChart = useMemo(() => {
    return [...(analyticsData?.cityPerformance ?? [])]
      .map((r) => ({
        city: str(r.city).slice(0, 22),
        fullCity: str(r.city),
        revenue: num(r.total_revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 14);
  }, [analyticsData?.cityPerformance]);

  /** Ті самі дані, що в таблиці «ТОП станцій» нижче — з Station_admin_analytics.sql. */
  const sqlTopStationsChart = useMemo(() => {
    const rows = analyticsData?.stationAdminSnapshot?.networkTopStations ?? [];
    return rows.slice(0, 12).map((r) => ({
      label: shortLabel(str(r.station_name), 18),
      fullName: str(r.station_name),
      sessions: num(r.session_count),
    }));
  }, [analyticsData?.stationAdminSnapshot?.networkTopStations]);

  const statusSummary = useMemo(
    () => [
      {
        name: 'Працює',
        count: activeStations.filter((s) => s.status === 'working').length,
        fill: '#22c55e',
      },
      {
        name: 'Оффлайн',
        count: activeStations.filter((s) => s.status === 'offline').length,
        fill: '#9ca3af',
      },
      {
        name: 'Обслуговування',
        count: activeStations.filter((s) => s.status === 'maintenance').length,
        fill: '#f59e0b',
      },
    ],
    [activeStations]
  );

  const perStation = useMemo(
    () =>
      [...activeStations]
        .sort((a, b) => b.todayRevenue - a.todayRevenue)
        .map((s) => ({
          id: s.id,
          label: shortLabel(s.name),
          fullName: s.name,
          city: s.city,
          status: s.status,
          revenue: s.todayRevenue,
          sessions: s.todaySessions,
          energy: s.energyByHour.reduce((x, y) => x + y, 0),
          ports: s.ports.length,
        })),
    [activeStations]
  );

  const totalStations = activeStations.length;
  const todayRev = activeStations.reduce((a, s) => a + s.todayRevenue, 0);
  const todaySess = activeStations.reduce((a, s) => a + s.todaySessions, 0);

  const sessionEnergyTotal = useMemo(
    () => sessions.reduce((a, s) => a + s.kwh, 0),
    [sessions]
  );
  const sessionCostTotal = useMemo(
    () => sessions.reduce((a, s) => a + (s.cost ?? 0), 0),
    [sessions]
  );

  const snap = analyticsData?.stationAdminSnapshot;
  const peakByHourSql = useMemo(() => {
    const rows = snap?.stationDetail?.peakHours ?? [];
    const acc = new Map<number, number>();
    for (const r of rows) {
      const h = Math.floor(num(r.hour_of_day));
      if (h < 0 || h > 23) continue;
      acc.set(h, (acc.get(h) ?? 0) + num(r.session_count));
    }
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}:00`,
      sessions: acc.get(h) ?? 0,
    }));
  }, [snap?.stationDetail?.peakHours]);

  const sqlPeriodLabel = useMemo(() => {
    if (!snap?.periodFrom || !snap?.periodTo) return '';
    try {
      const a = new Date(snap.periodFrom).toLocaleDateString('uk-UA');
      const b = new Date(snap.periodTo).toLocaleDateString('uk-UA');
      return `${a} — ${b}`;
    } catch {
      return '';
    }
  }, [snap?.periodFrom, snap?.periodTo]);

  const sqlDetailStationName = useMemo(() => {
    if (snap?.stationId == null) return '';
    return activeStations.find((s) => s.id === snap.stationId)?.name ?? '';
  }, [snap?.stationId, activeStations]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className={stationAdminPageTitle}>Аналітика</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Вікно дат для блоку SQL (мережа та станція) збігається з персональною аналітикою користувача: доба з
            00:00, 7/30 днів до початку завтра, «увесь час» — від 1970-01-01.
          </p>
        </div>
        <div className={userPortalTabBar} role="tablist" aria-label="Період SQL-аналітики">
          {SQL_PERIOD_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={sqlPeriod === o.value}
              disabled={analyticsLoading}
              className={sqlPeriod === o.value ? userPortalTabActive : userPortalTabIdle}
              onClick={() => setSqlPeriod(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </header>

      {analyticsLoading ? (
        <div className={stationAdminLoadingBanner}>
          <span className={stationAdminLoadingSpinner} />
          Завантаження аналітики з БД…
        </div>
      ) : null}

      {analyticsError ? (
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-medium">{analyticsError}</p>
          <p className="mt-2 text-amber-900/85">
            Переконайтеся, що у PostgreSQL застосовано{' '}
            <code className="rounded-md bg-white/80 px-1.5 py-0.5 text-xs font-mono">View.sql</code> та{' '}
            <code className="rounded-md bg-white/80 px-1.5 py-0.5 text-xs font-mono">
              Station_admin_analytics.sql
            </code>
            .
          </p>
        </div>
      ) : null}

      {analyticsData?.partial ? (
        <p className="text-xs text-gray-500">Частина джерел могла бути недоступна — див. журнал сервера.</p>
      ) : null}

      {!analyticsLoading && snap ? (
        <section aria-labelledby="station-sql-analytics-heading" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="station-sql-analytics-heading" className="text-sm font-semibold text-slate-900">
                Бронювання та завантаженість (SQL)
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {sqlPeriodRangePhrase(snap)}
                {sqlPeriodLabel ? ` · ${sqlPeriodLabel}` : ''}
              </p>
            </div>
            <label className="block text-xs font-medium text-gray-600 sm:text-right">
              Деталізація по станції
              <select
                className="mt-1 block w-full min-w-[14rem] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 sm:ml-auto sm:max-w-xs"
                value={
                  sqlPick === 'auto' ? 'auto' : sqlPick === 'network' ? 'network' : String(sqlPick)
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'auto') setSqlPick('auto');
                  else if (v === 'network') setSqlPick('network');
                  else setSqlPick(Number.parseInt(v, 10));
                }}
              >
                <option value="auto">Перша активна (за списком)</option>
                <option value="network">Лише мережа</option>
                {activeStations.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {snap.networkBookingKpis ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AdminAccentCard>
                <AdminAccentRow>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Броні (мережа)</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                    {num(snap.networkBookingKpis.total_bookings).toLocaleString('uk-UA')}
                  </p>
                </AdminAccentRow>
              </AdminAccentCard>
              <AdminAccentCard>
                <AdminAccentRow>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Завершені, %</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-green-700">
                    {snap.networkBookingKpis.pct_completed == null
                      ? '—'
                      : `${num(snap.networkBookingKpis.pct_completed).toFixed(1)} %`}
                  </p>
                </AdminAccentRow>
              </AdminAccentCard>
              <AdminAccentCard>
                <AdminAccentRow>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">No-show, %</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-amber-800">
                    {snap.networkBookingKpis.no_show_rate == null
                      ? '—'
                      : `${num(snap.networkBookingKpis.no_show_rate).toFixed(1)} %`}
                  </p>
                </AdminAccentRow>
              </AdminAccentCard>
              <AdminAccentCard>
                <AdminAccentRow>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Скасовано</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-700">
                    {num(snap.networkBookingKpis.cnt_cancelled).toLocaleString('uk-UA')}
                  </p>
                </AdminAccentRow>
              </AdminAccentCard>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminAccentCard className="overflow-hidden">
              <AdminAccentRow>
                <h3 className="text-sm font-semibold text-slate-900">ТОП станцій за сесіями</h3>
              </AdminAccentRow>
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full min-w-[280px] text-left text-sm">
                  <thead className="bg-gray-50/90 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Станція</th>
                      <th className="px-4 py-2 text-right">Сесії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(snap.networkTopStations ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                          Немає даних
                        </td>
                      </tr>
                    ) : (
                      snap.networkTopStations.map((r) => (
                        <tr key={`top-${num(r.station_id)}`} className="bg-white">
                          <td className="px-4 py-2 font-medium text-slate-900">{str(r.station_name)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-800">
                            {num(r.session_count).toLocaleString('uk-UA')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </AdminAccentCard>
            <AdminAccentCard className="overflow-hidden">
              <AdminAccentRow>
                <h3 className="text-sm font-semibold text-slate-900">Найменше сесій</h3>
              </AdminAccentRow>
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full min-w-[280px] text-left text-sm">
                  <thead className="bg-gray-50/90 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Станція</th>
                      <th className="px-4 py-2 text-right">Сесії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(snap.networkBottomStations ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                          Немає даних
                        </td>
                      </tr>
                    ) : (
                      snap.networkBottomStations.map((r) => (
                        <tr key={`bot-${num(r.station_id)}`} className="bg-white">
                          <td className="px-4 py-2 font-medium text-slate-900">{str(r.station_name)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-800">
                            {num(r.session_count).toLocaleString('uk-UA')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </AdminAccentCard>
          </div>

          {snap.stationDetail && snap.stationId != null ? (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Станція #{snap.stationId}
                {sqlDetailStationName ? ` · ${sqlDetailStationName}` : ''}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {snap.stationDetail.sessionStats ? (
                  <>
                    <AdminAccentCard>
                      <AdminAccentRow>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сесії</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">
                          {num(snap.stationDetail.sessionStats.total_sessions).toLocaleString('uk-UA')}
                        </p>
                      </AdminAccentRow>
                    </AdminAccentCard>
                    <AdminAccentCard>
                      <AdminAccentRow>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          Середня тривалість
                        </p>
                        <p className="mt-1 text-xl font-bold tabular-nums">
                          {snap.stationDetail.sessionStats.avg_duration_minutes == null
                            ? '—'
                            : `${num(snap.stationDetail.sessionStats.avg_duration_minutes).toFixed(1)} хв`}
                        </p>
                      </AdminAccentRow>
                    </AdminAccentCard>
                    <AdminAccentCard>
                      <AdminAccentRow>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Середній kWh</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">
                          {snap.stationDetail.sessionStats.avg_kwh == null
                            ? '—'
                            : num(snap.stationDetail.sessionStats.avg_kwh).toFixed(2)}
                        </p>
                      </AdminAccentRow>
                    </AdminAccentCard>
                    <AdminAccentCard>
                      <AdminAccentRow>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Виручка</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-green-700">
                          {num(snap.stationDetail.sessionStats.total_revenue).toLocaleString('uk-UA', {
                            maximumFractionDigits: 0,
                          })}{' '}
                          грн
                        </p>
                      </AdminAccentRow>
                    </AdminAccentCard>
                  </>
                ) : null}
              </div>

              {snap.stationDetail.bookingStats ? (
                <AdminAccentCard>
                  <AdminAccentRow>
                    <h3 className="text-sm font-semibold text-slate-900">Бронювання (станція)</h3>
                  </AdminAccentRow>
                  <div className="grid gap-3 border-t border-gray-100 px-5 py-4 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-500">Усього</p>
                      <p className="font-semibold tabular-nums">
                        {num(snap.stationDetail.bookingStats.total_bookings).toLocaleString('uk-UA')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Завершені, %</p>
                      <p className="font-semibold tabular-nums text-green-700">
                        {snap.stationDetail.bookingStats.pct_completed == null
                          ? '—'
                          : `${num(snap.stationDetail.bookingStats.pct_completed).toFixed(1)} %`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">No-show, %</p>
                      <p className="font-semibold tabular-nums text-amber-800">
                        {snap.stationDetail.bookingStats.no_show_rate == null
                          ? '—'
                          : `${num(snap.stationDetail.bookingStats.no_show_rate).toFixed(1)} %`}
                      </p>
                    </div>
                  </div>
                </AdminAccentCard>
              ) : null}

              {snap.stationDetail.utilization ? (
                <AdminAccentCard>
                  <AdminAccentRow>
                    <h3 className="text-sm font-semibold text-slate-900">Проксі завантаженості</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Час зарядки COMPLETED / (порти × тривалість періоду), %
                    </p>
                  </AdminAccentRow>
                  <div className="border-t border-gray-100 px-5 py-4 text-sm">
                    <p className="text-2xl font-bold tabular-nums text-sky-700">
                      {snap.stationDetail.utilization.utilization_pct == null
                        ? '—'
                        : `${num(snap.stationDetail.utilization.utilization_pct).toFixed(1)} %`}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Порти: {num(snap.stationDetail.utilization.port_count).toLocaleString('uk-UA')} · Зарядка:{' '}
                      {num(snap.stationDetail.utilization.charging_minutes).toLocaleString('uk-UA', {
                        maximumFractionDigits: 0,
                      })}{' '}
                      хв / період{' '}
                      {num(snap.stationDetail.utilization.period_minutes).toLocaleString('uk-UA', {
                        maximumFractionDigits: 0,
                      })}{' '}
                      хв
                    </p>
                  </div>
                </AdminAccentCard>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <AdminAccentCard className="overflow-hidden">
                  <AdminAccentRow>
                    <h3 className="text-sm font-semibold text-slate-900">Порти за обраним періодом</h3>
                    <p className="mt-1 text-xs text-gray-500">Сесії, енергія та виручка по портах</p>
                  </AdminAccentRow>
                  <div className="overflow-x-auto border-t border-gray-100">
                    <table className="w-full min-w-[360px] text-left text-sm">
                      <thead className="bg-gray-50/90 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-4 py-2">#</th>
                          <th className="px-4 py-2">Конектор</th>
                          <th className="px-4 py-2 text-right">Сесії</th>
                          <th className="px-4 py-2 text-right">kWh</th>
                          <th className="px-4 py-2 text-right">грн</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(snap.stationDetail.ports ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                              Немає портів
                            </td>
                          </tr>
                        ) : (
                          snap.stationDetail.ports.map((r) => (
                            <tr key={`p-${num(r.port_number)}`} className="bg-white">
                              <td className="px-4 py-2 tabular-nums">{num(r.port_number)}</td>
                              <td className="px-4 py-2">{str(r.connector_name)}</td>
                              <td className="px-4 py-2 text-right tabular-nums">
                                {num(r.session_count).toLocaleString('uk-UA')}
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums">
                                {num(r.total_kwh).toLocaleString('uk-UA', { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums">
                                {num(r.total_revenue).toLocaleString('uk-UA', { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </AdminAccentCard>
                <AdminAccentCard className="overflow-hidden">
                  <AdminAccentRow>
                    <h3 className="text-sm font-semibold text-slate-900">Порти · 30 днів (VIEW)</h3>
                    <p className="mt-1 text-xs text-gray-500">Сесії, енергія та виручка за останні 30 днів</p>
                  </AdminAccentRow>
                  <div className="overflow-x-auto border-t border-gray-100">
                    <table className="w-full min-w-[360px] text-left text-sm">
                      <thead className="bg-gray-50/90 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-4 py-2">#</th>
                          <th className="px-4 py-2">Конектор</th>
                          <th className="px-4 py-2 text-right">Сесії</th>
                          <th className="px-4 py-2 text-right">kWh</th>
                          <th className="px-4 py-2 text-right">грн</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(snap.stationDetail.connectors ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                              Немає даних
                            </td>
                          </tr>
                        ) : (
                          snap.stationDetail.connectors.map((r, i) => (
                            <tr key={`c-${num(r.port_number)}-${i}`} className="bg-white">
                              <td className="px-4 py-2 tabular-nums">{num(r.port_number)}</td>
                              <td className="px-4 py-2">{str(r.connector_name)}</td>
                              <td className="px-4 py-2 text-right tabular-nums">
                                {num(r.session_count).toLocaleString('uk-UA')}
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums">
                                {num(r.total_kwh).toLocaleString('uk-UA', { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums">
                                {num(r.total_revenue).toLocaleString('uk-UA', { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </AdminAccentCard>
              </div>

              <AdminAccentCard>
                <AdminAccentRow>
                  <h3 className="text-sm font-semibold text-slate-900">Пікові години (старт сесій)</h3>
                  <p className="mt-1 text-xs text-gray-500">Сума по всіх днях тижня, за годиною доби</p>
                </AdminAccentRow>
                <div className="border-t border-gray-100 px-5 pb-5">
                  <div className="h-56 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={peakByHourSql} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={2} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#9ca3af" />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                        />
                        <Bar dataKey="sessions" fill="#6366f1" name="Сесії" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </AdminAccentCard>
            </div>
          ) : !analyticsLoading && sqlPick !== 'network' ? (
            <p className="text-xs text-gray-500">
              Оберіть станцію зі списку або зачекайте на завантаження контексту — деталізація SQL з’явиться, коли
              бекенд отримає валідний <code className="font-mono">stationId</code>.
            </p>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="network-activity-heading">
        <h2 id="network-activity-heading" className="mb-3 text-sm font-semibold text-slate-900">
          Активність мережі (БД)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AdminAccentCard>
            <AdminAccentRow>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Бронювання</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {networkLoading ? '…' : bookingsTotal.toLocaleString('uk-UA')}
              </p>
              <Link to="/station-dashboard/bookings" className={`mt-2 inline-block ${stationAdminLinkAccent}`}>
                Список бронювань
              </Link>
            </AdminAccentRow>
          </AdminAccentCard>
          <AdminAccentCard>
            <AdminAccentRow>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Енергія (усі сесії)</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {networkLoading
                  ? '…'
                  : `${sessionEnergyTotal.toLocaleString('uk-UA', { maximumFractionDigits: 1 })} кВт·год`}
              </p>
            </AdminAccentRow>
          </AdminAccentCard>
          <AdminAccentCard>
            <AdminAccentRow>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сума по рахунках</p>
              <p className="mt-1 text-2xl font-bold text-green-700">
                {networkLoading
                  ? '…'
                  : `${sessionCostTotal.toLocaleString('uk-UA', { maximumFractionDigits: 2 })} грн`}
              </p>
              <p className="mt-1 text-xs text-gray-500">За сесіями з виставленим bill</p>
            </AdminAccentRow>
          </AdminAccentCard>
        </div>
      </section>

      <section aria-labelledby="analytics-overview-heading">
        <h2 id="analytics-overview-heading" className="mb-3 text-sm font-semibold text-slate-900">
          Огляд мережі
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminAccentCard>
            <AdminAccentRow>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Станцій у мережі</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{totalStations}</p>
            </AdminAccentRow>
          </AdminAccentCard>
          <AdminAccentCard>
            <AdminAccentRow>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Дохід сьогодні</p>
              <p className="mt-1 text-3xl font-bold text-green-700">
                {todayRev.toLocaleString('uk-UA')} грн
              </p>
            </AdminAccentRow>
          </AdminAccentCard>
          <AdminAccentCard>
            <AdminAccentRow>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сесії сьогодні</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{todaySess}</p>
            </AdminAccentRow>
          </AdminAccentCard>
          <AdminAccentCard>
            <AdminAccentRow>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Статуси</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {statusSummary.map((s) => (
                  <span
                    key={s.name}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: s.fill }} />
                    {s.name}: {s.count}
                  </span>
                ))}
              </div>
            </AdminAccentRow>
          </AdminAccentCard>
        </div>
      </section>

      <nav
        className="-mx-1 flex gap-6 overflow-x-auto border-b border-gray-200 px-1"
        aria-label="Детальна аналітика"
      >
        <button type="button" className={tabClass(tab === 'trends')} onClick={() => setTab('trends')}>
          Тиждень
        </button>
        <button type="button" className={tabClass(tab === 'stations')} onClick={() => setTab('stations')}>
          По станціях
        </button>
      </nav>

      {tab === 'trends' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminAccentCard>
            <AdminAccentRow>
              <h2 className="text-sm font-semibold text-slate-900">Виручка по містах</h2>
             
            </AdminAccentRow>
            <div className="border-t border-gray-100 px-5 pb-5">
              <div className="h-72 pt-4">
                {cityChart.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-gray-500">
                    Немає даних для діаграми
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={cityChart}
                      margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis
                        type="category"
                        dataKey="city"
                        width={100}
                        tick={{ fontSize: 10 }}
                        stroke="#9ca3af"
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                        formatter={(v) => {
                          const n = typeof v === 'number' ? v : Number(v);
                          return [`${(Number.isFinite(n) ? n : 0).toLocaleString('uk-UA')} грн`, 'Виручка'];
                        }}
                        labelFormatter={(_, p) => (p?.[0]?.payload?.fullCity as string) ?? ''}
                      />
                      <Bar dataKey="revenue" fill="#16a34a" name="Виручка" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </AdminAccentCard>

          <AdminAccentCard>
            <AdminAccentRow>
              <h2 className="text-sm font-semibold text-slate-900">ТОП станцій за сесіями (SQL)</h2>
              <p className="mt-1 text-xs text-gray-500">
                Той самий період, що перемикач зверху (ТОП станцій за сесіями в SQL-блоці).
              </p>
            </AdminAccentRow>
            <div className="border-t border-gray-100 px-5 pb-5">
              <div className="h-72 pt-4">
                {sqlTopStationsChart.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-gray-500">
                    Немає даних SQL за обраний період або зріз ще не завантажився.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sqlTopStationsChart}
                      layout="vertical"
                      margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} stroke="#64748b" />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                        formatter={(v) => {
                          const n = typeof v === 'number' ? v : Number(v);
                          return [`${(Number.isFinite(n) ? n : 0).toLocaleString('uk-UA')}`, 'Сесій'];
                        }}
                        labelFormatter={(_, p) => (p?.[0]?.payload?.fullName as string) ?? ''}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="sessions" fill="#0ea5e9" name="Сесії" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </AdminAccentCard>
        </div>
      ) : null}

      {tab === 'stations' ? (
      <AdminAccentCard className="overflow-hidden">
        <AdminAccentRow>
          <h2 className="text-sm font-semibold text-slate-900">По кожній станції сьогодні</h2>
        </AdminAccentRow>
        <div className="grid gap-6 border-t border-gray-100 p-4 lg:grid-cols-2 lg:p-6">
          <div className="min-h-[280px]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Дохід сьогодні, грн
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                layout="vertical"
                data={perStation}
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={118}
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(v) => {
                    const n = typeof v === 'number' ? v : Number(v);
                    return [`${(Number.isFinite(n) ? n : 0).toLocaleString('uk-UA')} грн`, 'Дохід'];
                  }}
                  labelFormatter={(_, p) => (p?.[0]?.payload?.fullName as string) ?? ''}
                />
                <Bar dataKey="revenue" fill="#16a34a" name="Дохід" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="min-h-[280px]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Сесії сьогодні
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                layout="vertical"
                data={perStation}
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={118}
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                  labelFormatter={(_, p) => (p?.[0]?.payload?.fullName as string) ?? ''}
                />
                <Bar dataKey="sessions" fill="#0ea5e9" name="Сесії" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50/90 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-3">Станція</th>
                <th className="px-6 py-3">Місто</th>
                <th className="px-6 py-3">Статус</th>
                <th className="px-6 py-3">Сесії</th>
                <th className="px-6 py-3">Дохід</th>
                <th className="px-6 py-3">Енергія (кВт·год)</th>
                <th className="px-6 py-3">Порти</th>
                <th className="px-6 py-3 text-right">Дія</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {perStation.map((row) => (
                <tr key={row.id} className="bg-white hover:bg-gray-50/60">
                  <td className="px-6 py-3 font-medium text-slate-900" title={row.fullName}>
                    {row.fullName}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{row.city}</td>
                  <td className="px-6 py-3">
                    <StatusPill tone={stationStatusTone(row.status)}>
                      {stationStatusLabel(row.status)}
                    </StatusPill>
                  </td>
                  <td className="px-6 py-3 tabular-nums text-gray-800">{row.sessions}</td>
                  <td className="px-6 py-3 tabular-nums font-medium text-slate-900">
                    {row.revenue.toLocaleString('uk-UA')} грн
                  </td>
                  <td className="px-6 py-3 tabular-nums text-gray-700">
                    {row.energy.toLocaleString('uk-UA')}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{row.ports}</td>
                  <td className="px-6 py-3 text-right">
                    <Link to={`/station-dashboard/stations/${row.id}`} className={stationAdminLinkAccent}>
                      Деталі
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminAccentCard>
      ) : null}
    </div>
  );
}
