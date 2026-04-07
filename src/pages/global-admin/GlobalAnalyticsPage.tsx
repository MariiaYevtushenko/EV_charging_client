import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
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
import { useGlobalAdmin } from '../../context/GlobalAdminContext';
import { AppCard } from '../../components/station-admin/Primitives';

const MONTHLY = [
  { m: 'Січ', revenue: 182_000, sessions: 2100, energy: 42000 },
  { m: 'Лют', revenue: 195_400, sessions: 2280, energy: 45100 },
  { m: 'Бер', revenue: 210_200, sessions: 2410, energy: 48900 },
  { m: 'Кві', revenue: 198_800, sessions: 2320, energy: 46200 },
  { m: 'Тра', revenue: 225_600, sessions: 2580, energy: 51000 },
  { m: 'Чер', revenue: 240_100, sessions: 2720, energy: 53800 },
];

const PIE_COLORS = ['#22c55e', '#94a3b8', '#f59e0b', '#38bdf8'];

type Tab = 'revenue' | 'network' | 'users';

const tabClass = (active: boolean) =>
  `relative shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
    active
      ? 'border-green-600 text-green-800'
      : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800'
  }`;

export default function GlobalAnalyticsPage() {
  const { stations } = useStations();
  const { endUsers, allPayments } = useGlobalAdmin();
  const [tab, setTab] = useState<Tab>('revenue');

  const active = useMemo(() => stations.filter((s) => !s.archived), [stations]);
  const statusPie = useMemo(
    () => [
      { name: 'Працює', value: active.filter((s) => s.status === 'working').length },
      { name: 'Оффлайн', value: active.filter((s) => s.status === 'offline').length },
      { name: 'Обслуговування', value: active.filter((s) => s.status === 'maintenance').length },
    ],
    [active]
  );

  const userActivity = useMemo(
    () =>
      [...endUsers]
        .map((u) => ({
          name: u.name.split(' ')[0],
          charges: u.charges.length,
          payments: u.payments.length,
        }))
        .sort((a, b) => b.charges - a.charges),
    [endUsers]
  );

  const paymentSplit = useMemo(() => {
    const ok = allPayments.filter((p) => p.status === 'success').length;
    const pend = allPayments.filter((p) => p.status === 'pending').length;
    const fail = allPayments.filter((p) => p.status === 'failed').length;
    return [
      { name: 'Успіх', value: ok },
      { name: 'Очікується', value: pend },
      { name: 'Помилка', value: fail },
    ].filter((x) => x.value > 0);
  }, [allPayments]);

  const todayRev = active.reduce((a, s) => a + s.todayRevenue, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Аналітика та статистика</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Дохід сьогодні</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{todayRev.toLocaleString('uk-UA')} грн</p>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Станцій активних</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{active.length}</p>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Користувачів</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{endUsers.length}</p>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Платежів у вибірці</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{allPayments.length}</p>
        </AppCard>
      </div>

      <nav
        className="-mx-1 flex gap-6 overflow-x-auto border-b border-gray-200 px-1"
        aria-label="Типи аналітики"
      >
        <button type="button" className={tabClass(tab === 'revenue')} onClick={() => setTab('revenue')}>
          Доходи та енергія
        </button>
        <button type="button" className={tabClass(tab === 'network')} onClick={() => setTab('network')}>
          Мережа станцій
        </button>
        <button type="button" className={tabClass(tab === 'users')} onClick={() => setTab('users')}>
          Користувачі та платежі
        </button>
      </nav>

      {tab === 'revenue' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <AppCard>
            <h2 className="text-sm font-semibold text-gray-900">Дохід по місяцях  </h2>
            <p className="mt-1 text-xs text-gray-500">Лінійний тренд як у макеті «Статистика заряджень».</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MONTHLY} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    formatter={(v) => [
                      `${Number(v ?? 0).toLocaleString('uk-UA')} грн`,
                      'Дохід',
                    ]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </AppCard>
          <AppCard>
            <h2 className="text-sm font-semibold text-gray-900">Енергія та сесії</h2>
            <p className="mt-1 text-xs text-gray-500">Стовпчикова діаграма (кВт·год / сесії).</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHLY} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="energy" fill="#86efac" name="кВт·год" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="sessions" fill="#0ea5e9" name="Сесії" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AppCard>
          <AppCard className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900">Накопичувальна динаміка доходу</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MONTHLY} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip
                    formatter={(v) => [`${Number(v ?? 0).toLocaleString('uk-UA')} грн`, '']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#15803d"
                    fill="url(#fillRev)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AppCard>
        </div>
      ) : null}

      {tab === 'network' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <AppCard>
            <h2 className="text-sm font-semibold text-gray-900">Станції за статусом</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {statusPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </AppCard>
          <AppCard>
            <h2 className="text-sm font-semibold text-gray-900">Дохід сьогодні по станціях</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...active]
                    .sort((a, b) => b.todayRevenue - a.todayRevenue)
                    .map((s) => ({
                      label: s.name.length > 18 ? `${s.name.slice(0, 17)}…` : s.name,
                      rev: s.todayRevenue,
                    }))}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={120}
                    tick={{ fontSize: 9 }}
                    stroke="#9ca3af"
                  />
                  <Tooltip
                    formatter={(v) => [
                      `${Number(v ?? 0).toLocaleString('uk-UA')} грн`,
                      'Дохід',
                    ]}
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="rev" fill="#22c55e" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AppCard>
        </div>
      ) : null}

      {tab === 'users' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <AppCard>
            <h2 className="text-sm font-semibold text-gray-900">Активність користувачів  </h2>
            <p className="mt-1 text-xs text-gray-500">Кількість зарядок і платежів (за завантаженими даними).</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userActivity} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="charges" fill="#34d399" name="Зарядки" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="payments" fill="#60a5fa" name="Платежі" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AppCard>
          <AppCard>
            <h2 className="text-sm font-semibold text-gray-900">Статуси платежів</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentSplit}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {paymentSplit.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </AppCard>
        </div>
      ) : null}
    </div>
  );
}
