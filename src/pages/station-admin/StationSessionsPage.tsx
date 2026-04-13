import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStationAdminNetwork } from '../../context/StationAdminNetworkContext';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { appInputClass } from '../../components/station-admin/formStyles';

function sessionTone(s: string): 'success' | 'warn' | 'muted' | 'danger' | 'info' {
  switch (s) {
    case 'completed':
      return 'success';
    case 'active':
      return 'info';
    case 'failed':
      return 'danger';
    default:
      return 'muted';
  }
}

function sessionLabel(s: string) {
  switch (s) {
    case 'active':
      return 'Активна';
    case 'completed':
      return 'Завершено';
    case 'failed':
      return 'Помилка';
    default:
      return s;
  }
}

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString('uk-UA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

export default function StationSessionsPage() {
  const { sessions, loading, error } = useStationAdminNetwork();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = [...sessions].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    if (!needle) return list;
    return list.filter(
      (s) =>
        s.userName.toLowerCase().includes(needle) ||
        s.stationName.toLowerCase().includes(needle) ||
        s.id.toLowerCase().includes(needle)
    );
  }, [sessions, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Сесії зарядки</h1>
        <p className="mt-1 text-sm text-gray-500">Усі сесії по мережі станцій.</p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="station-sessions-search">
          Пошук
        </label>
        <input
          id="station-sessions-search"
          type="search"
          placeholder="Користувач, станція, ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={appInputClass}
          disabled={loading}
        />
      </div>

      <AppCard className="overflow-x-auto !p-0" padding={false}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Початок</th>
              <th className="px-4 py-3">Користувач</th>
              <th className="px-4 py-3">Станція</th>
              <th className="px-4 py-3">Порт</th>
              <th className="px-4 py-3 text-right">кВт·год</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3 text-right">Сума</th>
              <th className="px-4 py-3 text-right">Дія</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  Завантаження…
                </td>
              </tr>
            ) : null}
            {rows.map((s) => (
              <tr key={s.id} className="bg-white hover:bg-gray-50/80">
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmt(s.startedAt)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{s.userName}</td>
                <td className="px-4 py-3 text-gray-700">{s.stationName}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{s.portLabel}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-800">
                  {s.kwh.toLocaleString('uk-UA', { maximumFractionDigits: 3 })}
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={sessionTone(s.status)}>{sessionLabel(s.status)}</StatusPill>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-800">
                  {s.cost != null ? `${s.cost.toLocaleString('uk-UA')} грн` : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/station-dashboard/stations/${s.stationId}`}
                    className="font-semibold text-green-700 hover:text-green-800"
                  >
                    Станція
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Нічого не знайдено.</p>
        ) : null}
      </AppCard>
    </div>
  );
}
