import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStations } from '../../context/StationsContext';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { stationStatusLabel, stationStatusTone } from '../../utils/stationLabels';

const WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((day, i) => ({
  day,
  revenue: [8200, 9100, 7800, 11200, 12400, 15600, 13200][i],
  sessions: [118, 124, 98, 142, 156, 188, 165][i],
}));

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
  const [tab, setTab] = useState<AnalyticsTab>('trends');

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Аналітика</h1>
        <p className="mt-1 text-sm text-gray-500">
          Огляд мережі завжди зверху; детальні графіки — у вкладках нижче.
        </p>
      </div>

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
            <p className="mt-1 text-xs font-medium text-emerald-600">+22% до вчора (демо)</p>
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
          Тиждень (демо)
        </button>
        <button type="button" className={tabClass(tab === 'stations')} onClick={() => setTab('stations')}>
          По станціях
        </button>
      </nav>

      {tab === 'trends' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <AppCard>
            <h2 className="text-sm font-semibold text-gray-900">Дохід по днях тижня</h2>
            <p className="mt-1 text-xs text-gray-500">грн, демо</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={WEEK} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Дохід"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ fill: '#16a34a', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </AppCard>

          <AppCard>
            <h2 className="text-sm font-semibold text-gray-900">Кількість сесій</h2>
            <p className="mt-1 text-xs text-gray-500">по днях тижня (демо)</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={WEEK} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sessions" name="Сесії" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AppCard>
        </div>
      ) : null}

      {tab === 'stations' ? (
      <AppCard padding={false} className="overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">По кожній станції (сьогодні)</h2>
          <p className="mt-1 text-xs text-gray-500">
            Дохід, сесії та енергія за добу з мок-даних; натисніть «Деталі» для картки станції.
          </p>
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
