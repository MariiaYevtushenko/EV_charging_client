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
import { UserPortalChartEmpty } from '../../components/user-portal/UserPortalEmptyState';
import { AppCard } from '../../components/station-admin/Primitives';
import { useUserPortal } from '../../context/UserPortalContext';
import { userPortalListPageShell } from '../../styles/userPortalTheme';

function ChartLineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3 3v18h18M7 15l3-3 4 4 5-7"
      />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 19V9m4 10V5m4 14v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

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

  /** Агрегати по календарних місяцях (останні 12 місяців з даними). */
  const trend = useMemo(() => {
    const buckets = new Map<string, { spend: number; kwh: number }>();
    for (const s of sessions) {
      const d = new Date(s.startedAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const cur = buckets.get(key) ?? { spend: 0, kwh: 0 };
      cur.spend += s.cost;
      cur.kwh += s.kwh;
      buckets.set(key, cur);
    }
    const sorted = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const last = sorted.slice(-12);
    return last.map(([ym, v]) => {
      const [y, mo] = ym.split('-').map(Number);
      const label = new Date(y, mo - 1, 1).toLocaleDateString('uk-UA', {
        month: 'short',
        year: 'numeric',
      });
      return {
        m: label,
        spend: Math.round(v.spend * 100) / 100,
        kwh: Math.round(v.kwh * 10) / 10,
      };
    });
  }, [sessions]);

  const totalKwh = useMemo(() => sessions.reduce((a, s) => a + s.kwh, 0), [sessions]);
  const totalPaid = useMemo(
    () => payments.filter((p) => p.status === 'success').reduce((a, p) => a + p.amount, 0),
    [payments]
  );

  return (
    <div className={`space-y-6 ${userPortalListPageShell}`}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Аналітика</h1>
      
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Усього заряджено</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalKwh.toFixed(1)} кВт·год</p>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сплачено</p>
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
          <h2 className="text-sm font-semibold text-gray-900">Витрати по місяцях</h2>
          <p className="mt-1 text-xs text-gray-500">За датою початку сесії та сумою з рахунків</p>
          <div className="mt-4 h-64">
            {trend.length === 0 ? (
              <UserPortalChartEmpty
                icon={<ChartLineIcon className="h-6 w-6" />}
                description="Немає даних — з’являться після зарядок з оплаченими рахунками"
              />
            ) : (
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
            )}
          </div>
        </AppCard>
        <AppCard>
          <h2 className="text-sm font-semibold text-gray-900">Енергія по місяцях</h2>
          <p className="mt-1 text-xs text-gray-500">Сума кВт·год за історією сесій</p>
          <div className="mt-4 h-64">
            {trend.length === 0 ? (
              <UserPortalChartEmpty
                icon={<ChartBarIcon className="h-6 w-6" />}
                description="Немає даних за обраний період — після зарядок тут з’явиться динаміка кВт·год"
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="kwh" fill="#86efac" radius={[6, 6, 0, 0]} name="кВт·год" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </AppCard>
      </div>

      <AppCard>
        <h2 className="text-sm font-semibold text-gray-900">Накопичено по станціях (з історії сесій)</h2>
        <div className="mt-4 h-72">
          {byStation.length === 0 ? (
            <UserPortalChartEmpty
              icon={<ChartBarIcon className="h-6 w-6" />}
              description="Після зарядок тут з’явиться порівняння станцій за накопиченою енергією"
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStation} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 9 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="kwh" fill="#22c55e" radius={[0, 6, 6, 0]} name="кВт·год" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </AppCard>
    </div>
  );
}
