import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStations } from '../../context/StationsContext';
import StationFiltersBar from '../../components/station-admin/StationFiltersBar';
import { AppCard, OutlineButton, PrimaryButton, StatusPill } from '../../components/station-admin/Primitives';
import { stationStatusLabel, stationStatusTone } from '../../utils/stationLabels';
import { appChipSelectedClass, appTabIdleClass } from '../../components/station-admin/formStyles';

type ListTab = 'all' | 'working' | 'not_working' | 'archived';

const tabLabels: Record<ListTab, string> = {
  all: 'Усі',
  working: 'Працюють',
  not_working: 'Не працюють',
  archived: 'Архів',
};

const tabClass = (active: boolean) =>
  `relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
    active ? appChipSelectedClass : appTabIdleClass
  }`;

export default function StationsListPage() {
  const navigate = useNavigate();
  const { stations, filteredStations } = useStations();
  const [listTab, setListTab] = useState<ListTab>('all');

  const rows = useMemo(() => {
    if (listTab === 'archived') {
      return filteredStations.filter((s) => s.archived);
    }
    const active = filteredStations.filter((s) => !s.archived);
    if (listTab === 'all') return active;
    if (listTab === 'working') return active.filter((s) => s.status === 'working');
    return active.filter((s) => s.status === 'maintenance' || s.status === 'offline');
  }, [filteredStations, listTab]);

  const totals = useMemo(() => {
    const active = stations.filter((s) => !s.archived);
    const revenue = active.reduce((s, x) => s + x.todayRevenue, 0);
    const sessions = active.reduce((s, x) => s + x.todaySessions, 0);
    const energy = active.reduce((s, x) => s + x.energyByHour.reduce((a, b) => a + b, 0), 0);
    return { revenue, sessions, energy };
  }, [stations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Список станцій</h1>
        <p className="mt-1 text-sm text-gray-500">
          Оберіть вкладку нижче. Місто та сортування — у панелі (іконка налаштувань).
        </p>
      </div>

      <StationFiltersBar showAddButton />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Фільтр списку за станом">
        {(Object.keys(tabLabels) as ListTab[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={listTab === key}
            className={tabClass(listTab === key)}
            onClick={() => setListTab(key)}
          >
            {tabLabels[key]}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Показано <span className="font-semibold tabular-nums text-gray-800">{rows.length}</span> станцій
        {listTab === 'archived'
          ? ` · у архіві всього ${stations.filter((s) => s.archived).length}`
          : listTab === 'all'
            ? ` · активних за містом: ${filteredStations.filter((s) => !s.archived).length}`
            : null}
        .
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Дохід сьогодні (активні)
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {totals.revenue.toLocaleString('uk-UA')} грн
          </p>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Сесії сьогодні (активні)
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totals.sessions}</p>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Енергія за добу (активні)
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {totals.energy.toLocaleString('uk-UA')} кВт·год
          </p>
        </AppCard>
      </div>

      <AppCard padding={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {tabLabels[listTab]} · {rows.length}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-3">Станція</th>
                <th className="px-6 py-3">Місто</th>
                <th className="px-6 py-3">Статус</th>
                <th className="px-6 py-3">Сесії</th>
                <th className="px-6 py-3">Дохід</th>
                <th className="px-6 py-3 text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    {listTab === 'archived'
                      ? 'Архів порожній.'
                      : 'Нічого не знайдено. Змініть фільтр міста або вкладку.'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="bg-white hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{row.name}</p>
                      <p className="text-xs text-gray-500">{row.address}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{row.city}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {row.archived ? (
                          <StatusPill tone="warn">Архів</StatusPill>
                        ) : null}
                        <StatusPill tone={stationStatusTone(row.status)}>
                          {stationStatusLabel(row.status)}
                        </StatusPill>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{row.todaySessions}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {row.todayRevenue.toLocaleString('uk-UA')} грн
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <OutlineButton
                          type="button"
                          className="!py-2 !px-3 !text-xs"
                          onClick={() => navigate(`/station-dashboard/stations/${row.id}`)}
                        >
                          Відкрити
                        </OutlineButton>
                        <PrimaryButton
                          type="button"
                          className="!py-2 !px-3 !text-xs"
                          onClick={() => navigate(`/station-dashboard/stations/${row.id}/edit`)}
                        >
                          Змінити
                        </PrimaryButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AppCard>
    </div>
  );
}
