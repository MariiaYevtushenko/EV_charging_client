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

type SectionTab = 'overview' | 'charts' | 'session30d';

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

/** Ключі з `GetNetworkBookingStatsForPeriod` — порядок як у картці аналітики бронювань користувача. */
const BOOKING_KPI_KEY_ORDER = [
  'booked_count',
  'cancelled_count',
  'deposit_bookings',
  'total_bookings',
  'calc_bookings',
  'completed_count',
  'missed_count',
] as const;

function recordKeysLowercase(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.toLowerCase()] = v;
  }
  return out;
}

function metricLabelFromKey(key: string): string {
  return key.replaceAll('_', ' ').toLowerCase();
}

const BOOKING_LABEL_UK: Record<string, string> = {
  booked_count: 'Заброньовано',
  cancelled_count: 'Скасовано',
  deposit_bookings: 'Броні з передоплатою',
  total_bookings: 'Усього бронювань',
  calc_bookings: 'Розрахункові броні',
  completed_count: 'Завершено',
  missed_count: 'Пропущено',
};

const MONTH_KEY_ORDER = [
  'current_month_bookings',
  'current_month_sessions',
  'current_month_revenue',
  'previous_month_bookings',
  'previous_month_sessions',
  'previous_month_revenue',
  'sessions_delta_pct',
  'revenue_delta_pct',
] as const;

const MONTH_LABEL_UK: Record<string, string> = {
  current_month_bookings: 'Бронювання, поточний місяць',
  current_month_sessions: 'Сесії, поточний місяць',
  current_month_revenue: 'Прибуток, поточний місяць',
  previous_month_bookings: 'Бронювання, попередній місяць',
  previous_month_sessions: 'Сесії, попередній місяць',
  previous_month_revenue: 'Прибуток, попередній місяць',
  sessions_delta_pct: 'Зміна сесій, %',
  revenue_delta_pct: 'Зміна прибутку, %',
};

type OverviewMetricTile = {
  id: string;
  label: string;
  value: string;
  valueEmphasis?: 'positive' | 'negative';
};

function formatMonthOverviewValue(key: string, v: unknown): string {
  const k = key.toLowerCase();
  if (k.includes('revenue') && !k.includes('delta')) {
    return `${fmtMoney(num(v))} грн`;
  }
  if (k.includes('delta_pct')) {
    const n = num(v);
    if (!Number.isFinite(n)) return formatMonthComparisonValue(v);
    return `${n.toLocaleString('uk-UA', { maximumFractionDigits: 2 })}%`;
  }
  return formatMonthComparisonValue(v);
}

function monthDeltaEmphasis(key: string, v: unknown): 'positive' | 'negative' | undefined {
  if (!key.toLowerCase().includes('delta_pct')) return undefined;
  const n = num(v);
  if (!Number.isFinite(n) || n === 0) return undefined;
  return n > 0 ? 'positive' : 'negative';
}

