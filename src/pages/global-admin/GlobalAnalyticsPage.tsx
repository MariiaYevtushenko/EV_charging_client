import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
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
} from '../../api/adminAnalytics';
import { ApiError } from '../../api/http';
import {
  globalAdminLoadingBanner,
  globalAdminLoadingSpinner,
  globalAdminPageTitle,
} from '../../styles/globalAdminTheme';
import { userPortalPageHeaderRow } from '../../styles/userPortalTheme';
import { PeriodSegmentedControl } from '../../components/analytics/PeriodSegmentedControl';

const PIE_COLORS = ['#059669', '#6366f1', '#d97706', '#64748b', '#0ea5e9', '#be123c'];
const PERIOD_DEFAULT = 30;

/** Преси періоду для API (7 / 30 / 365 днів). «Увесь час» — максимум, який приймає бекенд. */
const GLOBAL_PERIOD_OPTIONS = [
  { value: '7', label: '7 днів' },
  { value: '30', label: '30 днів' },
  { value: '365', label: 'Увесь час' },
] as const;

type AnalyticsSectionId = 'overview' | 'charts' | 'stations' | 'bookings';

type TabDef = { id: AnalyticsSectionId; label: string; badge: number };

function GlobalAnalyticsSectionTabs({
  section,
  onSection,
  tabs,
}: {
  section: AnalyticsSectionId;
  onSection: (id: AnalyticsSectionId) => void;
  tabs: TabDef[];
}) {
  return (
    <nav
      className="flex flex-wrap gap-x-4 gap-y-0.5 border-b border-slate-200 sm:gap-x-6"
      role="tablist"
      aria-label="Розділи аналітики мережі"
    >
      {tabs.map((tab) => {
        const active = section === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={
              active
                ? 'relative shrink-0 border-b-2 border-green-600 pb-2.5 text-sm font-semibold text-green-700 transition'
                : 'relative shrink-0 border-b-2 border-transparent pb-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-200 hover:text-slate-900'
            }
            onClick={() => onSection(tab.id)}
          >
            <span className={active ? 'text-green-700' : 'text-slate-700'}>{tab.label}</span>
            <span className={active ? 'text-green-700' : 'text-slate-400'}> ({tab.badge})</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Картка зведення — компактні відступи, без штучної висоти. */
function SessionSummaryStatCard({
  label,
  value,
  valueClassName = '',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200/90 bg-white px-3.5 py-3 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.02] sm:px-4 sm:py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]">{label}</p>
      <p
        className={`mt-1.5 font-bold leading-snug tracking-tight text-slate-900 tabular-nums ${valueClassName || 'text-lg sm:text-xl'}`}
      >
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-gray-100/90 bg-white/95 shadow-sm shadow-gray-200/40 ring-1 ring-slate-900/[0.03] ${className}`}
    >
      <div className="border-b border-gray-100/80 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">{subtitle}</p> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function ScrollTable({
  children,
  maxHeight = 'min(22rem,55vh)',
}: {
  children: ReactNode;
  maxHeight?: string;
}) {
  return (
    <div
      className="overflow-x-auto rounded-xl border border-gray-100 bg-slate-50/30"
      style={{ maxHeight }}
    >
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  );
}

type DailyBarRow = {
  label: string;
  revenue: number;
  sessions: number;
  bookings: number;
  kwh: number;
};

/** Метрики з GetAdminRevenueTrendByDays — по одній на екрані графіка. */
const DAILY_TREND_METRICS: {
  label: string;
  dataKey: keyof Omit<DailyBarRow, 'label'>;
  formatTooltipValue: (v: number) => string;
  tooltipName: string;
  barFill: string;
}[] = [
  {
    label: 'Прибуток',
    dataKey: 'revenue',
    formatTooltipValue: (v) =>
      `${v.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`,
    tooltipName: 'Прибуток',
    barFill: '#16a34a',
  },
  {
    label: 'Сесії',
    dataKey: 'sessions',
    formatTooltipValue: (v) => `${Math.round(v).toLocaleString('uk-UA')}`,
    tooltipName: 'Сесії',
    barFill: '#2563eb',
  },
  {
    label: 'Бронювання',
    dataKey: 'bookings',
    formatTooltipValue: (v) => `${Math.round(v).toLocaleString('uk-UA')}`,
    tooltipName: 'Броні',
    barFill: '#d97706',
  },
  {
    label: 'кВт·год',
    dataKey: 'kwh',
    formatTooltipValue: (v) =>
      `${v.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} кВт·год`,
    tooltipName: 'кВт·год',
    barFill: '#7c3aed',
  },
];

function bookingKindLabel(kind: string): string {
  switch (kind) {
    case 'NO_BOOKING':
      return 'Без бронювання';
    case 'WITH_BOOKING_CALC':
      return 'Бронь CALC';
    case 'WITH_BOOKING_DEPOSIT':
      return 'Бронь DEPOSIT';
    default:
      return kind;
  }
}

export default function GlobalAnalyticsPage() {
  const [periodDays, setPeriodDays] = useState(PERIOD_DEFAULT);
  const [section, setSection] = useState<AnalyticsSectionId>('overview');
  const [dailyTrendMetricIndex, setDailyTrendMetricIndex] = useState(0);
  const [data, setData] = useState<AdminAnalyticsViewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchAdminAnalyticsViews({ globalPeriodDays: periodDays })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(e instanceof ApiError ? e.message : 'Не вдалося завантажити аналітику');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [periodDays]);

  useEffect(() => {
    return load();
  }, [load]);

  const ga = data?.globalAdminSnapshot;

  const dailyBars = useMemo((): DailyBarRow[] => {
    const rows = ga?.networkRevenueTrendDaily ?? [];
    return rows.map((r) => {
      const raw = r.bucket_date;
      const d = typeof raw === 'string' ? new Date(raw) : raw instanceof Date ? raw : null;
      const label =
        d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }) : str(raw);
      return {
        label,
        revenue: num(r.total_revenue),
        sessions: num(r.session_count),
        bookings: num(r.booking_count),
        kwh: num(r.total_kwh),
      };
    });
  }, [ga?.networkRevenueTrendDaily]);

  const portBars = useMemo(() => {
    return (ga?.networkPortTypeStats ?? []).map((r) => ({
      name: str(r.connector_type_name) || '—',
      sessions: num(r.total_sessions),
      kwh: num(r.total_kwh),
      revenue: num(r.total_revenue),
    }));
  }, [ga?.networkPortTypeStats]);

  const countryBars = useMemo(() => {
    return (ga?.networkTopCountries ?? []).map((r) => ({
      name: str(r.country_name).slice(0, 18),
      revenue: num(r.total_revenue),
    }));
  }, [ga?.networkTopCountries]);

  const bookingPieSessions = useMemo(() => {
    return (ga?.networkSessionStatsByBookingKind ?? []).map((r) => ({
      name: bookingKindLabel(str(r.session_kind)),
      value: num(r.session_count),
    }));
  }, [ga?.networkSessionStatsByBookingKind]);

  const bookingPieRevenue = useMemo(() => {
    return (ga?.networkSessionStatsByBookingKind ?? []).map((r) => ({
      name: bookingKindLabel(str(r.session_kind)),
      value: num(r.total_revenue),
    }));
  }, [ga?.networkSessionStatsByBookingKind]);

  const sectionTabs = useMemo((): TabDef[] => {
    const stationsOk = portBars.length > 0 || countryBars.length > 0;
    return [
      { id: 'overview', label: 'Огляд', badge: 1 },
      { id: 'charts', label: 'Графіки', badge: DAILY_TREND_METRICS.length },
      { id: 'stations', label: 'Станції', badge: stationsOk ? 1 : 0 },
      { id: 'bookings', label: 'Сесії', badge: 1 },
    ];
  }, [portBars.length, countryBars.length]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-1 pb-8 sm:px-0 sm:pb-10">
      <header className="border-b border-slate-200 pb-4">
        <div className={`${userPortalPageHeaderRow} sm:items-start`}>
          <div className="min-w-0">
            <h1 className={`${globalAdminPageTitle} sm:text-3xl`}>Аналітика мережі</h1>
          </div>
          <div className="w-full min-w-0 sm:w-auto">
            <PeriodSegmentedControl
              value={String(periodDays)}
              onChange={(v) => setPeriodDays(Number(v))}
              options={GLOBAL_PERIOD_OPTIONS}
              disabled={loading}
              className="sm:justify-end"
            />
          </div>
        </div>
      </header>

      {loading ? (
        <div className={globalAdminLoadingBanner}>
          <span className={globalAdminLoadingSpinner} />
          Завантаження…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-medium">{error}</p>
          <p className="mt-2 text-amber-900/85">
            Застосуйте у PostgreSQL скрипт{' '}
            <code className="rounded-md bg-white/80 px-1.5 py-0.5 text-xs font-mono">Global_admin_analytics.sql</code>.
          </p>
        </div>
      ) : null}

      {!loading && !error && data?.partial ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
          Частина запитів повернула порожньо (перевірте VIEW та функції в БД).
        </div>
      ) : null}

      {!loading && !error ? (
        <GlobalAnalyticsSectionTabs section={section} onSection={setSection} tabs={sectionTabs} />
      ) : null}

      {!loading && !error && ga ? (
        <div className="space-y-6 pt-4">
          {section === 'overview' ? (
            <section className="mx-auto max-w-4xl space-y-3" aria-labelledby="global-analytics-summary-heading">
              <h2 id="global-analytics-summary-heading" className="text-sm font-semibold text-slate-900 sm:text-base">
                Зведення за період
              </h2>
              {ga.networkSessionStats ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <SessionSummaryStatCard
                      label="Сесії"
                      value={num(ga.networkSessionStats.total_sessions).toLocaleString('uk-UA')}
                    />
                    <SessionSummaryStatCard
                      label="Енергія"
                      value={`${num(ga.networkSessionStats.total_kwh).toLocaleString('uk-UA', {
                        maximumFractionDigits: 2,
                      })} кВт·год`}
                    />
                    <SessionSummaryStatCard
                      label="Прибуток"
                      value={`${num(ga.networkSessionStats.total_revenue).toLocaleString('uk-UA', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} ₴`}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <SessionSummaryStatCard
                      label="Сер. тривалість"
                      value={
                        ga.networkSessionStats.avg_duration_minutes == null
                          ? '—'
                          : `${num(ga.networkSessionStats.avg_duration_minutes).toLocaleString('uk-UA', {
                              maximumFractionDigits: 1,
                            })} хв`
                      }
                      valueClassName="text-base sm:text-lg"
                    />
                    <SessionSummaryStatCard
                      label="Сер. енергія (COMPLETED)"
                      value={
                        ga.networkSessionStats.avg_kwh == null
                          ? '—'
                          : `${num(ga.networkSessionStats.avg_kwh).toLocaleString('uk-UA', {
                              maximumFractionDigits: 3,
                            })} кВт·год`
                      }
                      valueClassName="text-base sm:text-lg"
                    />
                    <SessionSummaryStatCard
                      label="Сер. чек"
                      value={
                        ga.networkSessionStats.avg_bill_amount == null
                          ? '—'
                          : `${num(ga.networkSessionStats.avg_bill_amount).toLocaleString('uk-UA', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} ₴`
                      }
                      valueClassName="text-base sm:text-lg"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Немає даних.</p>
              )}
            </section>
          ) : null}

          {section === 'charts' ? (
          <Panel title="Статистика за днями">
            {dailyBars.length === 0 ? (
              <p className="text-sm text-gray-500">Немає денних точок.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-2 py-2 sm:px-4">
                  <button
                    type="button"
                    aria-label="Попередня метрика"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold text-slate-700 shadow-sm transition hover:border-green-300 hover:bg-green-50 hover:text-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40"
                    onClick={() =>
                      setDailyTrendMetricIndex(
                        (i) => (i - 1 + DAILY_TREND_METRICS.length) % DAILY_TREND_METRICS.length
                      )
                    }
                  >
                    ‹
                  </button>
                  <div className="min-w-0 flex-1 text-center">
                    <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                      {DAILY_TREND_METRICS[dailyTrendMetricIndex]?.label ?? '—'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {dailyTrendMetricIndex + 1} / {DAILY_TREND_METRICS.length}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Наступна метрика"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold text-slate-700 shadow-sm transition hover:border-green-300 hover:bg-green-50 hover:text-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40"
                    onClick={() =>
                      setDailyTrendMetricIndex((i) => (i + 1) % DAILY_TREND_METRICS.length)
                    }
                  >
                    ›
                  </button>
                </div>
                <div className="h-64 w-full sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyBars} margin={{ top: 8, right: 8, left: 4, bottom: 36 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                        stroke="#94a3b8"
                        angle={-25}
                        textAnchor="end"
                        height={52}
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={48} />
                      <Tooltip
                        formatter={(v) => {
                          const m = DAILY_TREND_METRICS[dailyTrendMetricIndex];
                          if (!m) return [String(v ?? ''), ''];
                          return [m.formatTooltipValue(Number(v ?? 0)), m.tooltipName];
                        }}
                        contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      />
                      <Bar
                        key={DAILY_TREND_METRICS[dailyTrendMetricIndex]?.dataKey ?? 'revenue'}
                        dataKey={DAILY_TREND_METRICS[dailyTrendMetricIndex]?.dataKey ?? 'revenue'}
                        fill={DAILY_TREND_METRICS[dailyTrendMetricIndex]?.barFill ?? '#16a34a'}
                        radius={[4, 4, 0, 0]}
                        name={DAILY_TREND_METRICS[dailyTrendMetricIndex]?.tooltipName}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </Panel>
          ) : null}

          {section === 'stations' ? (
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            <Panel title="Тип конектора">
              {portBars.length === 0 ? (
                <p className="text-sm text-gray-500">Немає даних.</p>
              ) : (
                <>
                  <div className="mb-4 h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={portBars} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} stroke="#64748b" />
                        <Tooltip
                          formatter={(v) => [`${Number(v ?? 0).toLocaleString('uk-UA')}`, 'Сесії']}
                          contentStyle={{ borderRadius: 12, fontSize: 12 }}
                        />
                        <Bar dataKey="sessions" fill="#6366f1" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <ScrollTable maxHeight="min(16rem,40vh)">
                    <thead className="sticky top-0 z-10 bg-slate-100/95 text-xs font-semibold uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5">Конектор</th>
                        <th className="px-3 py-2.5 text-right">Сесії</th>
                        <th className="px-3 py-2.5 text-right">кВт·год</th>
                        <th className="px-3 py-2.5 text-right">Прибуток</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {(ga.networkPortTypeStats ?? []).map((r) => (
                        <tr key={`${r.connector_type_id ?? 'x'}-${str(r.connector_type_name)}`}>
                          <td className="px-3 py-2 font-medium text-slate-900">{str(r.connector_type_name) || '—'}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{num(r.total_sessions).toLocaleString('uk-UA')}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {num(r.total_kwh).toLocaleString('uk-UA', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-emerald-800">
                            {num(r.total_revenue).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} грн
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </ScrollTable>
                </>
              )}
            </Panel>

            <Panel title="Топ країн за прибутком">
              {countryBars.length === 0 ? (
                <p className="text-sm text-gray-500">Немає даних.</p>
              ) : (
                <>
                  <div className="mb-4 h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={countryBars} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" interval={0} angle={-20} textAnchor="end" height={52} />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip
                          formatter={(v) => [`${Number(v ?? 0).toLocaleString('uk-UA')} грн`, '']}
                          contentStyle={{ borderRadius: 12, fontSize: 12 }}
                        />
                        <Bar dataKey="revenue" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <ScrollTable maxHeight="min(14rem,36vh)">
                    <thead className="sticky top-0 z-10 bg-slate-100/95 text-xs font-semibold uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5">Країна</th>
                        <th className="px-3 py-2.5 text-right">Прибуток</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {(ga.networkTopCountries ?? []).map((r) => (
                        <tr key={str(r.country_name)}>
                          <td className="px-3 py-2 font-medium text-slate-900">{str(r.country_name)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-emerald-800">
                            {num(r.total_revenue).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} грн
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </ScrollTable>
                </>
              )}
            </Panel>
          </div>
          ) : null}

          {section === 'bookings' ? (
          <Panel title="За типом сесій" subtitle="">
            <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
              <div className="h-64 w-full">
                {bookingPieSessions.some((x) => x.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bookingPieSessions}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={88}
                        paddingAngle={2}
                        label={({ name, percent }) => `${name} ${(((percent ?? 0) as number) * 100).toFixed(0)}%`}
                      >
                        {bookingPieSessions.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-gray-500">Немає сесій.</p>
                )}
              </div>
              <div className="h-64 w-full">
                {bookingPieRevenue.some((x) => x.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bookingPieRevenue}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={88}
                        paddingAngle={2}
                        label={({ percent }) => `${(((percent ?? 0) as number) * 100).toFixed(0)}%`}
                      >
                        {bookingPieRevenue.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[(i + 1) % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => [`${Number(v ?? 0).toLocaleString('uk-UA')} грн`, '']}
                        contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-gray-500">Немає прибутку.</p>
                )}
              </div>
            </div>
            <div className="mt-6">
              <ScrollTable maxHeight="min(12rem,36vh)">
                <thead className="sticky top-0 z-10 bg-slate-100/95 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5">Категорія</th>
                    <th className="px-3 py-2.5 text-right">Сесії</th>
                    <th className="px-3 py-2.5 text-right">кВт·год</th>
                    <th className="px-3 py-2.5 text-right">Прибуток</th>
                    <th className="px-3 py-2.5 text-right">Сер. чек</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(ga.networkSessionStatsByBookingKind ?? []).map((r) => (
                    <tr key={str(r.session_kind)}>
                      <td className="px-3 py-2 font-medium text-slate-900">{bookingKindLabel(str(r.session_kind))}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{num(r.session_count).toLocaleString('uk-UA')}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {num(r.total_kwh).toLocaleString('uk-UA', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-800">
                        {num(r.total_revenue).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} грн
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.avg_bill_amount == null
                          ? '—'
                          : `${num(r.avg_bill_amount).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} грн`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ScrollTable>
            </div>
          </Panel>
          ) : null}

        </div>
      ) : null}
    </div>
  );
}
