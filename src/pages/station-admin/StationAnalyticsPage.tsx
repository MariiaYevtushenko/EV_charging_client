import { useEffect, useMemo, useState } from 'react';
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
  type FetchAdminAnalyticsViewsOptions,
  type StationAdminAnalyticsPeriod,
  type StationOverviewCounts,
} from '../../api/adminAnalytics';
import { ApiError } from '../../api/http';
import { PeriodSegmentedControl } from '../../components/analytics/PeriodSegmentedControl';
import { AdminAccentCard, AdminAccentRow } from '../../components/admin/AdminAccentCard';
import {
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

type MainTab = 'general' | 'top' | 'fewest' | 'ports' | 'detailed' | 'peak';

/** Діаграма «тип конектора»: що показує стовпець. */
type PortTypeChartMetric = 'sessions' | 'kwh' | 'revenue';

const STATION_PERIOD_OPTIONS: { value: StationAdminAnalyticsPeriod; label: string }[] = [
  { value: 'today', label: 'Сьогодні' },
  { value: '7d', label: '7 днів' },
  { value: '30d', label: '30 днів' },
  { value: 'all', label: 'Увесь час' },
];

function mainTabClass(active: boolean) {
  return active ? stationAdminUnderlineTabActive : stationAdminUnderlineTabIdle;
}

function aggregatePeakByHour(rows: Record<string, unknown>[]) {
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
}

function overviewRows(o: StationOverviewCounts) {
  return [
    { label: 'Працює', count: o.work, fill: '#22c55e' },
    { label: 'Не працює', count: o.notWorking, fill: '#9ca3af' },
    { label: 'Ремонт', count: o.fix, fill: '#f59e0b' },
    { label: 'Архів', count: o.archived, fill: '#64748b' },
  ];
}

function monthHeadingUk(iso: unknown): string {
  if (typeof iso !== 'string') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const t = d.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function signedIntDelta(d: number): string {
  if (d === 0) return '0';
  const a = Math.abs(d).toLocaleString('uk-UA');
  return d > 0 ? `+${a}` : `−${a}`;
}

function pctChangeLine(p: unknown): string {
  if (p == null) return '—';
  const n = num(p);
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n).toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  if (n > 0) return `+${a} %`;
  if (n < 0) return `−${a} %`;
  return `${a} %`;
}

function compareWord(delta: number): string {
  if (delta > 0) return 'більше';
  if (delta < 0) return 'менше';
  return 'без змін';
}

export default function StationAnalyticsPage() {
  const { stations } = useStations();
  const [mainTab, setMainTab] = useState<MainTab>('general');
  const [analyticsData, setAnalyticsData] = useState<AdminAnalyticsViewsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [analyticsPeriod, setAnalyticsPeriod] = useState<StationAdminAnalyticsPeriod>('30d');
  const [sqlPick, setSqlPick] = useState<'auto' | 'network' | number>('auto');
  const [sessionViewPage, setSessionViewPage] = useState(1);
  const [portTypeChartMetric, setPortTypeChartMetric] = useState<PortTypeChartMetric>('sessions');
  const [peakStationId, setPeakStationId] = useState<number | null>(null);

  const activeStations = useMemo(() => stations.filter((s) => !s.archived), [stations]);
  const firstActiveId = activeStations[0]?.id;
  const firstActiveNumericId = useMemo(() => {
    if (firstActiveId == null) return null;
    const n = Number.parseInt(String(firstActiveId), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [firstActiveId]);

  useEffect(() => {
    if (peakStationId == null && firstActiveNumericId != null) {
      setPeakStationId(firstActiveNumericId);
    }
  }, [firstActiveNumericId, peakStationId]);

  const sqlStationIdForApi = useMemo((): number | undefined => {
    if (sqlPick === 'network') return undefined;
    if (sqlPick === 'auto') {
      return firstActiveNumericId ?? undefined;
    }
    return sqlPick > 0 ? sqlPick : undefined;
  }, [sqlPick, firstActiveNumericId]);

  const fetchOpts = useMemo((): FetchAdminAnalyticsViewsOptions => {
    const peakId =
      peakStationId != null && Number.isFinite(peakStationId) && peakStationId > 0
        ? peakStationId
        : firstActiveNumericId ?? undefined;
    return {
      stationId: sqlStationIdForApi,
      period: analyticsPeriod,
      topPeriod: analyticsPeriod,
      fewestPeriod: analyticsPeriod,
      sessionStatsPage: sessionViewPage,
      sessionStatsPageSize: 10,
      peakStationId: peakId,
      peakPeriod: analyticsPeriod,
    };
  }, [sqlStationIdForApi, sessionViewPage, peakStationId, firstActiveNumericId, analyticsPeriod]);

  useEffect(() => {
    let cancelled = false;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    void fetchAdminAnalyticsViews(fetchOpts)
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
  }, [fetchOpts]);

  const snap = analyticsData?.stationAdminSnapshot;

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

  const sqlTopStationsChart = useMemo(() => {
    const rows = snap?.networkTopStations ?? [];
    return rows.slice(0, 12).map((r) => ({
      label: shortLabel(str(r.station_name), 18),
      fullName: str(r.station_name),
      sessions: num(r.session_count),
    }));
  }, [snap?.networkTopStations]);

  const sqlDetailStationName = useMemo(() => {
    if (snap?.stationId == null) return '';
    return activeStations.find((s) => Number(s.id) === snap.stationId)?.name ?? '';
  }, [snap?.stationId, activeStations]);

  const peakChartData = useMemo(
    () => aggregatePeakByHour(snap?.peakForStation?.buckets ?? []),
    [snap?.peakForStation?.buckets]
  );

  const portTypeByConnectorChart = useMemo(() => {
    const rows = analyticsData?.sessionStatsByPortType30d ?? [];
    const mapped = rows.map((r) => {
      const raw = str(r.connector_type_name);
      const label = raw || 'Без типу';
      return {
        name: shortLabel(label, 14),
        fullName: label,
        sessions: num(r.total_sessions),
        kwh: num(r.total_kwh),
        revenue: num(r.total_revenue),
      };
    });
    const sortKey =
      portTypeChartMetric === 'sessions' ? 'sessions' : portTypeChartMetric === 'kwh' ? 'kwh' : 'revenue';
    return [...mapped]
      .sort((a, b) => b[sortKey] - a[sortKey])
      .slice(0, 14);
  }, [analyticsData?.sessionStatsByPortType30d, portTypeChartMetric]);

  const portTypeChartBarKey =
    portTypeChartMetric === 'sessions' ? 'sessions' : portTypeChartMetric === 'kwh' ? 'kwh' : 'revenue';
  const portTypeChartAxisDecimals = portTypeChartMetric !== 'sessions';

  const sessionTotalPages = useMemo(() => {
    const t = snap?.sessionStatsViewPage?.total ?? 0;
    const size = snap?.sessionStatsViewPage?.pageSize ?? 10;
    return Math.max(1, Math.ceil(t / size));
  }, [snap?.sessionStatsViewPage?.total, snap?.sessionStatsViewPage?.pageSize]);

  useEffect(() => {
    const t = snap?.sessionStatsViewPage?.total;
    const sz = snap?.sessionStatsViewPage?.pageSize;
    if (t == null || sz == null) return;
    const maxP = Math.max(1, Math.ceil(t / Math.max(1, sz)));
    setSessionViewPage((p) => Math.min(maxP, Math.max(1, p)));
  }, [snap?.sessionStatsViewPage?.total, snap?.sessionStatsViewPage?.pageSize]);

  const todayRev = activeStations.reduce((a, s) => a + s.todayRevenue, 0);
  const todaySess = activeStations.reduce((a, s) => a + s.todaySessions, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className={stationAdminPageTitle}>Показники мережі</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Період у шапці задає зріз для KPI, рейтингів станцій і пікових годин. Вкладка «Порти» (тип конектора)
            лишається за фіксованими 30 днями з VIEW.
          </p>
        </div>
        <div className="w-full shrink-0 sm:w-auto">
          <PeriodSegmentedControl
            value={analyticsPeriod}
            onChange={(v) => setAnalyticsPeriod(v as StationAdminAnalyticsPeriod)}
            options={STATION_PERIOD_OPTIONS}
            disabled={analyticsLoading}
            className="sm:justify-end"
          />
        </div>
      </header>

      <nav
        className="-mx-1 flex flex-wrap gap-4 overflow-x-auto border-b border-gray-200 px-1 sm:gap-6"
        aria-label="Розділи показників мережі"
      >
        {(
          [
            { id: 'general' as const, label: 'Загальна' },
            { id: 'top' as const, label: 'ТОП станцій' },
            { id: 'fewest' as const, label: 'Станції' },
            { id: 'ports' as const, label: 'Порти' },
            { id: 'detailed' as const, label: 'Детально' },
            { id: 'peak' as const, label: 'Пікові години' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            className={mainTabClass(mainTab === t.id)}
            onClick={() => setMainTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {analyticsLoading ? (
        <div className={stationAdminLoadingBanner}>
          <span className={stationAdminLoadingSpinner} />
          Завантаження показників…
        </div>
      ) : null}

      {analyticsError ? (
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-medium">{analyticsError}</p>
          <p className="mt-2 text-amber-900/85">
            Застосуйте у PostgreSQL{' '}
            <code className="rounded-md bg-white/80 px-1.5 py-0.5 text-xs font-mono">View.sql</code> та{' '}
            <code className="rounded-md bg-white/80 px-1.5 py-0.5 text-xs font-mono">Station_admin_analytics.sql</code> та{' '}
            <code className="rounded-md bg-white/80 px-1.5 py-0.5 text-xs font-mono">Global_admin_analytics.sql</code>.
          </p>
        </div>
      ) : null}

    

      {!analyticsLoading && snap ? (
        <>
          {mainTab === 'general' ? (
            <div className="space-y-6">
              <section className="space-y-3" aria-labelledby="st-overview-heading">
               
                {snap.overview ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <AdminAccentCard>
                      <AdminAccentRow>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Усього</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                          {snap.overview.total.toLocaleString('uk-UA')}
                        </p>
                      </AdminAccentRow>
                    </AdminAccentCard>
                    {overviewRows(snap.overview).map((row) => (
                      <AdminAccentCard key={row.label}>
                        <AdminAccentRow>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{row.label}</p>
                          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                            <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: row.fill }} />
                            {row.count.toLocaleString('uk-UA')}
                          </p>
                        </AdminAccentRow>
                      </AdminAccentCard>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Не вдалося завантажити підрахунок станцій.</p>
                )}
              </section>

              {snap.networkMonthComparison ? (
                <section className="space-y-3" aria-labelledby="month-compare-heading">
                  <h2 id="month-compare-heading" className="text-sm font-semibold text-slate-900">
                    Порівняння календарних місяців
                  </h2>
                  <p className="text-xs text-gray-600">
                    Поточний місяць (з 1-го до сьогодні) vs повний попередній. Для сесій і бронювань — різниця
                    кількості; для енергії та прибутку — % зміни.{' '}
                    <span className="font-mono text-[11px]">GetStationAdminMonthComparison</span>
                    <span className="text-gray-500"> · усі станції мережі</span>
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {(() => {
                      const mc = snap.networkMonthComparison;
                      const currM = monthHeadingUk(mc.curr_month_start);
                      const prevM = monthHeadingUk(mc.prev_month_start);
                      const sd = num(mc.sessions_delta);
                      const bd = num(mc.bookings_delta);
                      return (
                        <>
                          <AdminAccentCard>
                            <AdminAccentRow>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                Сесії — {currM || 'поточний місяць'}
                              </p>
                              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                                {num(mc.sessions_curr).toLocaleString('uk-UA')}
                              </p>
                              <p className="mt-2 text-sm text-slate-700">
                                <span className="font-semibold tabular-nums">{signedIntDelta(sd)}</span>
                                <span className="text-gray-600">
                                  {' '}
                                  до попереднього місяця ({compareWord(sd)}) · було{' '}
                                  <span className="tabular-nums font-medium">
                                    {num(mc.sessions_prev).toLocaleString('uk-UA')}
                                  </span>
                                </span>
                              </p>
                            </AdminAccentRow>
                          </AdminAccentCard>
                          <AdminAccentCard>
                            <AdminAccentRow>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                Бронювання — {currM || 'поточний місяць'}
                              </p>
                              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                                {num(mc.bookings_curr).toLocaleString('uk-UA')}
                              </p>
                              <p className="mt-2 text-sm text-slate-700">
                                <span className="font-semibold tabular-nums">{signedIntDelta(bd)}</span>
                                <span className="text-gray-600">
                                  {' '}
                                  до попереднього місяця ({compareWord(bd)}) · було{' '}
                                  <span className="tabular-nums font-medium">
                                    {num(mc.bookings_prev).toLocaleString('uk-UA')}
                                  </span>
                                </span>
                              </p>
                            </AdminAccentRow>
                          </AdminAccentCard>
                          <AdminAccentCard>
                            <AdminAccentRow>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                Спожито енергії (COMPLETED)
                              </p>
                              <p className="mt-1 text-3xl font-bold tabular-nums text-teal-700">
                                {pctChangeLine(mc.kwh_change_pct)}
                              </p>
                              <p className="mt-2 text-xs text-gray-600">
                                За {prevM || 'попередній місяць'}:{' '}
                                <span className="font-medium tabular-nums text-slate-800">
                                  {num(mc.kwh_prev).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} кВт·год
                                </span>
                              </p>
                              <p className="mt-1 text-xs text-gray-600">
                                Зараз у місяці:{' '}
                                <span className="font-medium tabular-nums text-slate-800">
                                  {num(mc.kwh_curr).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} кВт·год
                                </span>
                              </p>
                            </AdminAccentRow>
                          </AdminAccentCard>
                          <AdminAccentCard>
                            <AdminAccentRow>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                Прибуток (bill)
                              </p>
                              <p className="mt-1 text-3xl font-bold tabular-nums text-green-700">
                                {pctChangeLine(mc.revenue_change_pct)}
                              </p>
                              <p className="mt-2 text-xs text-gray-600">
                                За {prevM || 'попередній місяць'}:{' '}
                                <span className="font-medium tabular-nums text-slate-800">
                                  {num(mc.revenue_prev).toLocaleString('uk-UA', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{' '}
                                  грн
                                </span>
                              </p>
                              <p className="mt-1 text-xs text-gray-600">
                                Зараз у місяці:{' '}
                                <span className="font-medium tabular-nums text-slate-800">
                                  {num(mc.revenue_curr).toLocaleString('uk-UA', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{' '}
                                  грн
                                </span>
                              </p>
                            </AdminAccentRow>
                          </AdminAccentCard>
                        </>
                      );
                    })()}
                  </div>
                </section>
              ) : null}

              {snap.networkBookingKpis ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <AdminAccentCard>
                    <AdminAccentRow>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Бронювання</p>
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

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AdminAccentCard>
                  <AdminAccentRow>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Станцій (активних у UI)</p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">{activeStations.length}</p>
                  </AdminAccentRow>
                </AdminAccentCard>
                <AdminAccentCard>
                  <AdminAccentRow>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Дохід сьогодні</p>
                    <p className="mt-1 text-3xl font-bold text-green-700">{todayRev.toLocaleString('uk-UA')} грн</p>
                  </AdminAccentRow>
                </AdminAccentCard>
                <AdminAccentCard>
                  <AdminAccentRow>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сесії сьогодні</p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">{todaySess}</p>
                  </AdminAccentRow>
                </AdminAccentCard>
              </div>

              <AdminAccentCard>
                <AdminAccentRow>
                  <h2 className="text-sm font-semibold text-slate-900">Прибуток по містах</h2>
                </AdminAccentRow>
                <div className="border-t border-gray-100 px-5 pb-5">
                  <div className="h-64 pt-4">
                    {cityChart.length === 0 ? (
                      <p className="flex h-full items-center justify-center text-sm text-gray-500">Немає даних</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={cityChart} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                          <YAxis type="category" dataKey="city" width={100} tick={{ fontSize: 10 }} stroke="#9ca3af" />
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                            formatter={(v) => {
                              const n = typeof v === 'number' ? v : Number(v);
                              return [`${(Number.isFinite(n) ? n : 0).toLocaleString('uk-UA')} грн`, 'Прибуток'];
                            }}
                            labelFormatter={(_, p) => (p?.[0]?.payload?.fullCity as string) ?? ''}
                          />
                          <Bar dataKey="revenue" fill="#16a34a" name="Прибуток" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </AdminAccentCard>

              <section className="space-y-3" aria-labelledby="st-detail-pick-heading">
               
                <label className="block max-w-md text-xs font-medium text-gray-600">
                  Оберіть станцію
                  <select
                    className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900"
                    value={sqlPick === 'auto' ? 'auto' : sqlPick === 'network' ? 'network' : String(sqlPick)}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === 'auto') setSqlPick('auto');
                      else if (v === 'network') setSqlPick('network');
                      else setSqlPick(Number.parseInt(v, 10));
                    }}
                  >
                    <option value="auto">Перша активна</option>
                    <option value="network">Лише мережа (без деталізації)</option>
                    {activeStations.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>

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
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Прибуток</p>
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
                        </AdminAccentRow>
                        <div className="border-t border-gray-100 px-5 py-4 text-sm">
                          <p className="text-2xl font-bold tabular-nums text-sky-700">
                            {snap.stationDetail.utilization.utilization_pct == null
                              ? '—'
                              : `${num(snap.stationDetail.utilization.utilization_pct).toFixed(1)} %`}
                          </p>
                        </div>
                      </AdminAccentCard>
                    ) : null}

                    <div className="grid gap-4">
                      <AdminAccentCard className="overflow-hidden">
                        <AdminAccentRow>
                          <h3 className="text-sm font-semibold text-slate-900">Порти · 30 днів (VIEW)</h3>
                        </AdminAccentRow>
                        <div className="overflow-x-auto border-t border-gray-100">
                          <table className="w-full min-w-[320px] text-left text-sm">
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
                              {(snap.stationDetail.connectors ?? []).map((r, i) => (
                                <tr key={`c-${num(r.port_number)}-${i}`}>
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
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </AdminAccentCard>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}

          {mainTab === 'top' ? (
            <div className="space-y-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <AdminAccentCard className="overflow-hidden">
                  <AdminAccentRow>
                    <h2 className="text-sm font-semibold text-slate-900">Таблиця</h2>
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
                            <tr key={`top-${num(r.station_id)}`}>
                              <td className="px-4 py-2 font-medium text-slate-900">{str(r.station_name)}</td>
                              <td className="px-4 py-2 text-right tabular-nums">
                                {num(r.session_count).toLocaleString('uk-UA')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </AdminAccentCard>
                <AdminAccentCard>
                  <AdminAccentRow>
                    <h2 className="text-sm font-semibold text-slate-900">Діаграма</h2>
                  </AdminAccentRow>
                  <div className="border-t border-gray-100 px-5 pb-5">
                    <div className="h-72 pt-4">
                      {sqlTopStationsChart.length === 0 ? (
                        <p className="flex h-full items-center justify-center text-sm text-gray-500">Немає даних</p>
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
            </div>
          ) : null}

          {mainTab === 'fewest' ? (
            <div className="space-y-4">
              <AdminAccentCard className="overflow-hidden">
                <AdminAccentRow>
                  <h2 className="text-sm font-semibold text-slate-900">Найменша кіькість сесій</h2>
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
                          <tr key={`bot-${num(r.station_id)}`}>
                            <td className="px-4 py-2 font-medium text-slate-900">{str(r.station_name)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">
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
          ) : null}

          {mainTab === 'ports' ? (
            <div className="space-y-4">
              <AdminAccentCard className="overflow-hidden">
                <AdminAccentRow>
                  <h2 className="text-sm font-semibold text-slate-900">Сесії за типом конектора</h2>
                  <p className="mt-1 rounded-lg border border-amber-100 bg-amber-50/80 px-2.5 py-2 text-xs font-medium text-amber-950">
                    На цій вкладці показані лише дані за останні 30 календарних днів (усі станції мережі). Інший період
                    тут недоступний — джерело: VIEW{' '}
                    <span className="font-mono text-[11px]">View_Admin_SessionStatisticByPortType_30</span>, групування
                    за <span className="font-mono text-[11px]">connector_type</span> (TYPE-2, CCS…).
                  </p>
                </AdminAccentRow>
                <div className="grid gap-4 border-t border-gray-100 p-4 lg:grid-cols-2">
                  <div className="flex min-h-0 w-full min-w-0 flex-col gap-2">
                    <div
                      className="flex shrink-0 flex-wrap gap-1 rounded-xl border border-gray-200/90 bg-gray-50/80 p-1"
                      role="group"
                      aria-label="Метрика стовпчастої діаграми"
                    >
                      {(
                        [
                          { id: 'sessions' as const, label: 'Сесії' },
                          { id: 'kwh' as const, label: 'кВт·год' },
                          { id: 'revenue' as const, label: 'грн' },
                        ] as const
                      ).map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setPortTypeChartMetric(id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            portTypeChartMetric === id
                              ? 'bg-green-600 text-white shadow-sm'
                              : 'text-gray-600 hover:bg-white hover:text-gray-900'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="h-56 w-full min-w-0">
                      {portTypeByConnectorChart.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={portTypeByConnectorChart}
                            layout="vertical"
                            margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 10 }}
                              stroke="#94a3b8"
                              allowDecimals={portTypeChartAxisDecimals}
                              tickFormatter={(v) =>
                                typeof v === 'number'
                                  ? v.toLocaleString('uk-UA', { maximumFractionDigits: 0 })
                                  : String(v)
                              }
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={72}
                              tick={{ fontSize: 10 }}
                              stroke="#64748b"
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const row = payload[0]?.payload as {
                                  fullName?: string;
                                  sessions?: number;
                                  kwh?: number;
                                  revenue?: number;
                                };
                                return (
                                  <div
                                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-md"
                                    style={{ fontSize: 12 }}
                                  >
                                    <p className="font-medium text-gray-900">{row.fullName ?? ''}</p>
                                    <p className="mt-1 text-gray-700">
                                      Сесій:{' '}
                                      <span className="font-semibold tabular-nums">
                                        {num(row.sessions).toLocaleString('uk-UA')}
                                      </span>
                                    </p>
                                    <p className="text-gray-700">
                                      кВт·год:{' '}
                                      <span className="font-semibold tabular-nums">
                                        {num(row.kwh).toLocaleString('uk-UA', { maximumFractionDigits: 2 })}
                                      </span>
                                    </p>
                                    <p className="text-gray-700">
                                      грн:{' '}
                                      <span className="font-semibold tabular-nums">
                                        {num(row.revenue).toLocaleString('uk-UA', {
                                          minimumFractionDigits: 0,
                                          maximumFractionDigits: 0,
                                        })}
                                      </span>
                                    </p>
                                  </div>
                                );
                              }}
                            />
                            <Bar
                              dataKey={portTypeChartBarKey}
                              fill={
                                portTypeChartMetric === 'sessions'
                                  ? '#6366f1'
                                  : portTypeChartMetric === 'kwh'
                                    ? '#0d9488'
                                    : '#d97706'
                              }
                              radius={[0, 6, 6, 0]}
                              name={
                                portTypeChartMetric === 'sessions'
                                  ? 'Сесії'
                                  : portTypeChartMetric === 'kwh'
                                    ? 'кВт·год'
                                    : 'грн'
                              }
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="flex h-full items-center justify-center text-sm text-gray-500">Немає даних</p>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full min-w-[280px] text-left text-sm">
                      <thead className="bg-gray-50/90 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Тип</th>
                          <th className="px-3 py-2 text-right">Сесії</th>
                          <th className="px-3 py-2 text-right">кВт·год</th>
                          <th className="px-3 py-2 text-right">грн</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(analyticsData?.sessionStatsByPortType30d ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                              Немає даних або VIEW не застосовано в БД
                            </td>
                          </tr>
                        ) : (
                          [...(analyticsData?.sessionStatsByPortType30d ?? [])]
                            .sort((a, b) => {
                              if (portTypeChartMetric === 'kwh') {
                                return num(b.total_kwh) - num(a.total_kwh);
                              }
                              if (portTypeChartMetric === 'revenue') {
                                return num(b.total_revenue) - num(a.total_revenue);
                              }
                              return num(b.total_sessions) - num(a.total_sessions);
                            })
                            .map((r, i) => (
                              <tr key={`pt-${num(r.connector_type_id)}-${i}`}>
                                <td className="px-3 py-2 font-medium text-slate-900">
                                  {str(r.connector_type_name) || '—'}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {num(r.total_sessions).toLocaleString('uk-UA')}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {num(r.total_kwh).toLocaleString('uk-UA', { maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {num(r.total_revenue).toLocaleString('uk-UA', { maximumFractionDigits: 0 })}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </AdminAccentCard>
            </div>
          ) : null}

          {mainTab === 'detailed' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                <span className="font-medium">View_StationSessionStatsLast30Days</span> — один рядок на станцію,
                останні 30 днів у VIEW; пагінація.
              </p>
              <AdminAccentCard className="overflow-hidden">
                <AdminAccentRow>
                  <h2 className="text-sm font-semibold text-slate-900">Сесії та прибуток по станціях</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Сторінка {snap.sessionStatsViewPage.page} з {sessionTotalPages} · усього{' '}
                    {snap.sessionStatsViewPage.total.toLocaleString('uk-UA')}
                  </p>
                </AdminAccentRow>
                <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-4 py-3">
                  <button
                    type="button"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
                    disabled={sessionViewPage <= 1}
                    onClick={() => setSessionViewPage((p) => Math.max(1, p - 1))}
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
                    disabled={sessionViewPage >= sessionTotalPages}
                    onClick={() => setSessionViewPage((p) => Math.min(sessionTotalPages, p + 1))}
                  >
                    Далі
                  </button>
                </div>
                <div className="overflow-x-auto border-t border-gray-100">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-gray-50/90 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-2">Станція</th>
                        <th className="px-4 py-2 text-right">Сесії</th>
                        <th className="px-4 py-2 text-right">Сер. тривалість, хв</th>
                        <th className="px-4 py-2 text-right">Сер. kWh</th>
                        <th className="px-4 py-2 text-right">Прибуток</th>
                        <th className="px-4 py-2 text-right">Сер. чек</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {snap.sessionStatsViewPage.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                            Немає даних
                          </td>
                        </tr>
                      ) : (
                        snap.sessionStatsViewPage.items.map((r) => (
                          <tr key={`sv-${num(r.station_id)}`}>
                            <td className="px-4 py-2 font-medium text-slate-900">{str(r.station_name)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              {num(r.total_sessions).toLocaleString('uk-UA')}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              {r.avg_duration_minutes == null ? '—' : num(r.avg_duration_minutes).toFixed(1)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              {r.avg_kwh == null ? '—' : num(r.avg_kwh).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              {num(r.total_revenue).toLocaleString('uk-UA', { maximumFractionDigits: 0 })} грн
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              {r.avg_bill_amount == null ? '—' : `${num(r.avg_bill_amount).toFixed(2)} грн`}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </AdminAccentCard>
            </div>
          ) : null}

          {mainTab === 'peak' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                <span className="font-medium">GetStationPeakHourBuckets</span> — розподіл стартів сесій за годиною
                доби (сума по всіх днях тижня) для обраної станції; інтервал відповідає обраному періоду в шапці.
              </p>
              <div className="max-w-md">
                <label className="block text-xs font-medium text-gray-600">
                  Станція
                  <select
                    className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900"
                    value={String(peakStationId ?? firstActiveNumericId ?? '')}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPeakStationId(v === '' ? null : Number.parseInt(v, 10));
                    }}
                  >
                    {activeStations.length === 0 ? (
                      <option value="">—</option>
                    ) : (
                      activeStations.map((s) => (
                        <option key={s.id} value={String(Number(s.id))}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>
              {snap.peakForStation ? (
                <p className="text-xs text-gray-500">
                  Станція #{snap.peakForStation.stationId} ·{' '}
                  {new Date(snap.peakForStation.periodFrom).toLocaleDateString('uk-UA')} —{' '}
                  {new Date(snap.peakForStation.periodTo).toLocaleDateString('uk-UA')}
                </p>
              ) : null}
              <AdminAccentCard>
                <AdminAccentRow>
                  <h2 className="text-sm font-semibold text-slate-900">Гістограма (за годиною)</h2>
                </AdminAccentRow>
                <div className="border-t border-gray-100 px-5 pb-5">
                  <div className="h-64 pt-4">
                    {peakChartData.every((d) => d.sessions === 0) ? (
                      <p className="flex h-full items-center justify-center text-sm text-gray-500">
                        Немає сесій за обраний період або оберіть станцію
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={peakChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={2} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#9ca3af" />
                          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                          <Bar dataKey="sessions" fill="#6366f1" name="Сесії" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </AdminAccentCard>
            </div>
          ) : null}
        </>
      ) : null}

    
    </div>
  );
}
