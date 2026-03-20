import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useStations } from '../../context/StationsContext';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { stationStatusLabel, stationStatusTone } from '../../utils/stationLabels';

export default function GlobalStationsListPage() {
  const { stations } = useStations();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = [...stations].sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    if (!needle) return list;
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.city.toLowerCase().includes(needle) ||
        s.address.toLowerCase().includes(needle)
    );
  }, [stations, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Станції</h1>
          <p className="mt-1 text-sm text-gray-500">
            Усі станції в системі, включно з архівними. Деталі — у картці станції.
          </p>
        </div>
        <Link
          to="/admin-dashboard/stations/new"
          className="inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
        >
          Додати станцію
        </Link>
      </div>

      <AppCard className="!p-4">
        <label className="sr-only" htmlFor="st-search">
          Пошук
        </label>
        <input
          id="st-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Назва, місто або адреса…"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500/20"
        />
      </AppCard>

      <AppCard className="overflow-x-auto !p-0" padding={false}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Станція</th>
              <th className="px-4 py-3">Місто</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Архів</th>
              <th className="px-4 py-3 text-right">Дохід сьогодні</th>
              <th className="px-4 py-3 text-right">Сесії</th>
              <th className="px-4 py-3 text-right">Дія</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((s) => (
              <tr key={s.id} className="bg-white transition hover:bg-gray-50/80">
                <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-gray-600">{s.city}</td>
                <td className="px-4 py-3">
                  <StatusPill tone={stationStatusTone(s.status)}>
                    {stationStatusLabel(s.status)}
                  </StatusPill>
                </td>
                <td className="px-4 py-3 text-gray-600">{s.archived ? 'Так' : 'Ні'}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                  {s.todayRevenue.toLocaleString('uk-UA')} грн
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900">{s.todaySessions}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/admin-dashboard/stations/${s.id}`}
                    className="font-semibold text-green-700 hover:text-green-800"
                  >
                    Переглянути
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Нічого не знайдено.</p>
        ) : null}
      </AppCard>
    </div>
  );
}