/** Картка-огляд: сітка плиток з акцентами (прибуток, % зміни). */
function OverviewMetricCard({
  title,
  subtitle,
  tiles,
  emptyText,
  gridClassName,
}: {
  title: string;
  subtitle?: string;
  tiles: OverviewMetricTile[];
  emptyText?: string;
  gridClassName: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-md shadow-slate-200/45 ring-1 ring-slate-900/[0.04]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/40 via-white to-slate-50/60 px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="p-4 sm:p-5">
        {tiles.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">{emptyText ?? 'Немає даних'}</p>
        ) : (
          <div className={`grid gap-3 ${gridClassName}`}>
            {tiles.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-slate-100/90 bg-gradient-to-br from-slate-50/70 to-white px-3.5 py-3 shadow-sm transition hover:border-emerald-200/60 hover:shadow-md"
              >
                <p className="text-[11px] font-medium leading-snug text-slate-500">{t.label}</p>
                <p
                  className={`mt-1.5 text-lg font-bold tabular-nums tracking-tight ${
                    t.valueEmphasis === 'positive'
                      ? 'text-emerald-700'
                      : t.valueEmphasis === 'negative'
                        ? 'text-rose-600'
                        : 'text-slate-900'
                  }`}
                >
                  {t.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

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

export default function StationAnalyticsPage() {
  const [period, setPeriod] = useState<StationAdminAnalyticsPeriod>('30d');
  const [sectionTab, setSectionTab] = useState<SectionTab>('overview');
  const [sessionStatsPage, setSessionStatsPage] = useState(1);
  const [sessionSortBy, setSessionSortBy] = useState<SessionStatsViewSortKey>('total_revenue');
  const [sessionSortDir, setSessionSortDir] = useState<SessionStatsViewSortDir>('desc');
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
    setSessionSortBy('total_revenue');
    setSessionSortDir('desc');
  }, [period]);

  const onSessionSort = useCallback((key: SessionStatsViewSortKey) => {
    setSessionSortBy((prevBy) => {
      if (prevBy === key) {
        setSessionSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prevBy;
      }
      setSessionSortDir(key === 'station_name' ? 'asc' : 'desc');
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

  /** Той самий VIEW, що й у глобальної аналітики (`sessionStatsByPortType30d`) — фіксовані останні 30 днів. */
  const connectorTypeBars = useMemo(() => {
    return (data?.sessionStatsByPortType30d ?? []).map((r) => {
      const full = str(r.connector_type_name) || '—';
      return {
        name: full.length > 22 ? `${full.slice(0, 20)}…` : full,
        fullName: full,
        sessions: num(r.total_sessions),
        kwh: num(r.total_kwh),
        revenue: num(r.total_revenue),
      };
    });
  }, [data?.sessionStatsByPortType30d]);

  const stationMetricRows = useMemo((): OverviewMetricTile[] => {
    if (!ov) return [];
    return [
      { id: 'total', label: 'Усього станцій', value: String(ov.total) },
      { id: 'work', label: 'Працює', value: String(ov.work) },
      { id: 'not_working', label: 'Не працює', value: String(ov.notWorking) },
      { id: 'fix', label: 'На ремонті', value: String(ov.fix) },
      { id: 'archived', label: 'Архів', value: String(ov.archived) },
    ];
  }, [ov]);

  const bookingMetricRows = useMemo((): OverviewMetricTile[] => {
    const row = snap?.networkBookingKpis;
    if (!row || typeof row !== 'object') return [];
    const norm = recordKeysLowercase(row as Record<string, unknown>);
    return BOOKING_KPI_KEY_ORDER.filter((k) => {
      const v = norm[k];
      return v != null && v !== '';
    }).map((k) => ({
      id: k,
      label: BOOKING_LABEL_UK[k] ?? metricLabelFromKey(k),
      value: formatMonthComparisonValue(norm[k]),
    }));
  }, [snap?.networkBookingKpis]);

  const monthMetricRows = useMemo((): OverviewMetricTile[] => {
    const row = snap?.networkMonthComparison;
    if (!row || typeof row !== 'object') return [];
    const norm = recordKeysLowercase(row as Record<string, unknown>);
    return MONTH_KEY_ORDER.filter((k) => {
      const v = norm[k];
      return v != null && v !== '';
    }).map((k) => ({
      id: k,
      label: MONTH_LABEL_UK[k] ?? metricLabelFromKey(k),
      value: formatMonthOverviewValue(k, norm[k]),
      valueEmphasis: monthDeltaEmphasis(k, norm[k]),
    }));
  }, [snap?.networkMonthComparison]);

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
                  {
                    id: 'overview' as const,
                    label: 'Огляд',
                    count:
                      stationMetricRows.length +
                      bookingMetricRows.length +
                      monthMetricRows.length,
                  },
                  { id: 'charts' as const, label: 'Рейтинг', count: topBars.length + connectorTypeBars.length },
                  {
                    id: 'session30d' as const,
                    label: 'Станції',
                    count: sessionPage?.total ?? 0,
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
                <OverviewMetricCard
                  title="Станції за статусом"
                  subtitle="Миттєвий зріз усіх станцій у базі"
                  tiles={stationMetricRows}
                  emptyText="Немає даних про станції"
                  gridClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
                />

                <OverviewMetricCard
                  title="Бронювання за обраний період"
                  subtitle=""
                  tiles={bookingMetricRows}
                  emptyText="Немає зведення бронювань за період (перевірте функцію GetNetworkBookingStatsForPeriod у БД)"
                  gridClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                />

                {monthMetricRows.length > 0 ? (
                  <OverviewMetricCard
                    title="Порівняння місяців"
                    subtitle=""
                    tiles={monthMetricRows}
                    gridClassName="grid-cols-2 md:grid-cols-4"
                  />
                ) : null}
              </div>
            )}

            {sectionTab === 'charts' && (
              <section className="grid gap-4 md:grid-cols-2 md:items-stretch" aria-label="Графіки мережі">
                <AppCard padding className="h-full min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900">ТОП-10 за сесіями</h2>
                  {topBars.length === 0 ? (
                    <p className="mt-8 py-8 text-center text-sm text-slate-500">Немає даних</p>
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
                  <h2 className="text-sm font-semibold text-slate-900">Сесії за типом конектора</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Дані з того самого VIEW, що й у глобальної аналітики — останні 30 днів по мережі (не змінюються
                    повзунком періоду зверху).
                  </p>
                  {connectorTypeBars.length === 0 ? (
                    <p className="mt-8 py-8 text-center text-sm text-slate-500">Немає даних</p>
                  ) : (
                    <div className="mt-4 h-[300px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={connectorTypeBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis type="category" dataKey="name" width={108} tick={{ fontSize: 11, fill: '#475569' }} />
                          <Tooltip
                            formatter={(value, _name, ctx) => {
                              const p = ctx?.payload as {
                                fullName?: string;
                                kwh?: number;
                                revenue?: number;
                              };
                              const s = Number(value ?? 0);
                              const lines = [
                                `${p?.fullName ?? 'Конектор'}: ${s.toLocaleString('uk-UA')} сес.`,
                                `${(p?.kwh ?? 0).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} кВт·год`,
                                `${(p?.revenue ?? 0).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} грн`,
                              ];
                              return [lines.join('\n'), ''];
                            }}
                          />
                          <Bar dataKey="sessions" fill="#6366f1" radius={[0, 6, 6, 0]} name="Сесії" />
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
          </div>
        </>
      ) : null}
    </div>
  );
}
