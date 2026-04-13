import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStations } from "../../context/StationsContext";
import AdminListPagination from "../../components/admin/AdminListPagination";
import { AppCard, OutlineButton, PrimaryButton, StatusPill } from "../../components/station-admin/Primitives";
import { stationApiStatusLabel, stationApiStatusTone } from "../../utils/stationApiStatus";
import {
  appChipSelectedClass,
  appPrimaryCtaMdClass,
  appSelectFilterClass,
  appTabIdleClass,
} from "../../components/station-admin/formStyles";
import { sortApiStations } from "../../features/station-list/sortApiStations";
import { parseStationSortValue, STATION_SORT_OPTIONS } from "../../features/station-list/stationSortOptions";

type ListTab = "all" | "working" | "not_working" | "archived";

const tabLabels: Record<ListTab, string> = {
  all: "Усі",
  working: "Працюють",
  not_working: "Не працюють",
  archived: "Архів",
};

const tabClass = (active: boolean) =>
  `relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
    active ? appChipSelectedClass : appTabIdleClass
  }`;

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function StationsListPage() {
  const navigate = useNavigate();
  const {
    stationDtos: stations,
    loading,
    error,
    reload,
    stationsPage,
    stationsTotal,
    stationsPageSize,
    setStationsPage,
    uniqueCities,
    selectedCities,
    setSelectedCities,
    sortValue,
    setSortValue,
  } = useStations();

  const [listTab, setListTab] = useState<ListTab>("all");
  const [cityFilterOpen, setCityFilterOpen] = useState(false);

  const { key: sortKey, dir: sortDir } = useMemo(() => parseStationSortValue(sortValue), [sortValue]);

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  useEffect(() => {
    if (!cityFilterOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCityFilterOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [cityFilterOpen]);

  const filteredSorted = useMemo(() => {
    const byCity =
      selectedCities.length === 0
        ? [...stations]
        : stations.filter((s) => selectedCities.includes(s.city));
    return sortApiStations(byCity, sortKey, sortDir);
  }, [stations, selectedCities, sortKey, sortDir]);

  const rows = useMemo(() => {
    if (listTab === "all") return filteredSorted;
    if (listTab === "working") {
      return filteredSorted.filter((s) => s.status === "WORK");
    }
    if (listTab === "not_working") {
      return filteredSorted.filter((s) => s.status === "NO_CONNECTION" || s.status === "FIX");
    }
    if (listTab === "archived") {
      return filteredSorted.filter((s) => s.status === "ARCHIVED");
    }
    return filteredSorted;
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

  const openStation = (id: number) => {
    navigate(`/station-dashboard/stations/${id}`);
  };

  return (
    <div className="space-y-6">
      <AppCard className="overflow-hidden !p-0 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-100/80">
        <div className="border-b border-emerald-100/90 bg-gradient-to-br from-emerald-50/70 via-white to-white px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Список станцій</h1>
              <p className="mt-1 max-w-xl text-sm text-gray-500">
                Фільтр за містом і сортування — у бічній панелі (кнопка «Місто та сортування»).
              </p>
            </div>
            <Link
              to="/station-dashboard/stations/new"
              className={`inline-flex h-[42px] w-full shrink-0 items-center justify-center sm:w-auto ${appPrimaryCtaMdClass}`}
            >
              + Нова станція
            </Link>
          </div>
        </div>
      </AppCard>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">Не вдалося завантажити станції</p>
          <p className="mt-1 text-red-800/90">{error}</p>
          <OutlineButton type="button" className="mt-3 !text-xs" onClick={() => void reload()}>
            Спробувати знову
          </OutlineButton>
        </div>
      ) : null}

      {cityFilterOpen ? (
        <div
          className="fixed inset-0 z-[100]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="city-filter-title"
        >
          <button
            type="button"
            className="animate-city-filter-backdrop absolute inset-0 bg-slate-900/45 backdrop-blur-[3px]"
            aria-label="Закрити фільтр"
            onClick={() => setCityFilterOpen(false)}
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex max-w-full justify-end">
            <div
              id="city-filter-panel"
              className="animate-city-filter-panel pointer-events-auto flex h-full w-[min(100%,22rem)] flex-col overflow-hidden rounded-l-3xl border-l-2 border-emerald-200/70 bg-white shadow-[0_25px_50px_-12px_rgba(6,78,59,0.2)] ring-1 ring-emerald-900/5 sm:w-[min(100%,26rem)]"
            >
              <div className="relative shrink-0 border-b border-emerald-100/90 bg-gradient-to-bl from-emerald-50/90 via-white to-white px-5 pb-4 pt-5 sm:px-6">
                <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500/90" aria-hidden />
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="min-w-0">
                    <h2 id="city-filter-title" className="text-lg font-bold tracking-tight text-gray-900">
                      Фільтр за містом
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500">
                      Позначте міста або залиште без вибору — тоді видно всі станції.
                    </p>
                    <div className="mt-4">
                      <label
                        htmlFor="station-list-sort"
                        className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        Сортування
                      </label>
                      <select
                        id="station-list-sort"
                        className={`mt-1.5 w-full ${appSelectFilterClass}`}
                        value={sortValue}
                        onChange={(e) => setSortValue(e.target.value)}
                      >
                        {STATION_SORT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCityFilterOpen(false)}
                    className="shrink-0 rounded-xl border border-emerald-100/90 bg-white/90 p-2 text-gray-500 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-gray-800"
                    aria-label="Закрити"
                  >
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>
                {selectedCities.length > 0 ? (
                  <button
                    type="button"
                    className="mt-4 text-sm font-medium text-green-700 underline decoration-green-600/35 underline-offset-2 transition hover:text-green-800"
                    onClick={() => setSelectedCities([])}
                  >
                    Скинути вибір · показати всі міста
                  </button>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
                {uniqueCities.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-center text-sm text-gray-500">
                    Немає міст у списку станцій.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {uniqueCities.map((city) => {
                      const checked = selectedCities.includes(city);
                      return (
                        <li key={city}>
                          <label
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                              checked
                                ? "border-green-200 bg-emerald-50/80 text-green-950 shadow-sm shadow-emerald-900/5"
                                : "border-gray-100/90 bg-white text-gray-800 hover:border-emerald-200/80 hover:bg-emerald-50/40"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCity(city)}
                              className="h-4 w-4 shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="min-w-0 leading-snug">{city}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="shrink-0 border-t border-emerald-100/90 bg-emerald-50/30 p-4 sm:px-6">
                <OutlineButton type="button" className="w-full" onClick={() => setCityFilterOpen(false)}>
                  Готово
                </OutlineButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <AppCard className="!p-4 sm:!p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
          <div
            className="flex min-w-0 flex-wrap gap-2"
            role="tablist"
            aria-label="Стан станції"
          >
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
          <button
            type="button"
            onClick={() => setCityFilterOpen(true)}
            className="relative inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-emerald-100/90 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm shadow-emerald-900/5 transition hover:border-emerald-300 hover:bg-emerald-50/90 hover:text-green-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 sm:w-auto sm:justify-self-end"
            title="Фільтр за містом і сортування"
            aria-expanded={cityFilterOpen}
            aria-controls={cityFilterOpen ? "city-filter-panel" : undefined}
          >
            <FilterIcon className="h-5 w-5 text-emerald-700/90" />
           
            {selectedCities.length > 0 ? (
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-green-600 px-1.5 text-[11px] font-bold text-white">
                {selectedCities.length}
              </span>
            ) : null}
          </button>
        </div>
      </AppCard>

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
          <p className="text-xs text-gray-500">Натисніть рядок, щоб відкрити станцію</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-3">Станція</th>
                <th className="px-6 py-3">Місто</th>
                <th className="px-6 py-3">Статус</th>
                <th className="px-6 py-3">Порти</th>
                <th className="px-6 py-3 text-right">Дія</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Завантаження списку…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    {listTab === "archived"
                      ? "У архіві поки немає станцій."
                      : "Нічого не знайдено. Змініть фільтр міста або вкладку."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    tabIndex={0}
                    className="cursor-pointer bg-white transition hover:bg-emerald-50/50 focus-visible:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500/40"
                    onClick={() => openStation(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openStation(row.id);
                      }
                    }}
                  >
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
                      <PrimaryButton
                        type="button"
                        className="!py-2 !px-3 !text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/station-dashboard/stations/${row.id}/edit`);
                        }}
                      >
                        Змінити
                      </PrimaryButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
