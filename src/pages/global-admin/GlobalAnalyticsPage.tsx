import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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
} from '../../api/adminAnalytics';
import { ApiError } from '../../api/http';
import {
  globalAdminLoadingBanner,
  globalAdminLoadingSpinner,
  globalAdminPageTitle,
} from '../../styles/globalAdminTheme';
import { AdminAccentCard, AdminAccentRow } from '../../components/admin/AdminAccentCard';

const PIE_COLORS = ['#16a34a', '#64748b', '#d97706', '#0284c7', '#7c3aed', '#e11d48'];

const DOW_UK = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

type TabId = 'pulse' | 'network' | 'users' | 'live';

function fmtDate(iso: unknown): string {
  if (typeof iso !== 'string') return '—';
  try {
    return new Date(iso).toLocaleString('uk-UA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function SegmentedTabs({
  value,
  onChange,
}: {
  value: TabId;
  onChange: (t: TabId) => void;
}) {
  const items: { id: TabId; label: string; hint: string }[] = [
    { id: 'pulse', label: 'Пульс мережі', hint: '30 днів, динаміка' },
    { id: 'network', label: 'Географія', hint: 'Міста та станції' },
    { id: 'users', label: 'Клієнти', hint: 'Сегменти, звички' },
    { id: 'live', label: 'Онлайн', hint: 'Зараз у мережі' },
  ];
  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      role="tablist"
      aria-label="Розділи аналітики"
    >
      <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-green-100/90 bg-gradient-to-b from-green-50/50 to-slate-50/40 p-1.5 shadow-inner shadow-green-900/5">
        {items.map((item) => {
          const active = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.id)}
              className={`rounded-xl px-4 py-2.5 text-left transition ${
                active
                  ? 'bg-white text-slate-900 shadow-md shadow-green-900/10 ring-1 ring-green-200/80'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className={`mt-0.5 block text-xs ${active ? 'text-green-700/90' : 'text-slate-500'}`}>
                {item.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function KpiStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <AdminAccentCard hover>
      <AdminAccentRow>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
        {sub ? <p className="mt-1 text-xs text-gray-500">{sub}</p> : null}
      </AdminAccentRow>
    </AdminAccentCard>
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
      className={`rounded-2xl border border-gray-100/90 bg-white/95 shadow-sm shadow-gray-200/40 ring-1 ring-slate-900/[0.03] ${className}`}
    >
      <div className="border-b border-gray-100/80 px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
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

export default function GlobalAnalyticsPage() {
  const { stations } = useStations();
  const [data, setData] = useState<AdminAnalyticsViewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('pulse');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchAdminAnalyticsViews()
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
  }, []);

  const active = useMemo(() => stations.filter((s) => !s.archived), [stations]);
  const todayRev = active.reduce((a, s) => a + s.todayRevenue, 0);

  const g = data?.globalDashboard;
  const ga = data?.globalAdminSnapshot;
  const stSnap = data?.stationAdminSnapshot;

  const growthBars = useMemo(() => {
    if (!g) return [];
    return [
      { name: 'Виручка', pct: num(g.rev_growth_pct) },
      { name: 'Енергія', pct: num(g.energy_growth_pct) },
      { name: 'Авто (унік.)', pct: num(g.cars_growth_pct) },
      { name: 'Сесії', pct: num(g.sessions_growth_pct) },
    ];
  }, [g]);

  const stationAgg = useMemo(() => {
    const rows = data?.stationPerformance ?? [];
    const m = new Map<
      number,
      { label: string; total_revenue: number; total_sessions: number; total_energy: number }
    >();
    for (const r of rows) {
      const sid = num(r.station_id);
      const name = str(r.station_name);
      const rev = num(r.total_revenue);
      const sess = num(r.total_sessions);
      const en = num(r.total_energy);
      const cur = m.get(sid) ?? {
        label: name.length > 28 ? `${name.slice(0, 27)}…` : name,
        total_revenue: 0,
        total_sessions: 0,
        total_energy: 0,
      };
      cur.total_revenue += rev;
      cur.total_sessions += sess;
      cur.total_energy += en;
      m.set(sid, cur);
    }
    return [...m.values()].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 20);
  }, [data?.stationPerformance]);

  const cityChart = useMemo(() => {
    return (data?.cityPerformance ?? []).map((r) => ({
      city: str(r.city).slice(0, 18),
      revenue: num(r.total_revenue),
      rate: num(r.operational_rate_pct),
    }));
  }, [data?.cityPerformance]);

  const userMoneyTop = useMemo(() => {
    return [...(data?.userAnalyticsComparison ?? [])]
      .sort((a, b) => num(b.money_last_7d) - num(a.money_last_7d))
      .slice(0, 10)
      .map((r) => ({
        name: `#${r.user_id}`,
        cur: num(r.money_last_7d),
        prev: num(r.money_prev_7d),
      }));
  }, [data?.userAnalyticsComparison]);

  const segmentPie = useMemo(() => {
    const seg = data?.userSegments ?? [];
    const counts = new Map<string, number>();
    for (const r of seg) {
      const s = str(r.user_segment);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }, [data?.userSegments]);

  const sqlDailyTrend = useMemo(() => {
    const rows = ga?.networkRevenueTrendDaily ?? [];
    return rows.map((r) => {
      const raw = r.bucket_date;
      const d = typeof raw === 'string' ? new Date(raw) : raw instanceof Date ? raw : null;
      const label = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }) : str(raw);
      return {
        label,
        revenue: num(r.total_revenue),
        kwh: num(r.total_kwh),
        sessions: num(r.session_count),
      };
    });
  }, [ga?.networkRevenueTrendDaily]);

  const sqlPeakByHour = useMemo(() => {
    const rows = ga?.networkPeakHours ?? [];
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
  }, [ga?.networkPeakHours]);

  const sqlHeatmapTop = useMemo(() => {
    const rows = [...(ga?.networkPeakHours ?? [])];
    return rows
      .map((r) => ({
        dow: Math.floor(num(r.iso_dow)),
        hour: Math.floor(num(r.hour_of_day)),
        n: num(r.session_count),
      }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 12);
  }, [ga?.networkPeakHours]);

  const dayNightLabel = (band: string) =>
    band === 'DAY_WINDOW' ? 'Денне вікно (07–21)' : band === 'NIGHT_WINDOW' ? 'Нічне вікно' : band;

  const sqlPeriodNote = useMemo(() => {
    if (!ga?.periodFrom || !ga?.periodTo) return '';
    try {
      const a = new Date(ga.periodFrom).toLocaleDateString('uk-UA');
      const b = new Date(ga.periodTo).toLocaleDateString('uk-UA');
      return `Останні ${ga.periodDays} днів: ${a} — ${b} (функції Global_admin_analytics.sql).`;
    } catch {
      return '';
    }
  }, [ga?.periodDays, ga?.periodFrom, ga?.periodTo]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      <header className="space-y-2 border-b border-slate-200 pb-6">
        <h1 className={`${globalAdminPageTitle} sm:text-3xl`}>Аналітика мережі</h1>
      </header>

      {loading ? (
        <div className={globalAdminLoadingBanner}>
          <span className={globalAdminLoadingSpinner} />
          Завантаження показників…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-medium">{error}</p>
          <p className="mt-2 text-amber-900/85">
            Якщо дані не з’являються, перевірте, що у PostgreSQL виконано{' '}
            <code className="rounded-md bg-white/80 px-1.5 py-0.5 text-xs font-mono">View.sql</code>,{' '}
            <code className="rounded-md bg-white/80 px-1.5 py-0.5 text-xs font-mono">Station_admin_analytics.sql</code>{' '}
            та <code className="rounded-md bg-white/80 px-1.5 py-0.5 text-xs font-mono">Global_admin_analytics.sql</code>.
          </p>
        </div>
      ) : null}

      {data?.partial ? (
        <p className="text-xs text-gray-500">
          Частина джерел могла бути недоступна — див. журнал сервера.
        </p>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiStat
              label="Дохід сьогодні"
              value={`${todayRev.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} грн`}
              sub="Зведення по станціях у кабінеті"
            />
            <KpiStat
              label="Виручка (30 днів)"
              value={g ? `${num(g.revenue_30d).toLocaleString('uk-UA', { maximumFractionDigits: 0 })} грн` : '—'}
              sub="Сесії з підтвердженим рахунком"
            />
            <KpiStat
              label="Сесії (30 днів)"
              value={g ? num(g.sessions_30d).toLocaleString('uk-UA') : '—'}
              sub="У межах вибраного вікна в БД"
            />
            <KpiStat
              label="Зараз заряджають"
              value={(data?.activeSessions ?? []).length.toLocaleString('uk-UA')}
              sub="Активні сесії"
            />
          </div>

          <SegmentedTabs value={tab} onChange={setTab} />

          {tab === 'pulse' ? (
            <div className="space-y-6">
              <Panel
                title="Динаміка періоду"
                subtitle="Порівняння поточних 30 днів із попередніми 30 днями (лише записи з рахунком)."
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { k: 'Енергія, кВт·год', v: g ? num(g.energy_30d).toLocaleString('uk-UA') : '—' },
                    { k: 'Унікальні авто', v: g ? num(g.unique_cars_30d).toLocaleString('uk-UA') : '—' },
                    { k: 'Δ виручки', v: g ? `${num(g.rev_growth_pct).toFixed(1)} %` : '—' },
                    { k: 'Δ сесій', v: g ? `${num(g.sessions_growth_pct).toFixed(1)} %` : '—' },
                  ].map((x) => (
                    <div
                      key={x.k}
                      className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-slate-50/50 px-4 py-3"
                    >
                      <p className="text-xs font-medium text-gray-500">{x.k}</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{x.v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8 h-56 w-full sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={growthBars} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v}%`} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 12 }}
                        stroke="#64748b"
                      />
                      <Tooltip
                        formatter={(v) => [`${Number(v ?? 0).toFixed(2)} %`, 'Зміна до попереднього періоду']}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                      <Bar dataKey="pct" fill="#059669" radius={[0, 8, 8, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-4 text-xs text-gray-400">
                  Відсотки показують зміну відносно попереднього 30-денного вікна.
                </p>
              </Panel>

              {ga ? (
                <Panel
                  title="Сесії та броні (SQL)"
                  subtitle={sqlPeriodNote || 'Мережеві агрегати з PostgreSQL.'}
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {ga.networkSessionStats ? (
                      <>
                        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                          <p className="text-xs font-medium text-gray-500">Сесій</p>
                          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                            {num(ga.networkSessionStats.total_sessions).toLocaleString('uk-UA')}
                          </p>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                          <p className="text-xs font-medium text-gray-500">Сер. тривалість</p>
                          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                            {ga.networkSessionStats.avg_duration_minutes == null
                              ? '—'
                              : `${num(ga.networkSessionStats.avg_duration_minutes).toFixed(1)} хв`}
                          </p>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                          <p className="text-xs font-medium text-gray-500">Сер. kWh (COMPLETED)</p>
                          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                            {ga.networkSessionStats.avg_kwh == null
                              ? '—'
                              : num(ga.networkSessionStats.avg_kwh).toFixed(2)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                          <p className="text-xs font-medium text-gray-500">Сер. чек</p>
                          <p className="mt-1 text-lg font-semibold tabular-nums text-green-800">
                            {ga.networkSessionStats.avg_bill_amount == null
                              ? '—'
                              : `${num(ga.networkSessionStats.avg_bill_amount).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} грн`}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Немає рядка статистики сесій.</p>
                    )}
                  </div>

                  {stSnap?.networkBookingKpis ? (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
                        <p className="text-xs font-medium text-emerald-900/80">Броні (мережа)</p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-950">
                          {num(stSnap.networkBookingKpis.total_bookings).toLocaleString('uk-UA')}
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
                        <p className="text-xs font-medium text-emerald-900/80">Завершені броні, %</p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-950">
                          {stSnap.networkBookingKpis.pct_completed == null
                            ? '—'
                            : `${num(stSnap.networkBookingKpis.pct_completed).toFixed(1)} %`}
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
                        <p className="text-xs font-medium text-emerald-900/80">No-show, %</p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-950">
                          {stSnap.networkBookingKpis.no_show_rate == null
                            ? '—'
                            : `${num(stSnap.networkBookingKpis.no_show_rate).toFixed(1)} %`}
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
                        <p className="text-xs font-medium text-emerald-900/80">Скасовано</p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-950">
                          {num(stSnap.networkBookingKpis.cnt_cancelled).toLocaleString('uk-UA')}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {ga.networkBookingSessionMetrics ? (
                    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Зв’язок бронювань і сесій
                      </p>
                      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <dt className="text-xs text-slate-500">Броні в інтервалі</dt>
                          <dd className="font-semibold tabular-nums">
                            {num(ga.networkBookingSessionMetrics.total_bookings).toLocaleString('uk-UA')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Броні з сесією, %</dt>
                          <dd className="font-semibold tabular-nums text-green-800">
                            {ga.networkBookingSessionMetrics.pct_bookings_with_session == null
                              ? '—'
                              : `${num(ga.networkBookingSessionMetrics.pct_bookings_with_session).toFixed(1)} %`}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Сесій з броні, %</dt>
                          <dd className="font-semibold tabular-nums text-green-800">
                            {ga.networkBookingSessionMetrics.pct_sessions_from_booking == null
                              ? '—'
                              : `${num(ga.networkBookingSessionMetrics.pct_sessions_from_booking).toFixed(1)} %`}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Сесій (інтервал)</dt>
                          <dd className="font-semibold tabular-nums">
                            {num(ga.networkBookingSessionMetrics.total_sessions).toLocaleString('uk-UA')}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ) : null}

                  <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Денна виручка (SQL)</p>
                      <div className="mt-2 h-56 w-full sm:h-64">
                        {sqlDailyTrend.length === 0 ? (
                          <p className="flex h-full items-center justify-center text-sm text-gray-500">
                            Немає денних точок
                          </p>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sqlDailyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" interval="preserveStartEnd" />
                              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                              <Tooltip
                                formatter={(v) => [`${Number(v ?? 0).toLocaleString('uk-UA')} грн`, 'Виручка']}
                                contentStyle={{ borderRadius: 12, fontSize: 12 }}
                              />
                              <Line type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} dot />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        Проксі тарифу: день / ніч (за годиною старту)
                      </p>
                      <div className="mt-2 h-56 w-full sm:h-64">
                        {(ga.networkDayNightRevenue ?? []).length === 0 ? (
                          <p className="flex h-full items-center justify-center text-sm text-gray-500">Немає даних</p>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ga.networkDayNightRevenue} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                              <XAxis
                                dataKey="band"
                                tickFormatter={(v) => dayNightLabel(String(v))}
                                tick={{ fontSize: 11 }}
                                stroke="#94a3b8"
                              />
                              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                              <Tooltip
                                labelFormatter={(v) => dayNightLabel(String(v))}
                                formatter={(v) => [`${Number(v ?? 0).toLocaleString('uk-UA')} грн`, 'Виручка']}
                                contentStyle={{ borderRadius: 12, fontSize: 12 }}
                              />
                              <Bar dataKey="total_revenue" fill="#0d9488" name="грн" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>
                </Panel>
              ) : null}
            </div>
          ) : null}

          {tab === 'network' ? (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Виручка по містах" subtitle="Сума рахунків, пов’язаних із сесіями в місті.">
                  <div className="h-64 w-full sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cityChart} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="city" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip
                          formatter={(v) => [`${Number(v ?? 0).toLocaleString('uk-UA')} грн`, '']}
                          contentStyle={{ borderRadius: 12, fontSize: 12 }}
                        />
                        <Bar dataKey="revenue" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
                <Panel
                  title="Доступність станцій"
                  subtitle="Частка станцій у статусі «На лінії» (WORK) по місту."
                >
                  <div className="h-64 w-full sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={cityChart}
                        layout="vertical"
                        margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" unit="%" />
                        <YAxis type="category" dataKey="city" width={100} tick={{ fontSize: 11 }} stroke="#64748b" />
                        <Tooltip formatter={(v) => [`${Number(v ?? 0).toFixed(1)} %`, 'WORK']} />
                        <Bar dataKey="rate" fill="#10b981" radius={[0, 6, 6, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </div>

              <Panel
                title="Станції за останні 30 днів"
                subtitle="Порти зведені по кожній станції: сесії, енергія, виручка."
              >
                <ScrollTable maxHeight="min(26rem,60vh)">
                  <thead className="sticky top-0 z-10 bg-slate-100/95 text-xs font-semibold uppercase tracking-wide text-slate-600 backdrop-blur">
                    <tr>
                      <th className="px-4 py-3">Станція</th>
                      <th className="px-4 py-3 text-right">Сесії</th>
                      <th className="px-4 py-3 text-right">кВт·год</th>
                      <th className="px-4 py-3 text-right">Виручка</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {stationAgg.map((s) => (
                      <tr key={s.label} className="hover:bg-green-50/40">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{s.label}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                          {s.total_sessions.toLocaleString('uk-UA')}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                          {s.total_energy.toLocaleString('uk-UA')}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-900">
                          {s.total_revenue.toLocaleString('uk-UA', { maximumFractionDigits: 2 })} грн
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </ScrollTable>
              </Panel>

              {ga ? (
                <>
                  <Panel
                    title="Гарячі міста (SQL)"
                    subtitle="Найбільше сесій за період; стовпчик — сесій на одну станцію в місті."
                  >
                    <div className="h-64 w-full sm:h-72">
                      {(ga.networkCityHotspots ?? []).length === 0 ? (
                        <p className="py-16 text-center text-sm text-gray-500">Немає даних.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={(ga.networkCityHotspots ?? []).map((r) => ({
                              city: str(r.city).slice(0, 14),
                              intensity: num(r.sessions_per_station),
                              sessions: num(r.session_count),
                            }))}
                            layout="vertical"
                            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                            <YAxis type="category" dataKey="city" width={100} tick={{ fontSize: 11 }} stroke="#64748b" />
                            <Tooltip
                              formatter={(v, name) =>
                                name === 'intensity'
                                  ? [`${Number(v ?? 0).toFixed(2)}`, 'Сесій / станцію']
                                  : [`${Number(v ?? 0).toLocaleString('uk-UA')}`, 'Сесій']
                              }
                              contentStyle={{ borderRadius: 12, fontSize: 12 }}
                            />
                            <Bar dataKey="intensity" fill="#6366f1" radius={[0, 6, 6, 0]} name="Інтенсивність" />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </Panel>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <Panel title="ТОП станцій за сесіями (SQL)" subtitle="Той самий період, що й у блоках вище.">
                      <ScrollTable maxHeight="min(16rem,40vh)">
                        <thead className="sticky top-0 z-10 bg-slate-100/95 text-xs font-semibold uppercase text-slate-600">
                          <tr>
                            <th className="px-3 py-2.5">Станція</th>
                            <th className="px-3 py-2.5 text-right">Сесії</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {(stSnap?.networkTopStations ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={2} className="px-3 py-6 text-center text-gray-500">
                                Немає даних
                              </td>
                            </tr>
                          ) : (
                            (stSnap?.networkTopStations ?? []).map((r) => (
                              <tr key={`sql-top-${num(r.station_id)}`}>
                                <td className="px-3 py-2 font-medium text-slate-900">{str(r.station_name)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{num(r.session_count).toLocaleString('uk-UA')}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </ScrollTable>
                    </Panel>
                    <Panel title="Найменше сесій (SQL)" subtitle="Для пошуку слабких точок мережі.">
                      <ScrollTable maxHeight="min(16rem,40vh)">
                        <thead className="sticky top-0 z-10 bg-slate-100/95 text-xs font-semibold uppercase text-slate-600">
                          <tr>
                            <th className="px-3 py-2.5">Станція</th>
                            <th className="px-3 py-2.5 text-right">Сесії</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {(stSnap?.networkBottomStations ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={2} className="px-3 py-6 text-center text-gray-500">
                                Немає даних
                              </td>
                            </tr>
                          ) : (
                            (stSnap?.networkBottomStations ?? []).map((r) => (
                              <tr key={`sql-bot-${num(r.station_id)}`}>
                                <td className="px-3 py-2 font-medium text-slate-900">{str(r.station_name)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{num(r.session_count).toLocaleString('uk-UA')}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </ScrollTable>
                    </Panel>
                  </div>

                  <Panel title="Пікові години мережі (SQL)" subtitle="Сума стартів сесій по годині доби за період.">
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sqlPeakByHour} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="#94a3b8" interval={2} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                          <Bar dataKey="sessions" fill="#8b5cf6" name="Сесії" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  <Panel
                    title="Топ комірок «день × година»"
                    subtitle="Де найчастіше стартували сесії (проксі heatmap)."
                  >
                    <ScrollTable maxHeight="min(14rem,36vh)">
                      <thead className="sticky top-0 bg-slate-100/95 text-xs font-semibold uppercase text-slate-600">
                        <tr>
                          <th className="px-3 py-2">День</th>
                          <th className="px-3 py-2">Година</th>
                          <th className="px-3 py-2 text-right">Сесій</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {sqlHeatmapTop.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                              Немає даних
                            </td>
                          </tr>
                        ) : (
                          sqlHeatmapTop.map((row, i) => (
                            <tr key={`${row.dow}-${row.hour}-${i}`}>
                              <td className="px-3 py-2">{DOW_UK[row.dow] ?? row.dow}</td>
                              <td className="px-3 py-2 tabular-nums">{String(row.hour).padStart(2, '0')}:00</td>
                              <td className="px-3 py-2 text-right font-medium tabular-nums">{row.n.toLocaleString('uk-UA')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </ScrollTable>
                  </Panel>

                  <Panel title="Виручка по станціях (SQL)" subtitle="За той самий 30-денний інтервал; середній чек по рахунках.">
                    <ScrollTable maxHeight="min(22rem,50vh)">
                      <thead className="sticky top-0 z-10 bg-slate-100/95 text-xs font-semibold uppercase text-slate-600">
                        <tr>
                          <th className="px-3 py-2.5">Станція</th>
                          <th className="px-3 py-2.5 text-right">Сесії</th>
                          <th className="px-3 py-2.5 text-right">кВт·год</th>
                          <th className="px-3 py-2.5 text-right">Виручка</th>
                          <th className="px-3 py-2.5 text-right">Сер. чек</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {(ga.networkRevenueByStation ?? []).filter((r) => num(r.session_count) > 0).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                              Немає сесій за період
                            </td>
                          </tr>
                        ) : (
                          (ga.networkRevenueByStation ?? [])
                            .filter((r) => num(r.session_count) > 0)
                            .slice(0, 40)
                            .map((r) => (
                              <tr key={`sql-st-${num(r.station_id)}`}>
                                <td className="max-w-[200px] truncate px-3 py-2 font-medium">{str(r.station_name)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{num(r.session_count).toLocaleString('uk-UA')}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{num(r.total_kwh).toFixed(1)}</td>
                                <td className="px-3 py-2 text-right tabular-nums font-semibold">
                                  {num(r.total_revenue).toLocaleString('uk-UA', { maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                                  {r.avg_bill_amount == null ? '—' : num(r.avg_bill_amount).toFixed(2)}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </ScrollTable>
                  </Panel>

                  <Panel title="Топ портів за виручкою (SQL)" subtitle="До 500 портів із найвищою сумою за період.">
                    <ScrollTable maxHeight="min(22rem,50vh)">
                      <thead className="sticky top-0 z-10 bg-slate-100/95 text-xs font-semibold uppercase text-slate-600">
                        <tr>
                          <th className="px-3 py-2.5">Станція</th>
                          <th className="px-3 py-2.5 text-center">Порт</th>
                          <th className="px-3 py-2.5 text-right">Сесії</th>
                          <th className="px-3 py-2.5 text-right">кВт·год</th>
                          <th className="px-3 py-2.5 text-right">Виручка</th>
                          <th className="px-3 py-2.5 text-right">Сер. чек</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {(ga.networkRevenueByPort ?? []).filter((r) => num(r.session_count) > 0).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                              Немає даних
                            </td>
                          </tr>
                        ) : (
                          (ga.networkRevenueByPort ?? [])
                            .filter((r) => num(r.session_count) > 0)
                            .slice(0, 60)
                            .map((r, i) => (
                              <tr key={`sql-port-${num(r.station_id)}-${num(r.port_number)}-${i}`}>
                                <td className="max-w-[180px] truncate px-3 py-2">{str(r.station_name)}</td>
                                <td className="px-3 py-2 text-center tabular-nums">{num(r.port_number)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{num(r.session_count)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{num(r.total_kwh).toFixed(1)}</td>
                                <td className="px-3 py-2 text-right tabular-nums font-medium">
                                  {num(r.total_revenue).toLocaleString('uk-UA', { maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                                  {r.avg_bill_amount == null ? '—' : num(r.avg_bill_amount).toFixed(2)}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </ScrollTable>
                  </Panel>
                </>
              ) : null}
            </div>
          ) : null}

          {tab === 'users' ? (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Розподіл за активністю" subtitle="Сегменти користувачів за кількістю сесій.">
                  <div className="h-64 w-full">
                    {segmentPie.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={segmentPie}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={88}
                            paddingAngle={2}
                          >
                            {segmentPie.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="py-16 text-center text-sm text-gray-500">Недостатньо даних для діаграми.</p>
                    )}
                  </div>
                </Panel>
                <Panel
                  title="Оплати за тиждень"
                  subtitle="Поточні 7 днів порівняно з попередніми 7 днями (суми з рахунків)."
                >
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={userMoneyTop} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${Number(v ?? 0).toFixed(2)} грн`, '']} />
                        <Legend />
                        <Bar dataKey="cur" fill="#34d399" name="Поточний тиждень" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="prev" fill="#93c5fd" name="Попередній тиждень" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </div>

              <Panel
                title="Улюблені станції (90 днів)"
                subtitle="Топ зв’язок користувач — станція за енергією та візитами."
              >
                <ScrollTable>
                  <thead className="sticky top-0 z-10 bg-slate-100/95 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5">Користувач</th>
                      <th className="px-3 py-2.5">Станція</th>
                      <th className="px-3 py-2.5 text-right">Візити</th>
                      <th className="px-3 py-2.5 text-right">кВт·год</th>
                      <th className="px-3 py-2.5 text-right">Сума</th>
                      <th className="px-3 py-2.5 text-right">Ранг</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {(data?.userStationLoyalty ?? []).slice(0, 35).map((r, i) => (
                      <tr key={`${r.user_id}-${r.station_id}-${i}`} className="hover:bg-green-50/30">
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">{str(r.user_id)}</td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-slate-900">{str(r.station_name)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(r.visit_count)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(r.total_energy).toFixed(1)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(r.total_spent).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{num(r.preference_rank)}</td>
                      </tr>
                    ))}
                  </tbody>
                </ScrollTable>
              </Panel>

              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Автопарк (фрагмент)" subtitle="Накопичені зарядки та енергія по авто.">
                  <ScrollTable maxHeight="min(20rem,50vh)">
                    <thead className="sticky top-0 bg-slate-100/95 text-xs font-semibold uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5">Авто</th>
                        <th className="px-3 py-2.5 text-right">Зарядок</th>
                        <th className="px-3 py-2.5 text-right">кВт·год</th>
                        <th className="px-3 py-2.5 text-right">За 30 д.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {(data?.userVehicleStats ?? []).slice(0, 25).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/80">
                          <td className="px-3 py-2">
                            <span className="font-medium text-slate-900">{str(r.car_name)}</span>
                            <span className="text-gray-400"> · </span>
                            <span className="font-mono text-xs text-gray-600">{str(r.license_plate)}</span>
                          </td>
                          <td className="px-3 py-2 text-right">{num(r.total_charges)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{num(r.total_kwh).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{num(r.charges_last_30d)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </ScrollTable>
                </Panel>
                <Panel title="Картка клієнта" subtitle="Сегмент, оборот і остання сесія.">
                  <ScrollTable maxHeight="min(20rem,50vh)">
                    <thead className="sticky top-0 bg-slate-100/95 text-xs font-semibold uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5">Ім’я</th>
                        <th className="px-3 py-2.5">Сегмент</th>
                        <th className="px-3 py-2.5 text-right">Сесії</th>
                        <th className="px-3 py-2.5 text-right">кВт·год</th>
                        <th className="px-3 py-2.5 text-right">Витрати</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {(data?.userSegments ?? []).slice(0, 30).map((r) => (
                        <tr key={str(r.user_id)} className="hover:bg-slate-50/80">
                          <td className="px-3 py-2 text-slate-900">{str(r.full_name)}</td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
                              {str(r.user_segment)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{num(r.total_sessions)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{num(r.total_kwh).toFixed(1)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">
                            {num(r.total_spent).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </ScrollTable>
                </Panel>
              </div>
            </div>
          ) : null}

          {tab === 'live' ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Активні зарядки" subtitle="Сесії зі статусом «Активна» зараз.">
                <ScrollTable maxHeight="min(26rem,55vh)">
                  <thead className="sticky top-0 z-10 bg-slate-100/95 text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5">ID</th>
                      <th className="px-3 py-2.5">Станція</th>
                      <th className="px-3 py-2.5 text-center">Порт</th>
                      <th className="px-3 py-2.5 text-right">кВт·год</th>
                      <th className="px-3 py-2.5">Початок</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {(data?.activeSessions ?? []).map((r) => (
                      <tr key={str(r.session_id)} className="hover:bg-sky-50/50">
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">{str(r.session_id)}</td>
                        <td className="max-w-[140px] truncate px-3 py-2 text-slate-900">{str(r.station_name)}</td>
                        <td className="px-3 py-2 text-center tabular-nums">{num(r.port_number)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(r.kwh_consumed).toFixed(3)}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{fmtDate(r.start_time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </ScrollTable>
              </Panel>
              <Panel title="Майбутні бронювання" subtitle="Підтверджені слоти, кінець яких ще попереду.">
                <ScrollTable maxHeight="min(26rem,55vh)">
                  <thead className="sticky top-0 z-10 bg-slate-100/95 text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5">ID</th>
                      <th className="px-3 py-2.5">Станція</th>
                      <th className="px-3 py-2.5">Початок</th>
                      <th className="px-3 py-2.5">Кінець</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {(data?.upcomingBookings ?? []).map((r) => (
                      <tr key={str(r.booking_id)} className="hover:bg-amber-50/40">
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">{str(r.booking_id)}</td>
                        <td className="max-w-[160px] truncate px-3 py-2">{str(r.station_name)}</td>
                        <td className="px-3 py-2 text-xs text-gray-800">{fmtDate(r.start_time)}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(r.end_time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </ScrollTable>
              </Panel>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
