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
import { FloatingToast, FloatingToastRegion } from '../../components/admin/FloatingToast';

const PIE_COLORS = ['#059669', '#6366f1', '#d97706', '#64748b', '#0ea5e9', '#be123c'];
const PERIOD_DEFAULT = 30;
const PARTIAL_TOAST_MS = 5000;

/** Періоди для API: 1 = календарна доба; 7 / 30 — ковзні вікна; 365 — максимум бекенду («Увесь час»). */
const GLOBAL_PERIOD_OPTIONS = [
  { value: '1', label: 'Сьогодні' },
  { value: '7', label: '7 днів' },
  { value: '30', label: '30 днів' },
  { value: '365', label: 'Увесь час' },
] as const;

/** Уточнення для панелей графіків (узгоджено з перемикачем періоду зверху). */
function analyticsPeriodStatsSubtitle(periodDays: number): string {
  const match = GLOBAL_PERIOD_OPTIONS.find((o) => Number(o.value) === periodDays);
  if (match?.value === '365') return 'Статистика за увесь доступний період';
  if (match?.value === '1') return 'Статистика за сьогодні (календарна доба)';
  if (match) return `Статистика за ${match.label}`;
  return `Статистика за ${periodDays} дн.`;
}

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

function numNullable(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function sessionDeltaStatusUa(delta: number): string {
  if (delta > 0) return 'більше';
  if (delta < 0) return 'менше';
  return 'без змін';
}

function pctDeltaStatusUa(pct: number): string {
  if (pct > 0) return 'більше';
  if (pct < 0) return 'менше';
  return 'без змін';
}

function fmtAbsPctOne(p: number): string {
  return Math.abs(p).toLocaleString('uk-UA', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
}

/** Для витрат / kWh: менше — «краще» (зелене). Для прибутку використовуйте з протилежним знаком. */
function deltaToneClass(delta: number): string {
  if (delta < 0) return 'text-emerald-700';
  if (delta > 0) return 'text-rose-700';
  return 'text-slate-600';
}

function fmtMoneyUa(n: number) {
  return n.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtKwhUa(n: number) {
  return n.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function pctOrCompute(rawPct: unknown, curr: number, prev: number): number | null {
  const p = numNullable(rawPct);
  if (p != null) return p;
  if (!Number.isFinite(curr) || !Number.isFinite(prev)) return null;
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

export default function GlobalAnalyticsPage() {
  const [periodDays, setPeriodDays] = useState(PERIOD_DEFAULT);
  const [section, setSection] = useState<AnalyticsSectionId>('overview');
  const [dailyTrendMetricIndex, setDailyTrendMetricIndex] = useState(0);
  /** Вкладка «Сесії» → блок «За типом сесій»: одна кругова діаграма за раз. */
  const [sessionKindPieMetric, setSessionKindPieMetric] = useState<'sessions' | 'kwh'>('sessions');
  const [data, setData] = useState<AdminAnalyticsViewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partialToastShow, setPartialToastShow] = useState(false);

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
  }, [loading, error, data?.partial, periodDays]);

  const ga = data?.globalAdminSnapshot;

  const rolling30 = useMemo(() => {
    const d = data?.globalDashboard;
    if (!d) return null;
    const sessionsCur = num(d.sessions_30d);
    const sessionsPrev = num(d.sessions_prev_30d);
    const energyCur = num(d.energy_30d);
    const energyPrev = num(d.energy_prev_30d);
    const revCur = num(d.revenue_30d);
    const revPrev = num(d.revenue_prev_30d);
    return {
      sessionsCur,
      sessionsPrev,
      sessionDelta: sessionsCur - sessionsPrev,
      energyCur,
      energyPrev,
      energyPct: pctOrCompute(d.energy_growth_pct, energyCur, energyPrev),
      revCur,
      revPrev,
      revPct: pctOrCompute(d.rev_growth_pct, revCur, revPrev),
    };
  }, [data?.globalDashboard]);

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

  const bookingPieKwh = useMemo(() => {
    return (ga?.networkSessionStatsByBookingKind ?? []).map((r) => ({
      name: bookingKindLabel(str(r.session_kind)),
      value: num(r.total_kwh),
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
      <FloatingToastRegion live="polite">
        <FloatingToast
          show={partialToastShow}
          tone="warning"
          onDismiss={() => setPartialToastShow(false)}
        >
          Частина запитів повернула порожньо (перевірте VIEW та функції в БД)
        </FloatingToast>
      </FloatingToastRegion>
      <header className="border-b border-slate-200 pb-4">
        <div className={`${userPortalPageHeaderRow} sm:items-start`}>
          <div className="min-w-0">
            <h1 className={globalAdminPageTitle}>Аналітика</h1>
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

      {!loading && !error ? (
        <GlobalAnalyticsSectionTabs section={section} onSection={setSection} tabs={sectionTabs} />
      ) : null}

      {!loading && !error && ga ? (
        <div className="space-y-6 pt-4">
          {section === 'overview' ? (
            <section className="mx-auto max-w-4xl space-y-3" aria-labelledby="global-analytics-summary-heading">
              {rolling30 ? (
                <Panel
                  title="Порівняння за 30 днів"
                  subtitle=""
                  className="overflow-hidden"
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/90 p-4">
                      <p className="text-xs font-medium text-slate-500">Кількість сесій</p>
                      <p
                        className={`mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${deltaToneClass(rolling30.sessionDelta)}`}
                      >
                        {rolling30.sessionDelta === 0
                          ? 'Без змін'
                          : `На ${Math.abs(rolling30.sessionDelta)} ${sessionDeltaStatusUa(rolling30.sessionDelta)}`}
                      </p>
                     
                      <p className="mt-3 text-[11px] leading-snug text-slate-500">
                        Останні 30 днів:{' '}
                        <span className="font-semibold tabular-nums text-slate-700">
                          {rolling30.sessionsCur.toLocaleString('uk-UA')}
                        </span>
                        {' · '}
                        Попередні 30:{' '}
                        <span className="font-semibold tabular-nums text-slate-700">
                          {rolling30.sessionsPrev.toLocaleString('uk-UA')}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-medium text-slate-500">Спожито енергії</p>
                      {rolling30.energyPct != null && Number.isFinite(rolling30.energyPct) ? (
                        <p
                          className={`mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${deltaToneClass(rolling30.energyPct)}`}
                        >
                          {rolling30.energyPct === 0
                            ? 'Без змін'
                            : `На ${fmtAbsPctOne(rolling30.energyPct)}% ${pctDeltaStatusUa(rolling30.energyPct)}`}
                        </p>
                      ) : (
                        <p className="mt-3 text-2xl font-semibold text-slate-400">—</p>
                      )}
                     
                      <p className="mt-3 text-[11px] leading-snug text-slate-500">
                        Останні 30 днів:{' '}
                        <span className="font-semibold tabular-nums text-slate-700">
                          {fmtKwhUa(rolling30.energyCur)} кВт·год
                        </span>
                        {' · '}
                        Попередні 30:{' '}
                        <span className="font-semibold tabular-nums text-slate-700">
                          {fmtKwhUa(rolling30.energyPrev)} кВт·год
                        </span>
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/50 p-4">
                      <p className="text-xs font-medium text-slate-600">Прибуток (суми bill)</p>
                      {rolling30.revPct != null && Number.isFinite(rolling30.revPct) ? (
                        <p
                          className={`mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${deltaToneClass(-rolling30.revPct)}`}
                        >
                          {rolling30.revPct === 0
                            ? 'Без змін'
                            : `На ${fmtAbsPctOne(rolling30.revPct)}% ${pctDeltaStatusUa(rolling30.revPct)}`}
                        </p>
                      ) : (
                        <p className="mt-3 text-2xl font-semibold text-slate-400">—</p>
                      )}
                    
                      <p className="mt-3 text-[11px] leading-snug text-slate-600">
                        Останні 30 днів:{' '}
                        <span className="font-semibold tabular-nums text-slate-800">
                          {fmtMoneyUa(rolling30.revCur)} ₴
                        </span>
                        {' · '}
                        Попередні 30:{' '}
                        <span className="font-semibold tabular-nums text-slate-800">
                          {fmtMoneyUa(rolling30.revPrev)} ₴
                        </span>
                      </p>
                    </div>
                  </div>
                </Panel>
              ) : null}
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
                      label="Сер. енергія"
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
                <p className="text-sm text-gray-500">Немає даних</p>
              )}
            </section>
          ) : null}

          {section === 'charts' ? (
          <Panel title="Статистика за днями" subtitle={analyticsPeriodStatsSubtitle(periodDays)}>
            {dailyBars.length === 0 ? (
              <p className="text-sm text-gray-500">Немає денних точок</p>
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
            <Panel title="Конектори" subtitle={analyticsPeriodStatsSubtitle(periodDays)}>
              {portBars.length === 0 ? (
                <p className="text-sm text-gray-500">Немає даних</p>
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

            <Panel title="Топ країн за прибутком" subtitle={analyticsPeriodStatsSubtitle(periodDays)}>
              {countryBars.length === 0 ? (
                <p className="text-sm text-gray-500">Немає даних</p>
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
          <Panel title="За типом сесій" subtitle={analyticsPeriodStatsSubtitle(periodDays)}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
              <div className="flex min-w-0 flex-col lg:col-span-5">
                <div
                  className="mb-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
                  role="tablist"
                  aria-label="Метрика кругової діаграми за типом сесій"
                >
                  <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:mr-2 lg:text-left">
                    Метрика
                  </span>
                  <div className="inline-flex justify-center rounded-lg border border-slate-200 bg-slate-50/90 p-0.5 shadow-sm lg:justify-start">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={sessionKindPieMetric === 'sessions'}
                      className={
                        sessionKindPieMetric === 'sessions'
                          ? 'rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-green-800 shadow-sm ring-1 ring-slate-200/80'
                          : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900'
                      }
                      onClick={() => setSessionKindPieMetric('sessions')}
                    >
                      Кількість сесій
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={sessionKindPieMetric === 'kwh'}
                      className={
                        sessionKindPieMetric === 'kwh'
                          ? 'rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-green-800 shadow-sm ring-1 ring-slate-200/80'
                          : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900'
                      }
                      onClick={() => setSessionKindPieMetric('kwh')}
                    >
                      кВт·год
                    </button>
                  </div>
                </div>
                <div className="h-64 w-full max-w-md mx-auto lg:mx-0 lg:max-w-none">
                  {sessionKindPieMetric === 'sessions' ? (
                    bookingPieSessions.some((x) => x.value > 0) ? (
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
                      <p className="flex h-full items-center justify-center text-sm text-gray-500">Немає сесій</p>
                    )
                  ) : bookingPieKwh.some((x) => x.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bookingPieKwh}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={88}
                          paddingAngle={2}
                          label={({ name, percent }) => `${name} ${(((percent ?? 0) as number) * 100).toFixed(0)}%`}
                        >
                          {bookingPieKwh.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => [
                            `${Number(v ?? 0).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} кВт·год`,
                            '',
                          ]}
                          contentStyle={{ borderRadius: 12, fontSize: 12 }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="flex h-full items-center justify-center text-sm text-gray-500">Немає даних про енергію</p>
                  )}
                </div>
              </div>
              <div className="min-w-0 lg:col-span-7">
                <ScrollTable maxHeight="min(18rem,52vh)">
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
            </div>
          </Panel>
          ) : null}

        </div>
      ) : null}
    </div>
  );
}
