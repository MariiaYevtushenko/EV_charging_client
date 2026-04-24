import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchAdminAnalyticsViews,
  num,
  str,
  type AdminAnalyticsViewsResponse,
  type SessionStatsViewSortDir,
  type SessionStatsViewSortKey,
  type StationAdminAnalyticsPeriod,
} from '../../api/adminAnalytics';
import { ApiError, userFacingApiErrorMessage } from '../../api/http';
import { AppCard } from '../../components/station-admin/Primitives';
import { FloatingToast, FloatingToastRegion } from '../../components/admin/FloatingToast';
import { PeriodSegmentedControl } from '../../components/analytics/PeriodSegmentedControl';
import { stationAdminPageTitle } from '../../styles/stationAdminTheme';
import { userPortalListPageShell, userPortalPageHeaderRow } from '../../styles/userPortalTheme';

const PARTIAL_TOAST_MS = 5000;

const PERIOD_OPTIONS: { value: StationAdminAnalyticsPeriod; label: string }[] = [
  { value: 'today', label: 'Сьогодні' },
  { value: '7d', label: '7 днів' },
  { value: '30d', label: '30 днів' },
  { value: 'all', label: 'Увесь час' },
];

type SectionTab = 'overview' | 'charts' | 'session30d' | 'peakNetwork';

function analyticsThemeTabClass(active: boolean) {
  return active
    ? 'border-green-600 text-green-700'
    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900';
}

function fmtMoney(n: number) {
  return n.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtKwh(n: number) {
  return n.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function pickStationRankRow(r: Record<string, unknown>) {
  const id = Math.floor(num(r.station_id ?? r.id));
  const name = str(r.station_name ?? r.name);
  const sessions = num(r.session_count ?? r.count);
  return { id, name, sessions };
}

function formatMonthComparisonValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (Number.isInteger(v)) return v.toLocaleString('uk-UA');
    return v.toLocaleString('uk-UA', { maximumFractionDigits: 2 });
  }
  if (typeof v === 'string') return v;
  return String(v);
}

function isoDowUa(d: number): string {
  const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  const i = Math.round(d) - 1;
  return labels[i] ?? `Д${d}`;
}

function peakBucketsToMatrix(buckets: Record<string, unknown>[]) {
  const grid: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  let max = 1;
  for (const b of buckets) {
    const dow = Math.round(num(b.iso_dow));
    const h = Math.round(num(b.hour_of_day));
    const c = num(b.session_count);
    if (dow >= 1 && dow <= 7 && h >= 0 && h <= 23) {
      grid[dow - 1][h] += c;
      max = Math.max(max, grid[dow - 1][h]);
    }
  }
  return { grid, max };
}

const PEAK_CELL_COLORS = [
  '#f8fafc',
  '#e2e8f0',
  '#cbd5e1',
  '#94a3b8',
  '#64748b',
  '#475569',
  '#334155',
  '#1e293b',
];

