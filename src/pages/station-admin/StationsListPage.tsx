import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { StationSortDir, StationSortKey } from "../../context/StationsContext";
import StationFiltersBarCore from "../../components/station-admin/StationFiltersBarCore";
import { AppCard, OutlineButton, PrimaryButton, StatusPill } from "../../components/station-admin/Primitives";
import { stationApiStatusLabel, stationApiStatusTone } from "../../utils/stationApiStatus";
import { appChipSelectedClass, appTabIdleClass } from "../../components/station-admin/formStyles";
import { useStationsFromApi } from "../../features/station-list/useStationsFromApi";
import { sortApiStations } from "../../features/station-list/sortApiStations";

type ListTab = "all" | "working" | "not_working" | "archived";

const tabLabels: Record<ListTab, string> = {
  all: "Усі",
  working: "Працюють",
  not_working: "Не працюють",
  archived: "Архів",
};

const listSortOptions: { key: StationSortKey; label: string }[] = [
  { key: "name", label: "Назва" },
  { key: "city", label: "Місто" },
  { key: "status", label: "Статус" },
];

const tabClass = (active: boolean) =>
  `relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
    active ? appChipSelectedClass : appTabIdleClass
  }`;

export default function StationsListPage() {
  const navigate = useNavigate();
  const { stations, loading, error, reload } = useStationsFromApi();

  const [listTab, setListTab] = useState<ListTab>("all");
  const [cityFilter, setCityFilter] = useState("");
  const [sortKey, setSortKey] = useState<StationSortKey>("name");
  const [sortDir, setSortDir] = useState<StationSortDir>("asc");

  const toggleSortDir = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const uniqueCities = useMemo(() => {
    const set = new Set(stations.map((s) => s.city));
    return [...set].sort((a, b) => a.localeCompare(b, "uk"));
  }, [stations]);

  const filteredSorted = useMemo(() => {
    const base = cityFilter ? stations.filter((s) => s.city === cityFilter) : [...stations];
    return sortApiStations(base, sortKey, sortDir);
  }, [stations, cityFilter, sortKey, sortDir]);

  const rows = useMemo(() => {
    if (listTab === "archived") {
      return [];
    }
    if (listTab === "all") return filteredSorted;
    if (listTab === "working") {
      return filteredSorted.filter((s) => s.status === "WORK");
    }
    return filteredSorted.filter((s) => s.status === "NO_CONNECTION" || s.status === "FIX");
  }, [filteredSorted, listTab]);

  const totals = useMemo(() => {
    const active = filteredSorted;
    const portCount = active.reduce((acc, s) => acc + s.ports.length, 0);
    return {
      stationCount: active.length,
      portCount,
      cityCount: new Set(active.map((s) => s.city)).size,
    };
  }, [filteredSorted]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Список станцій</h1>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">Не вдалося завантажити станції</p>
          <p className="mt-1 text-red-800/90">{error}</p>
          <OutlineButton type="button" className="mt-3 !text-xs" onClick={() => void reload()}>
            Спробувати знову
          </OutlineButton>
        </div>
      ) : null}

      <StationFiltersBarCore
        uniqueCities={uniqueCities}
        cityFilter={cityFilter}
        setCityFilter={setCityFilter}
        sortKeyOptions={listSortOptions}
        sortKey={sortKey}
        setSortKey={setSortKey}
        sortDir={sortDir}
        setSortDir={setSortDir}
        toggleSortDir={toggleSortDir}
        showAddButton
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
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
       
      </div>


      <div className="grid gap-4 sm:grid-cols-3">
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Станцій</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totals.stationCount}</p>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Портів загалом</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totals.portCount}</p>
        </AppCard>
      </div>

      <AppCard padding={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {tabLabels[listTab]} · {rows.length}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-3">Станція</th>
                <th className="px-6 py-3">Місто</th>
                <th className="px-6 py-3">Статус</th>
                <th className="px-6 py-3">Порти</th>
                <th className="px-6 py-3 text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Завантаження списку…
                  </td>
                </tr>
              ) : listTab === "archived" ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Архів станцій порожній
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Нічого не знайдено. Змініть фільтр міста або вкладку.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="bg-white hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{row.name}</p>
                      <p className="text-xs text-gray-500">{row.addressLine}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{row.city}</td>
                    <td className="px-6 py-4">
                      <StatusPill tone={stationApiStatusTone(row.status)}>
                        {stationApiStatusLabel(row.status)}
                      </StatusPill>
                    </td>
                    <td className="px-6 py-4 tabular-nums text-gray-700">{row.ports.length}</td>
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
