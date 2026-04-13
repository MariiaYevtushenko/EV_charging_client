import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useStations } from '../../context/StationsContext';
import AdminListPagination from '../../components/admin/AdminListPagination';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { appInputClass, appPrimaryCtaClass } from '../../components/station-admin/formStyles';
import { stationStatusLabel, stationStatusTone } from '../../utils/stationLabels';

export default function GlobalStationsListPage() {
  const { stations, stationsPage, stationsTotal, stationsPageSize, setStationsPage } = useStations();
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
        <Link to="/admin-dashboard/stations/new" className={appPrimaryCtaClass}>
          Додати станцію
        </Link>
      </div>

     

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

      <AdminListPagination
        page={stationsPage}
        pageSize={stationsPageSize}
        total={stationsTotal}
        onPageChange={setStationsPage}
      />
    </div>
  );
}