function SessionStatsSortTh({
  label,
  sortKey,
  currentBy,
  currentDir,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: SessionStatsViewSortKey;
  currentBy: SessionStatsViewSortKey;
  currentDir: SessionStatsViewSortDir;
  onSort: (k: SessionStatsViewSortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = currentBy === sortKey;
  const arrow = active ? (currentDir === 'asc' ? '↑' : '↓') : '';
  return (
    <th
      scope="col"
      className={`py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <button
        type="button"
        className={`group inline-flex max-w-full items-center gap-1 rounded-md px-1 py-0.5 -mx-1 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40 ${align === 'right' ? 'w-full justify-end' : ''}`}
        onClick={() => onSort(sortKey)}
        aria-sort={active ? (currentDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span>{label}</span>
        {arrow ? (
          <span className="text-[11px] font-bold normal-case text-green-700 tabular-nums" aria-hidden>
            {arrow}
          </span>
        ) : (
          <span className="text-[10px] font-normal normal-case text-slate-300 opacity-0 group-hover:opacity-100" aria-hidden>
            ↕
          </span>
        )}
      </button>
    </th>
  );
}

function KpiCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <AppCard className="relative overflow-hidden" padding>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </AppCard>
  );
}

export default function StationAnalyticsPage() {
  const [period, setPeriod] = useState<StationAdminAnalyticsPeriod>('30d');
  const [sectionTab, setSectionTab] = useState<SectionTab>('overview');
  const [sessionStatsPage, setSessionStatsPage] = useState(1);
  const [sessionSortBy, setSessionSortBy] = useState<SessionStatsViewSortKey>('station_id');
  const [sessionSortDir, setSessionSortDir] = useState<SessionStatsViewSortDir>('asc');
  const [data, setData] = useState<AdminAnalyticsViewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partialToastShow, setPartialToastShow] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchAdminAnalyticsViews({
      period,
      topPeriod: period,
      fewestPeriod: period,
      peakPeriod: period,
      sessionStatsPage,
      sessionStatsPageSize: 15,
      sessionStatsSortBy: sessionSortBy,
      sessionStatsSortDir: sessionSortDir,
    })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(
            userFacingApiErrorMessage(e, e instanceof ApiError ? e.message : 'Не вдалося завантажити аналітику')
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, sessionStatsPage, sessionSortBy, sessionSortDir]);

  useEffect(() => {
    return load();
  }, [load]);

  useEffect(() => {
    if (loading) {
      setPartialToastShow(false);
      return;
    }
    if (error || !data?.partial) {
      setPartialToastShow(false);
      return;
    }
    setPartialToastShow(true);
    const id = window.setTimeout(() => setPartialToastShow(false), PARTIAL_TOAST_MS);
    return () => window.clearTimeout(id);
  }, [loading, error, data?.partial, period]);

  useEffect(() => {
    setSessionStatsPage(1);
    setSessionSortBy('station_id');
    setSessionSortDir('asc');
  }, [period]);

  const onSessionSort = useCallback((key: SessionStatsViewSortKey) => {
    setSessionSortBy((prevBy) => {
      if (prevBy === key) {
        setSessionSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prevBy;
      }
      setSessionSortDir('asc');
      return key;
    });
    setSessionStatsPage(1);
  }, []);

  const snap = data?.stationAdminSnapshot;
  const ov = snap?.overview;

  const topBars = useMemo(() => {
    const rows = [...(snap?.networkTopStations ?? [])].slice(0, 10).map(pickStationRankRow);
    return rows.map((r) => ({
      name: r.name.length > 22 ? `${r.name.slice(0, 20)}…` : r.name,
      fullName: r.name,
      sessions: r.sessions,
      id: r.id,
    }));
  }, [snap?.networkTopStations]);

  const bottomBars = useMemo(() => {
    const rows = [...(snap?.networkBottomStations ?? [])].slice(0, 10).map(pickStationRankRow);
    return rows.map((r) => ({
      name: r.name.length > 22 ? `${r.name.slice(0, 20)}…` : r.name,
      fullName: r.name,
      sessions: r.sessions,
      id: r.id,
    }));
  }, [snap?.networkBottomStations]);

  const bookingKpiEntries = useMemo(() => {
    const row = snap?.networkBookingKpis;
    if (!row || typeof row !== 'object') return [];
    return Object.entries(row)
      .filter(([, v]) => v != null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b));
  }, [snap?.networkBookingKpis]);

  const monthEntries = useMemo(() => {
    const row = snap?.networkMonthComparison;
    if (!row || typeof row !== 'object') return [];
    return Object.entries(row)
      .filter(([, v]) => v != null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b));
  }, [snap?.networkMonthComparison]);

  const networkPeakMatrix = useMemo(() => {
    return peakBucketsToMatrix(snap?.networkPeakHours?.buckets ?? []);
  }, [snap?.networkPeakHours?.buckets]);

  const sessionPage = snap?.sessionStatsViewPage;

  return (
    <div className={`space-y-8 pb-12 ${userPortalListPageShell}`}>
      <FloatingToastRegion live="polite">
        <FloatingToast
          show={partialToastShow}
          tone="warning"
          onDismiss={() => setPartialToastShow(false)}
        >
          Дані завантажено не повністю 
        </FloatingToast>
      </FloatingToastRegion>

      <header className={userPortalPageHeaderRow}>
        <div className="min-w-0">
          <h1 className={stationAdminPageTitle}>Аналітика мережі</h1>
        </div>
        <PeriodSegmentedControl
          value={period}
          onChange={(v) => setPeriod(v as StationAdminAnalyticsPeriod)}
          options={PERIOD_OPTIONS}
          disabled={loading}
          className="sm:justify-end"
        />
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Завантажуємо аналітику…</p>
        </div>
      ) : error ? (
        <AppCard padding>
          <p className="text-sm font-medium text-red-700">{error}</p>
        </AppCard>
      ) : data && snap ? (
        <>
          <nav className="border-b border-slate-200" aria-label="Розділи аналітики">
            <div className="-mb-px flex gap-4 overflow-x-auto pb-px sm:gap-8" role="tablist">
              {(
                [
                  { id: 'overview' as const, label: 'Огляд', count: bookingKpiEntries.length || (ov ? 1 : 0) },
                  { id: 'charts' as const, label: 'Рейтинг', count: topBars.length + bottomBars.length },
                  {
                    id: 'session30d' as const,
                    label: 'Станції 30 дн',
                    count: sessionPage?.total ?? 0,
                  },
                  {
                    id: 'peakNetwork' as const,
                    label: 'Піки мережі',
                    count: snap.networkPeakHours?.buckets?.length ?? 0,
                  },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={sectionTab === t.id}
                  className={`shrink-0 border-b-2 px-0.5 pb-3 pt-1 text-sm font-medium transition ${analyticsThemeTabClass(sectionTab === t.id)}`}
                  onClick={() => setSectionTab(t.id)}
                >
                  {t.label}{' '}
                  <span
                    className={`tabular-nums ${sectionTab === t.id ? 'text-green-600/90' : 'text-slate-400'}`}
                  >
                    ({t.count})
                  </span>
                </button>
              ))}
            </div>
          </nav>

          <div className="mt-6 space-y-6">
            {sectionTab === 'overview' && (
              <div className="space-y-6">
                {ov ? (
                  <section aria-labelledby="st-admin-station-counts" className="space-y-3">
                    <h2 id="st-admin-station-counts" className="text-sm font-semibold text-slate-900">
                      Станції за статусом
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <KpiCard title="Усього" value={String(ov.total)} />
                      <KpiCard title="Працює" value={String(ov.work)} />
                      <KpiCard title="Не працює" value={String(ov.notWorking)} />
                      <KpiCard title="На ремонті" value={String(ov.fix)} />
                      <KpiCard title="Архів" value={String(ov.archived)} />
                    </div>
                  </section>
                ) : null}

                {bookingKpiEntries.length > 0 ? (
                  <AppCard padding>
                    <h2 className="text-sm font-semibold text-slate-900">Бронювання за обраний період</h2>
                    <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                      {bookingKpiEntries.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2 border-b border-slate-100 py-1.5 text-sm">
                          <dt className="text-slate-500">{k.replaceAll('_', ' ')}</dt>
                          <dd className="font-semibold tabular-nums text-slate-900">{formatMonthComparisonValue(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </AppCard>
                ) : (
                  <AppCard padding>
                    <p className="text-sm text-slate-500">Немає зведення бронювань за період (перевірте функцію в БД).</p>
                  </AppCard>
                )}

                {monthEntries.length > 0 ? (
                  <AppCard padding>
                    <h2 className="text-sm font-semibold text-slate-900">Порівняння місяців (мережа)</h2>
                     <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                      {monthEntries.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2 border-b border-slate-100 py-1.5 text-sm">
                          <dt className="text-slate-500">{k.replaceAll('_', ' ')}</dt>
                          <dd className="font-semibold tabular-nums text-slate-900">{formatMonthComparisonValue(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </AppCard>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                  <AppCard padding>
                    <h2 className="text-sm font-semibold text-slate-900">ТОП станцій за сесіями</h2>
                    {topBars.length === 0 ? (
                      <p className="mt-4 text-sm text-slate-500">Немає даних за період.</p>
                    ) : (
                      <ul className="mt-4 space-y-2 text-sm">
                        {topBars.map((r, i) => (
                          <li key={r.id} className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0">
                            <span className="text-slate-500">{i + 1}.</span>
                            <Link
                              to={`/station-dashboard/stations/${r.id}`}
                              className="min-w-0 flex-1 truncate font-medium text-green-700 hover:text-green-800"
                            >
                              {r.fullName}
                            </Link>
                            <span className="shrink-0 tabular-nums text-slate-800">{r.sessions}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </AppCard>
                  <AppCard padding>
                    <h2 className="text-sm font-semibold text-slate-900">Найменш завантажені</h2>
                    {bottomBars.length === 0 ? (
                      <p className="mt-4 text-sm text-slate-500">Немає даних за період.</p>
                    ) : (
                      <ul className="mt-4 space-y-2 text-sm">
                        {bottomBars.map((r, i) => (
                          <li key={r.id} className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0">
                            <span className="text-slate-500">{i + 1}.</span>
                            <Link
                              to={`/station-dashboard/stations/${r.id}`}
                              className="min-w-0 flex-1 truncate font-medium text-green-700 hover:text-green-800"
                            >
                              {r.fullName}
                            </Link>
                            <span className="shrink-0 tabular-nums text-slate-800">{r.sessions}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </AppCard>
                </div>
              </div>
            )}

            {sectionTab === 'charts' && (
              <section className="grid gap-4 md:grid-cols-2 md:items-stretch" aria-label="Графіки рейтингу станцій">
                <AppCard padding className="h-full min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900">ТОП за сесіями</h2>
                  {topBars.length === 0 ? (
                    <p className="mt-8 py-8 text-center text-sm text-slate-500">Немає даних.</p>
                  ) : (
                    <div className="mt-4 h-[300px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis type="category" dataKey="name" width={108} tick={{ fontSize: 11, fill: '#475569' }} />
                          <Tooltip
                            formatter={(v, _n, ctx) => {
                              const payload = ctx?.payload as { fullName?: string };
                              return [String(v ?? ''), payload?.fullName ?? 'Сесії'];
                            }}
                          />
                          <Bar dataKey="sessions" fill="#22c55e" radius={[0, 6, 6, 0]} name="Сесії" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </AppCard>
                <AppCard padding className="h-full min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900">Найменш завантажені</h2>
                  {bottomBars.length === 0 ? (
                    <p className="mt-8 py-8 text-center text-sm text-slate-500">Немає даних.</p>
                  ) : (
                    <div className="mt-4 h-[300px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bottomBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis type="category" dataKey="name" width={108} tick={{ fontSize: 11, fill: '#475569' }} />
                          <Tooltip
                            formatter={(v, _n, ctx) => {
                              const payload = ctx?.payload as { fullName?: string };
                              return [String(v ?? ''), payload?.fullName ?? 'Сесії'];
                            }}
                          />
                          <Bar dataKey="sessions" fill="#94a3b8" radius={[0, 6, 6, 0]} name="Сесії" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </AppCard>
              </section>
            )}

            {sectionTab === 'session30d' && sessionPage && (
              <AppCard padding>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                 
                  <p className="text-xs text-slate-500">
                    Сторінка {sessionPage.page} з {Math.max(1, Math.ceil(sessionPage.total / sessionPage.pageSize))}{' '}
                    · усього {sessionPage.total}
                  </p>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <SessionStatsSortTh
                          label="ID"
                          sortKey="station_id"
                          currentBy={sessionSortBy}
                          currentDir={sessionSortDir}
                          onSort={onSessionSort}
                        />
                        <SessionStatsSortTh
                          label="Станція"
                          sortKey="station_name"
                          currentBy={sessionSortBy}
                          currentDir={sessionSortDir}
                          onSort={onSessionSort}
                        />
                        <SessionStatsSortTh
                          label="Сесії"
                          sortKey="total_sessions"
                          currentBy={sessionSortBy}
                          currentDir={sessionSortDir}
                          onSort={onSessionSort}
                          align="right"
                        />
                        <SessionStatsSortTh
                          label="Сер. хв"
                          sortKey="avg_duration_minutes"
                          currentBy={sessionSortBy}
                          currentDir={sessionSortDir}
                          onSort={onSessionSort}
                          align="right"
                        />
                        <SessionStatsSortTh
                          label="Сер. kWh"
                          sortKey="avg_kwh"
                          currentBy={sessionSortBy}
                          currentDir={sessionSortDir}
                          onSort={onSessionSort}
                          align="right"
                        />
                        <SessionStatsSortTh
                          label="Прибуток"
                          sortKey="total_revenue"
                          currentBy={sessionSortBy}
                          currentDir={sessionSortDir}
                          onSort={onSessionSort}
                          align="right"
                        />
                        <SessionStatsSortTh
                          label="Сер. чек"
                          sortKey="avg_bill_amount"
                          currentBy={sessionSortBy}
                          currentDir={sessionSortDir}
                          onSort={onSessionSort}
                          align="right"
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {sessionPage.items.map((row) => (
                        <tr key={num(row.station_id)} className="border-b border-slate-100 last:border-0">
                          <td className="py-2.5 pr-3 tabular-nums">{num(row.station_id)}</td>
                          <td className="py-2.5 pr-3">
                            <Link
                              className="font-medium text-green-700 hover:text-green-800"
                              to={`/station-dashboard/stations/${num(row.station_id)}`}
                            >
                              {str(row.station_name)}
                            </Link>
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">{num(row.total_sessions)}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">{formatMonthComparisonValue(row.avg_duration_minutes)}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">{fmtKwh(num(row.avg_kwh))}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">{fmtMoney(num(row.total_revenue))} ₴</td>
                          <td className="py-2.5 text-right tabular-nums">{fmtMoney(num(row.avg_bill_amount))} ₴</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                    disabled={sessionPage.page <= 1 || loading}
                    onClick={() => setSessionStatsPage((p) => Math.max(1, p - 1))}
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                    disabled={
                      sessionPage.page >= Math.max(1, Math.ceil(sessionPage.total / sessionPage.pageSize)) || loading
                    }
                    onClick={() => setSessionStatsPage((p) => p + 1)}
                  >
                    Далі
                  </button>
                </div>
              </AppCard>
            )}

            {sectionTab === 'peakNetwork' && (
              <div className="space-y-4">
                <AppCard padding>
                  <h2 className="text-sm font-semibold text-slate-900">Навантаження по мережі</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Усі станції разом, за вікном{' '}
                    <span className="font-mono text-[11px]">GetNetworkPeakHourBuckets</span> (узгоджено з повзунком
                    періоду: <span className="font-mono text-[11px]">peakPeriod</span> = обраний період).
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {snap.networkPeakHours.periodFrom.slice(0, 10)} — {snap.networkPeakHours.periodTo.slice(0, 10)}
                  </p>
                  {snap.networkPeakHours.buckets.length === 0 ? (
                    <p className="mt-6 text-center text-sm text-slate-500">Немає сесій у цьому інтервалі.</p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="border-collapse text-[10px] sm:text-xs">
                        <thead>
                          <tr>
                            <th className="border border-slate-200 bg-slate-50 px-1 py-1 text-left font-medium text-slate-600">
                              День \ Год
                            </th>
                            {Array.from({ length: 24 }, (_, h) => (
                              <th
                                key={h}
                                className="border border-slate-200 bg-slate-50 px-0.5 py-1 text-center font-medium text-slate-500"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {networkPeakMatrix.grid.map((row, dow) => (
                            <tr key={dow}>
                              <td className="border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium text-slate-600">
                                {isoDowUa(dow + 1)}
                              </td>
                              {row.map((cell, h) => {
                                const level =
                                  networkPeakMatrix.max > 0
                                    ? Math.min(
                                        PEAK_CELL_COLORS.length - 1,
                                        Math.floor((cell / networkPeakMatrix.max) * (PEAK_CELL_COLORS.length - 1))
                                      )
                                    : 0;
                                const bg = PEAK_CELL_COLORS[cell === 0 ? 0 : level];
                                return (
                                  <td
                                    key={h}
                                    title={`${isoDowUa(dow + 1)} ${h}:00 — ${cell} сес.`}
                                    className="h-7 w-6 border border-slate-200 p-0 text-center align-middle tabular-nums text-slate-800"
                                    style={{ backgroundColor: bg }}
                                  >
                                    {cell > 0 ? cell : ''}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </AppCard>
                {snap.networkPeakHours.buckets.length > 0 ? (
                  <AppCard padding>
                    <h3 className="text-sm font-semibold text-slate-900">Корзини (рядки)</h3>
                    <div className="mt-3 max-h-64 overflow-y-auto overflow-x-auto">
                      <table className="min-w-[280px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                            <th className="py-2 pr-3">День</th>
                            <th className="py-2 pr-3">Година</th>
                            <th className="py-2 text-right">Сесії</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snap.networkPeakHours.buckets.map((b, i) => (
                            <tr key={i} className="border-b border-slate-100 last:border-0">
                              <td className="py-1.5 pr-3">{isoDowUa(num(b.iso_dow))}</td>
                              <td className="py-1.5 pr-3 tabular-nums">{num(b.hour_of_day)}</td>
                              <td className="py-1.5 text-right tabular-nums">{num(b.session_count)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AppCard>
                ) : null}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
