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
} from '../../api/adminAnalytics';
import { ApiError } from '../../api/http';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { stationStatusLabel, stationStatusTone } from '../../utils/stationLabels';

function shortLabel(name: string, max = 20) {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

type AnalyticsTab = 'trends' | 'stations';

const tabClass = (active: boolean) =>
  `relative shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
    active
      ? 'border-green-600 text-green-800'
      : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800'
  }`;

export default function StationAnalyticsPage() {
  const { stations } = useStations();
  const { bookings, sessions, loading: networkLoading } = useStationAdminNetwork();
  const [tab, setTab] = useState<AnalyticsTab>('trends');
  const [analyticsData, setAnalyticsData] = useState<AdminAnalyticsViewsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    void fetchAdminAnalyticsViews()
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
  }, []);

  const g = analyticsData?.globalDashboard ?? null;

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

  const growthBars = useMemo(() => {
    if (!g) return [];
    return [
      { name: 'Виручка', pct: num(g.rev_growth_pct) },
      { name: 'Енергія', pct: num(g.energy_growth_pct) },
      { name: 'Авто (унік.)', pct: num(g.cars_growth_pct) },
      { name: 'Сесії', pct: num(g.sessions_growth_pct) },
    ];
  }, [g]);

  const activeStations = useMemo(() => stations.filter((s) => !s.archived), [stations]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Аналітика</h1>
      </div>

      {analyticsLoading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100/80 bg-emerald-50/30 px-5 py-4 text-sm text-emerald-900">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          Завантаження аналітики з БД…
        </div>
      ) : null}

      {analyticsError ? (
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-medium">{analyticsError}</p>
          <p className="mt-2 text-amber-900/85">
            Переконайтеся, що у PostgreSQL застосовано скрипт{' '}
            <code className="rounded-md bg-white/80 px-1.5 py-0.5 text-xs font-mono">View.sql</code>.
          </p>
        </div>
      ) : null}

      {!analyticsLoading && g ? (
        <AppCard className="!p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Мережа (30 днів, VIEW)</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">Виручка</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-green-700">
                {num(g.revenue_30d).toLocaleString('uk-UA', { maximumFractionDigits: 0 })} грн
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Сесії</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900">
                {num(g.sessions_30d).toLocaleString('uk-UA')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Енергія</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900">
                {num(g.energy_30d).toLocaleString('uk-UA', { maximumFractionDigits: 1 })} кВт·год
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Унікальні авто</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900">
                {num(g.unique_cars_30d).toLocaleString('uk-UA')}
              </p>
            </div>
          </div>
        </AppCard>
      ) : null}

      {analyticsData?.partial ? (
        <p className="text-xs text-gray-500">Частина джерел могла бути недоступна — див. журнал сервера.</p>
      ) : null}

      <section aria-labelledby="network-activity-heading">
        <h2 id="network-activity-heading" className="mb-3 text-sm font-semibold text-gray-900">
          Активність мережі (БД)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AppCard className="!p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Бронювання</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {networkLoading ? '…' : bookings.length}
            </p>
            <Link
              to="/station-dashboard/bookings"
              className="mt-2 inline-block text-sm font-semibold text-green-700 hover:text-green-800"
            >
              Список бронювань
            </Link>
          </AppCard>
          <AppCard className="!p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сесії</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {networkLoading ? '…' : sessions.length}
            </p>
            <Link
              to="/station-dashboard/sessions"
              className="mt-2 inline-block text-sm font-semibold text-green-700 hover:text-green-800"
            >
              Список сесій
            </Link>
          </AppCard>
          <AppCard className="!p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Енергія (усі сесії)</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {networkLoading
                ? '…'
                : `${sessionEnergyTotal.toLocaleString('uk-UA', { maximumFractionDigits: 1 })} кВт·год`}
            </p>
          </AppCard>
          <AppCard className="!p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сума по рахунках</p>
            <p className="mt-1 text-2xl font-bold text-green-800">
              {networkLoading
                ? '…'
                : `${sessionCostTotal.toLocaleString('uk-UA', { maximumFractionDigits: 2 })} грн`}
            </p>
            <p className="mt-1 text-xs text-gray-500">За сесіями з виставленим bill</p>
          </AppCard>
        </div>
      </section>

      <section aria-labelledby="analytics-overview-heading">
        <h2 id="analytics-overview-heading" className="mb-3 text-sm font-semibold text-gray-900">
          Огляд мережі
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AppCard className="!p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Станцій у мережі</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{totalStations}</p>
          </AppCard>
          <AppCard className="!p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Дохід сьогодні</p>
            <p className="mt-1 text-3xl font-bold text-green-700">
              {todayRev.toLocaleString('uk-UA')} грн
            </p>
           
          </AppCard>
          <AppCard className="!p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сесії сьогодні</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{todaySess}</p>
          </AppCard>
          <AppCard className="!p-5">
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
          </AppCard>
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
          <AppCard>
            <h2 className="text-sm font-semibold text-gray-900">Виручка по містах</h2>
            <p className="mt-1 text-xs text-gray-500">Дані з VIEW (агрегат по місту)</p>
            <div className="mt-4 h-72">
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
          </AppCard>

          <AppCard>
            <h2 className="text-sm font-semibold text-gray-900">Динаміка періоду</h2>
            <p className="mt-1 text-xs text-gray-500">Поточні 30 днів vs попередні 30 днів, %</p>
            <div className="mt-4 h-72">
              {growthBars.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-gray-500">
                  Немає зведення global dashboard
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthBars} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} stroke="#64748b" />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                      formatter={(v) => {
                        const n = typeof v === 'number' ? v : Number(v);
                        return [`${(Number.isFinite(n) ? n : 0).toFixed(1)} %`, 'Δ'];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="pct" fill="#0ea5e9" name="Зміна, %" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </AppCard>
        </div>
      ) : null}

      {tab === 'stations' ? (
      <AppCard padding={false} className="overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">По кожній станції сьогодні</h2>
         
        </div>
        <div className="grid gap-6 p-4 lg:grid-cols-2 lg:p-6">
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
                  <td className="px-6 py-3 font-medium text-gray-900" title={row.fullName}>
                    {row.fullName}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{row.city}</td>
                  <td className="px-6 py-3">
                    <StatusPill tone={stationStatusTone(row.status)}>
                      {stationStatusLabel(row.status)}
                    </StatusPill>
                  </td>
                  <td className="px-6 py-3 tabular-nums text-gray-800">{row.sessions}</td>
                  <td className="px-6 py-3 tabular-nums font-medium text-gray-900">
                    {row.revenue.toLocaleString('uk-UA')} грн
                  </td>
                  <td className="px-6 py-3 tabular-nums text-gray-700">
                    {row.energy.toLocaleString('uk-UA')}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{row.ports}</td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      to={`/station-dashboard/stations/${row.id}`}
                      className="text-sm font-semibold text-green-600 hover:text-green-700"
                    >
                      Деталі
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AppCard>
      ) : null}
    </div>
  );
}
