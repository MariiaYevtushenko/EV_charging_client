import { useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { ApiError, userFacingApiErrorMessage } from '../../api/http';
import {
  fetchUserAnalyticsViews,
  type UserAnalyticsPeriod,
  type UserAnalyticsViewsResponse,
} from '../../api/userAnalytics';
import { AppCard } from '../../components/station-admin/Primitives';
import { PeriodSegmentedControl } from '../../components/analytics/PeriodSegmentedControl';
import {
  userPortalBookingStatus,
  userPortalIconTileMd,
  userPortalListPageShell,
  userPortalPageHeaderRow,
  userPortalPageTitle,
} from '../../styles/userPortalTheme';

const PERIOD_OPTIONS: { value: UserAnalyticsPeriod; label: string }[] = [
  { value: 'today', label: 'Сьогодні' },
  { value: '7d', label: '7 днів' },
  { value: '30d', label: '30 днів' },
  { value: 'all', label: 'Увесь час' },
];

type UserAnalyticsSectionTab = 'overview' | 'charts' | 'stations' | 'bookings' | 'cars';

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

/** Фон квадратика «% успішності» (завершені / усі бронювання в періоді). */
function bookingSuccessRateStripClass(pct: number): string {
  if (pct >= 80) return 'bg-emerald-100 text-emerald-950 ring-emerald-500/45';
  if (pct >= 55) return 'bg-green-50 text-green-900 ring-green-600/35';
  if (pct >= 35) return 'bg-lime-50 text-lime-900 ring-lime-600/30';
  if (pct >= 15) return 'bg-amber-50 text-amber-950 ring-amber-500/35';
  return 'bg-orange-50 text-orange-950 ring-orange-500/35';
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

function deltaToneClass(delta: number): string {
  if (delta < 0) return 'text-emerald-700';
  if (delta > 0) return 'text-rose-700';
  return 'text-slate-600';
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
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

export default function UserAnalyticsPage() {
  const { user } = useAuth();
  const userId = user?.id != null ? Number(user.id) : NaN;
  const [period, setPeriod] = useState<UserAnalyticsPeriod>('30d');
  const [sectionTab, setSectionTab] = useState<UserAnalyticsSectionTab>('overview');
  const [data, setData] = useState<UserAnalyticsViewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(userId) || userId <= 0) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchUserAnalyticsViews(userId, period)
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
  }, [userId, period]);

  const trendChart = useMemo(() => {
    const rows = data?.trend ?? [];
    return rows.map((r) => ({
      label: r.label,
      kwh: r.kwh,
      spend: r.spend,
    }));
  }, [data?.trend]);

  const stationBars = useMemo(() => {
    const rows = [...(data?.stationsInPeriod ?? [])].slice(0, 8);
    return rows.map((r) => ({
      name:
        r.stationName.length > 22
          ? `${r.stationName.slice(0, 20)}…`
          : r.stationName,
      fullName: r.stationName,
      kwh: r.kwh,
    }));
  }, [data?.stationsInPeriod]);

  /** Підписи місяців для блоку витрат (узгоджено з календарною логікою на сервері). */
  const calendarMonthSpendLabels = useMemo(() => {
    const d = new Date();
    const current = d.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1).toLocaleDateString('uk-UA', {
      month: 'long',
      year: 'numeric',
    });
    return { current, previous: prev };
  }, []);

  const trendBucketPhrase = period === 'all' ? 'по місяцях' : 'по днях';
  const chartTitleKwh = `Споживання ${trendBucketPhrase}`;
  const chartTitleSpend = `Витрати ${trendBucketPhrase}`;

  if (!Number.isFinite(userId) || userId <= 0) {
    return (
      <div className={`space-y-6 ${userPortalListPageShell}`}>
        <h1 className={userPortalPageTitle}>Аналітика</h1>
        <AppCard>
          <p className="text-sm text-slate-600">Увійдіть у кабінет, щоб переглянути персональну аналітику.</p>
        </AppCard>
      </div>
    );
  }

  const ps = data?.periodSummary;
  const det = data?.periodSessionDetail;
  const book = data?.bookingPeriod;
  const cm = data?.calendarMonthKpis;
  const mom = data?.kpiVsPrevCalendarMonth;
  const showCalendarMonthCard =
    cm != null &&
    (cm.current.totalSpentUah > 0 ||
      cm.previous.totalSpentUah > 0 ||
      cm.current.sessionCount > 0 ||
      cm.previous.sessionCount > 0 ||
      mom?.spentPct != null ||
      mom?.sessionsPct != null ||
      mom?.kwhPct != null);

  const sessionCalDelta =
    cm != null ? cm.current.sessionCount - cm.previous.sessionCount : 0;

  return (
    <div className={`space-y-8 pb-12 ${userPortalListPageShell}`}>
      <header className={userPortalPageHeaderRow}>
        <div className="min-w-0">
          <h1 className={userPortalPageTitle}>Аналітика</h1>
        </div>
        <PeriodSegmentedControl
          value={period}
          onChange={(v) => setPeriod(v as UserAnalyticsPeriod)}
          options={PERIOD_OPTIONS}
          disabled={loading}
          className="sm:justify-end"
        />
      </header>

      {data?.partial ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Частина даних могла не завантажитися. Оновіть сторінку або спробуйте пізніше.
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Завантажуємо аналітику…</p>
        </div>
      ) : error ? (
        <AppCard>
          <p className="text-sm font-medium text-red-700">{error}</p>
        </AppCard>
      ) : data ? (
        <>
          <nav className="border-b border-slate-200" aria-label="Теми аналітики">
            <div className="-mb-px flex gap-4 overflow-x-auto pb-px sm:gap-8" role="tablist">
              {(
                [
                  { id: 'overview' as const, label: 'Огляд', count: ps?.sessionCount ?? 0 },
                  { id: 'charts' as const, label: 'Графіки', count: 2 },
                  { id: 'stations' as const, label: 'Станції', count: data.stationsInPeriod?.length ?? 0 },
                  { id: 'bookings' as const, label: 'Бронювання', count: book?.totalBookings ?? 0 },
                  {
                    id: 'cars' as const,
                    label: 'Авто',
                    count: data.vehicleSpendInPeriod?.length ?? 0,
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
              <>
                <section aria-labelledby="user-kpi-heading" className="space-y-4">
            <h2 id="user-kpi-heading" className="sr-only">
              Ключові показники за період
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard title="Сесії" value={String(ps?.sessionCount ?? 0)} />
              <KpiCard title="Енергія" value={`${fmtKwh(ps?.totalKwh ?? 0)} кВт·год`} />
              <KpiCard title="Витрати" value={`${fmtMoney(ps?.totalSpent ?? 0)} ₴`} />
            </div>
          </section>

          <div className="space-y-6">
              <section
                className="grid gap-4 sm:grid-cols-2 sm:items-stretch"
                aria-label="Середні показники та топ станція"
              >
                <AppCard padding className="h-full">
                  <h2 className="text-sm font-semibold text-slate-900">Середні показники</h2>
                 
                  <div className="mt-4 flex gap-4">
                    <div className={userPortalIconTileMd}>
                      <SparkIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2 text-sm">
                      <div className="flex justify-between gap-2 border-b border-slate-100 py-1">
                        <span className="text-slate-500">кВт·год / сесію</span>
                        <span className="font-semibold tabular-nums text-slate-900">
                          {fmtKwh(det?.avgKwhPerSession ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 border-b border-slate-100 py-1">
                        <span className="text-slate-500">Середній чек</span>
                        <span className="font-semibold tabular-nums text-slate-900">
                          {fmtMoney(det?.avgRevenuePerSession ?? 0)} ₴
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 py-1">
                        <span className="text-slate-500">Тривалість (хв)</span>
                        <span className="font-semibold tabular-nums text-slate-900">
                          {(det?.avgSessionDurationMinutes ?? 0).toLocaleString('uk-UA', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 1,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </AppCard>
                <AppCard padding className="h-full">
                  <h2 className="text-sm font-semibold text-slate-900">ТОП станція</h2>
                 
                  {det?.topStation ? (
                    <>
                      <p className="mt-4 text-lg font-semibold leading-snug text-slate-900">{det.topStation.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Візитів: <span className="font-semibold tabular-nums">{det.topStation.visitCount}</span>
                      </p>
                      <Link
                        to={`/dashboard/stations/${det.topStation.id}`}
                        className="mt-3 inline-flex text-sm font-medium text-green-600 hover:text-green-700"
                      >
                        Відкрити станцію →
                      </Link>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">Немає сесій за цей період.</p>
                  )}
                </AppCard>
              </section>

              {showCalendarMonthCard && cm ? (
                <AppCard padding className="border-slate-200">
                  <h2 className="text-sm font-semibold text-slate-900">Порівняння з попереднім місяцем</h2>
                
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/90 p-4">
                      <p className="text-xs font-medium text-slate-500">Кількість сесій</p>
                      <p
                        className={`mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${deltaToneClass(sessionCalDelta)}`}
                      >
                        {sessionCalDelta === 0
                          ? 'Без змін'
                          : `На ${Math.abs(sessionCalDelta)} ${sessionDeltaStatusUa(sessionCalDelta)}`}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-slate-500">
                        порівняно з {calendarMonthSpendLabels.previous}
                      </p>
                      <p className="mt-3 text-[11px] leading-snug text-slate-500">
                        Поточний місяць:{' '}
                        <span className="font-semibold tabular-nums text-slate-700">{cm.current.sessionCount}</span>
                        {' · '}
                        Попередній:{' '}
                        <span className="font-semibold tabular-nums text-slate-700">{cm.previous.sessionCount}</span>
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-medium text-slate-500">Спожито енергії</p>
                      {mom?.kwhPct != null && Number.isFinite(mom.kwhPct) ? (
                        <>
                          <p
                            className={`mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${deltaToneClass(mom.kwhPct)}`}
                          >
                            {mom.kwhPct === 0
                              ? 'Без змін'
                              : `На ${fmtAbsPctOne(mom.kwhPct)}% ${pctDeltaStatusUa(mom.kwhPct)}`}
                          </p>
                          <p className="mt-1 text-[11px] leading-snug text-slate-500">
                            порівняно з {calendarMonthSpendLabels.previous}
                          </p>
                          <p className="mt-3 text-[11px] leading-snug text-slate-500">
                            Поточний місяць:{' '}
                            <span className="font-semibold tabular-nums text-slate-700">
                              {fmtKwh(cm.current.totalKwh)} кВт·год
                            </span>
                            {' · '}
                            Попередній:{' '}
                            <span className="font-semibold tabular-nums text-slate-700">
                              {fmtKwh(cm.previous.totalKwh)} кВт·год
                            </span>
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-2xl font-semibold text-slate-400">—</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/50 p-4">
                      <p className="text-xs font-medium text-slate-600">Витрачено коштів</p>
                      {mom?.spentPct != null && Number.isFinite(mom.spentPct) ? (
                        <>
                          <p
                            className={`mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${deltaToneClass(mom.spentPct)}`}
                          >
                            {mom.spentPct === 0
                              ? 'Без змін'
                              : `На ${fmtAbsPctOne(mom.spentPct)}% ${pctDeltaStatusUa(mom.spentPct)}`}
                          </p>
                          <p className="mt-1 text-[11px] leading-snug text-slate-600">
                            порівняно з {calendarMonthSpendLabels.previous}
                          </p>
                          <p className="mt-3 text-[11px] leading-snug text-slate-600">
                            Поточний місяць:{' '}
                            <span className="font-semibold tabular-nums text-slate-800">
                              {fmtMoney(cm.current.totalSpentUah)} ₴
                            </span>
                            {' · '}
                            Попередній:{' '}
                            <span className="font-semibold tabular-nums text-slate-800">
                              {fmtMoney(cm.previous.totalSpentUah)} ₴
                            </span>
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-2xl font-semibold text-slate-400">—</p>
                      )}
                    </div>
                  </div>
                </AppCard>
              ) : null}
              </div>
              </>
            )}

            {sectionTab === 'charts' && (
              <section
                className="grid gap-4 md:grid-cols-2 md:items-stretch"
                aria-label="Споживання та витрати в динаміці"
              >
                <AppCard padding className="h-full min-w-0">
                  <div className="mb-4">
                    <h2 className="text-sm font-semibold text-slate-900">{chartTitleKwh}</h2>
                  </div>
                  {trendChart.length === 0 ? (
                    <p className="py-12 text-center text-sm text-slate-500">Немає даних для графіка в цьому інтервалі.</p>
                  ) : (
                    <div className="h-[260px] w-full min-w-0 md:h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendChart} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            width={48}
                            tickFormatter={(v) => `${v}`}
                            label={{
                              value: 'кВт·год',
                              angle: -90,
                              position: 'insideLeft',
                              fill: '#94a3b8',
                              fontSize: 10,
                            }}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                            formatter={(value) => [`${fmtKwh(Number(value))} кВт·год`, 'Споживання']}
                          />
                          <Bar
                            dataKey="kwh"
                            name="кВт·год"
                            fill="#22c55e"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={36}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </AppCard>
                <AppCard padding className="h-full min-w-0">
                  <div className="mb-4">
                    <h2 className="text-sm font-semibold text-slate-900">{chartTitleSpend}</h2>
                  </div>
                  {trendChart.length === 0 ? (
                    <p className="py-12 text-center text-sm text-slate-500">Немає даних для графіка в цьому інтервалі.</p>
                  ) : (
                    <div className="h-[260px] w-full min-w-0 md:h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendChart} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            width={52}
                            tickFormatter={(v) => `${v}`}
                            label={{
                              value: '₴',
                              angle: -90,
                              position: 'insideLeft',
                              fill: '#94a3b8',
                              fontSize: 10,
                            }}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                            formatter={(value) => [`${fmtMoney(Number(value))} ₴`, 'Витрати']}
                          />
                          <Bar
                            dataKey="spend"
                            name="Витрати, ₴"
                            fill="#0ea5e9"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={36}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </AppCard>
              </section>
            )}

            {sectionTab === 'stations' && (
              <div className="space-y-6">
                <AppCard padding>
                  <h2 className="text-sm font-semibold text-slate-900">ТОП станцій за енергією</h2>
                
                  {stationBars.length === 0 ? (
                    <p className="mt-8 text-center text-sm text-slate-500">Немає даних.</p>
                  ) : (
                    <div className="mt-4 h-[280px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stationBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={100}
                            tick={{ fontSize: 11, fill: '#475569' }}
                          />
                          <Tooltip
                            formatter={(v, _n, ctx) => {
                              const payload = ctx?.payload as { fullName?: string; kwh?: number };
                              return [`${fmtKwh(Number(v))} кВт·год`, payload?.fullName ?? 'Станція'];
                            }}
                          />
                          <Bar dataKey="kwh" fill="#22c55e" radius={[0, 6, 6, 0]} name="кВт·год" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </AppCard>
              </div>
            )}

            {sectionTab === 'bookings' && (
              <AppCard padding>
                <h2 className="text-sm font-semibold text-slate-900">Бронювання за період</h2>
              
                {!book || book.totalBookings === 0 ? (
                  <p className="mt-8 text-center text-sm text-slate-500">Немає бронювань у цьому інтервалі.</p>
                ) : (
                  <>
                    <div
                      className="mt-4 flex w-full flex-nowrap gap-1 overflow-x-auto rounded-xl border border-slate-200/90 bg-slate-50/50 p-1 shadow-inner [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      role="group"
                      aria-label="Кількості бронювань за статусом та успішність завершення"
                    >
                      {(
                        [
                          {
                            key: 'booked',
                            label: 'Заброньовано',
                            count: book.cntBooked,
                            tone: userPortalBookingStatus.upcoming,
                          },
                          {
                            key: 'completed',
                            label: 'Завершено',
                            count: book.cntCompleted,
                            tone: userPortalBookingStatus.completed,
                          },
                          {
                            key: 'missed',
                            label: 'Пропущено',
                            count: book.cntMissed,
                            tone: userPortalBookingStatus.missed,
                          },
                          {
                            key: 'cancelled',
                            label: 'Скасовано',
                            count: book.cntCancelled,
                            tone: userPortalBookingStatus.cancelled,
                          },
                        ] as const
                      ).map((cell) => (
                        <div
                          key={cell.key}
                          className={`min-w-[5.5rem] flex-1 rounded-lg px-2 py-3 text-center ring-1 ring-inset ${cell.tone}`}
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-90">{cell.label}</p>
                          <p className="mt-1 text-xl font-bold tabular-nums">{cell.count}</p>
                        </div>
                      ))}
                      {book.pctCompleted != null ? (
                        <div
                          className={`min-w-[5.75rem] flex-1 rounded-lg px-2 py-3 text-center ring-1 ring-inset ${bookingSuccessRateStripClass(book.pctCompleted)}`}
                          title="Частка бронювань зі статусом «завершено» від усіх бронювань у цьому періоді"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-90">Успішність</p>
                          <p className="mt-1 text-xl font-bold tabular-nums">
                            {book.pctCompleted.toLocaleString('uk-UA', { maximumFractionDigits: 1 })}%
                          </p>
                          <p className="mt-0.5 text-[10px] font-medium leading-tight opacity-90">завершені</p>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </AppCard>
            )}

            {sectionTab === 'cars' && (
              <div className="space-y-6">
                <AppCard padding>
                  {(data?.vehicleSpendInPeriod ?? []).length === 0 ? (
                    <p className="mt-2 text-center text-sm text-slate-500">Немає зарядок для авто в цьому інтервалі.</p>
                  ) : (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[480px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th className="py-2 pr-3">Авто</th>
                            <th className="py-2 pr-3">Номер</th>
                            <th className="py-2 pr-3 text-right">Сесії</th>
                            <th className="py-2 pr-3 text-right">кВт·год</th>
                            <th className="py-2 text-right">Витрати</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data?.vehicleSpendInPeriod ?? []).map((row) => (
                            <tr key={row.vehicleId} className="border-b border-slate-100 last:border-0">
                              <td className="py-2.5 pr-3 font-medium text-slate-900">{row.carLabel || '—'}</td>
                              <td className="py-2.5 pr-3 text-slate-600">{row.licensePlate || '—'}</td>
                              <td className="py-2.5 pr-3 text-right tabular-nums">{row.sessionCount}</td>
                              <td className="py-2.5 pr-3 text-right tabular-nums">{fmtKwh(row.totalKwh)}</td>
                              <td className="py-2.5 text-right tabular-nums">{fmtMoney(row.totalRevenue)} ₴</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </AppCard>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
