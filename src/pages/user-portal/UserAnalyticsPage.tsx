import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard } from '../../components/station-admin/Primitives';

export default function UserAnalyticsPage() {
  const { sessions, payments } = useUserPortal();

  const byStation = useMemo(() => {
    const map = new Map<string, { name: string; kwh: number; cost: number }>();
    for (const s of sessions) {
      const cur = map.get(s.stationId) ?? { name: s.stationName, kwh: 0, cost: 0 };
      cur.kwh += s.kwh;
      cur.cost += s.cost;
      map.set(s.stationId, cur);
    }
    return [...map.values()]
      .map((v) => ({
        label: v.name.length > 16 ? `${v.name.slice(0, 15)}…` : v.name,
        kwh: Math.round(v.kwh * 10) / 10,
        cost: Math.round(v.cost * 100) / 100,
      }))
      .sort((a, b) => b.kwh - a.kwh);
  }, [sessions]);

  const trend = useMemo(() => {
    const months = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер'];
    return months.map((m, i) => ({
      m,
      spend: [120, 145, 186, 160, 210, 198][i] ?? 0,
      kwh: [18, 21, 27, 23, 30, 28][i] ?? 0,
    }));
  }, []);

  const totalKwh = useMemo(() => sessions.reduce((a, s) => a + s.kwh, 0), [sessions]);
  const totalPaid = useMemo(
    () => payments.filter((p) => p.status === 'success').reduce((a, p) => a + p.amount, 0),
    [payments]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Аналітика</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ваші сесії та витрати. Частина графіків — ілюстративні (демо).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Усього заряджено</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalKwh.toFixed(1)} кВт·год</p>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сплачено (успіх)</p>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {totalPaid.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн
          </p>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сесій у історії</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{sessions.length}</p>
        </AppCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AppCard>
          <h2 className="text-sm font-semibold text-gray-900">Витрати по місяцях (демо)</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip
                  formatter={(v) => [`${Number(v ?? 0).toLocaleString('uk-UA')} грн`, 'Витрати']}
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="spend" stroke="#16a34a" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AppCard>
        <AppCard>
          <h2 className="text-sm font-semibold text-gray-900">Енергія по місяцях (демо)</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="kwh" fill="#86efac" radius={[6, 6, 0, 0]} name="кВт·год" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AppCard>
      </div>

      <AppCard>
        <h2 className="text-sm font-semibold text-gray-900">Накопичено по станціях (з історії сесій)</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byStation} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 9 }} stroke="#9ca3af" />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="kwh" fill="#22c55e" radius={[0, 6, 6, 0]} name="кВт·год" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AppCard>
    </div>
  );
}
