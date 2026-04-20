import { useEffect, useMemo, useState, type ReactNode } from 'react';
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

const PIE_COLORS = ['#16a34a', '#64748b', '#d97706', '#0284c7', '#7c3aed', '#e11d48'];

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
  accent = 'slate',
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'green' | 'sky' | 'slate' | 'amber';
}) {
  const ring =
    accent === 'green'
      ? 'ring-green-500/20'
      : accent === 'sky'
        ? 'ring-sky-500/20'
        : accent === 'amber'
          ? 'ring-amber-500/20'
          : 'ring-slate-400/15';
  return (
    <div
      className={`rounded-2xl border border-gray-100/90 bg-white p-5 shadow-sm ring-1 ${ring} transition hover:shadow-md`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {sub ? <p className="mt-1 text-xs text-gray-500">{sub}</p> : null}
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
  empty,
  maxHeight = 'min(22rem,55vh)',
}: {
  children: ReactNode;
  empty?: boolean;
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
            Якщо дані не з’являються, перевірте, що у PostgreSQL виконано скрипт{' '}
            <code className="rounded-md bg-white/80 px-1.5 py-0.5 text-xs font-mono">View.sql</code>.
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
              accent="green"
            />
            <KpiStat
              label="Виручка (30 днів)"
              value={g ? `${num(g.revenue_30d).toLocaleString('uk-UA', { maximumFractionDigits: 0 })} грн` : '—'}
              sub="Сесії з підтвердженим рахунком"
              accent="slate"
            />
            <KpiStat
              label="Сесії (30 днів)"
              value={g ? num(g.sessions_30d).toLocaleString('uk-UA') : '—'}
              sub="У межах вибраного вікна в БД"
              accent="slate"
            />
            <KpiStat
              label="Зараз заряджають"
              value={(data?.activeSessions ?? []).length.toLocaleString('uk-UA')}
              sub="Активні сесії"
              accent="sky"
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
                <ScrollTable empty={stationAgg.length === 0} maxHeight="min(26rem,60vh)">
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
                <ScrollTable empty={(data?.userStationLoyalty ?? []).length === 0}>
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
                  <ScrollTable empty={(data?.userVehicleStats ?? []).length === 0} maxHeight="min(20rem,50vh)">
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
                  <ScrollTable empty={(data?.userSegments ?? []).length === 0} maxHeight="min(20rem,50vh)">
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
                <ScrollTable empty={(data?.activeSessions ?? []).length === 0} maxHeight="min(26rem,55vh)">
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
                <ScrollTable empty={(data?.upcomingBookings ?? []).length === 0} maxHeight="min(26rem,55vh)">
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
