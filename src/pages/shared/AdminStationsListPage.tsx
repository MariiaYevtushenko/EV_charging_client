import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useStations, type StationSortKey } from '../../context/StationsContext';
import AdminListPagination from '../../components/admin/AdminListPagination';
import { AppCard, OutlineButton, StatusPill } from '../../components/station-admin/Primitives';
import { appPrimaryCtaClass } from '../../components/station-admin/formStyles';
import { stationStatusLabel, stationStatusTone } from '../../utils/stationLabels';
import { countryIsoTooltip, formatCountryLabel } from '../../utils/countryDisplay';
import type { StationStatus } from '../../types/station';
import { parseStationSortValue } from '../../features/station-list/stationSortOptions';
import SortableTableTh, { defaultDirForSortColumn } from '../../components/admin/SortableTableTh';
import { stationAdminPageTitle, stationAdminSearchInput } from '../../styles/stationAdminTheme';
import { ADMIN_LIST_SEARCH_DEBOUNCE_MS } from '../../constants/adminUi';

const STATUS_STATS_ORDER: StationStatus[] = ['working', 'maintenance', 'offline', 'archived'];

/** Фіксовані частки ширини таблиці (`table-fixed`), сума 100%. */
const COL = {
  name: 'w-[40%]',
  city: 'w-[16%]',
  country: 'w-[16%]',
  status: 'w-[12%]',
  revenue: 'w-[8%]',
  sessions: 'w-[8%]',
} as const;

const tdBase = 'max-w-0 overflow-hidden px-4 py-3 align-middle';
const tdTruncate = 'block min-w-0 truncate';

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

export type AdminStationsListPageProps = {
  dashboardBase: string;
};

export default function AdminStationsListPage({ dashboardBase }: AdminStationsListPageProps) {
  const navigate = useNavigate();
  const {
    filteredStations,
    stationsPage,
    stationsTotal,
    stationsPageSize,
    setStationsPage,
    stationStatusCounts,
    sortValue,
    setSortValue,
    loading,
    error,
    reload,
    stationListStatusFilter,
    setStationListStatusFilter,
    stationsSearchQuery,
    setStationsSearchQuery,
  } = useStations();
  const [searchDraft, setSearchDraft] = useState(stationsSearchQuery);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setStationsSearchQuery(searchDraft.trim());
    }, ADMIN_LIST_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchDraft, setStationsSearchQuery]);

  const stationPath = useCallback((id: string) => `${dashboardBase}/stations/${id}`, [dashboardBase]);

  const handleSort = useCallback(
    (key: string) => {
      const k = key as StationSortKey;
      const { key: currentKey, dir } = parseStationSortValue(sortValue);
      if (currentKey === k) {
        setSortValue(`${k}:${dir === 'asc' ? 'desc' : 'asc'}`);
      } else {
        setSortValue(`${k}:${defaultDirForSortColumn(k)}`);
      }
    },
    [sortValue, setSortValue]
  );

  const rows = filteredStations;
  const parsedSort = parseStationSortValue(sortValue);

  const toggleStatusFilter = useCallback(
    (status: StationStatus) => {
      setStationListStatusFilter(stationListStatusFilter === status ? null : status);
    },
    [stationListStatusFilter, setStationListStatusFilter]
  );

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">Не вдалося завантажити станції</p>
          <p className="mt-1 text-red-800/90">{error}</p>
          <OutlineButton type="button" className="mt-3 !text-xs" onClick={() => void reload()}>
            Спробувати знову
          </OutlineButton>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
        <div className="min-w-0 w-full flex-1">
          <h1 className={stationAdminPageTitle}>Станції</h1>
          <div className="mt-3 w-full">
            <label htmlFor="admin-stations-search" className="sr-only">
              Пошук станцій за назвою або містом
            </label>
            <div className="relative w-full">
              <span
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"
                aria-hidden
              >
                <SearchIcon className="h-5 w-5" />
              </span>
              <input
                id="admin-stations-search"
                type="search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Пошук за назвою станції або містом…"
                className={stationAdminSearchInput}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
        <Link
          to={`${dashboardBase}/stations/new`}
          className={`${appPrimaryCtaClass} shrink-0 gap-1.5`}
        >
          <span className="text-base font-semibold leading-none" aria-hidden>
            +
          </span>
          Додати станцію
        </Link>
      </div>

      {stationStatusCounts ? (
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATUS_STATS_ORDER.map((status) => {
              const selected = stationListStatusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatusFilter(status)}
                  aria-pressed={selected}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/45 ${
                    selected
                      ? 'border-green-600 bg-green-50/95 ring-2 ring-green-600/80 ring-offset-1 ring-offset-white'
                      : 'border-slate-200 bg-white/95 ring-1 ring-slate-950/[0.04] hover:border-slate-300 hover:bg-green-50/40'
                  }`}
                >
                  <StatusPill tone={stationStatusTone(status)}>{stationStatusLabel(status)}</StatusPill>
                  <p className="text-2xl font-bold tabular-nums text-gray-900">
                    {stationStatusCounts[status]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <AppCard className="overflow-x-auto !p-0" padding={false}>
        <table className="w-full min-w-[720px] table-fixed text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <SortableTableTh
                label="Станція"
                columnKey="name"
                activeKey={parsedSort.key}
                dir={parsedSort.dir}
                onSort={handleSort}
                thClassName={`px-4 py-3 ${COL.name}`}
              />
              <SortableTableTh
                label="Місто"
                columnKey="city"
                activeKey={parsedSort.key}
                dir={parsedSort.dir}
                onSort={handleSort}
                thClassName={`px-4 py-3 ${COL.city}`}
              />
              <SortableTableTh
                label="Країна"
                columnKey="country"
                activeKey={parsedSort.key}
                dir={parsedSort.dir}
                onSort={handleSort}
                thClassName={`px-4 py-3 ${COL.country}`}
              />
              <SortableTableTh
                label="Статус"
                columnKey="status"
                activeKey={parsedSort.key}
                dir={parsedSort.dir}
                onSort={handleSort}
                thClassName={`px-4 py-3 ${COL.status}`}
              />
              <SortableTableTh
                label="Дохід сьогодні"
                columnKey="todayRevenue"
                activeKey={parsedSort.key}
                dir={parsedSort.dir}
                onSort={handleSort}
                align="right"
                thClassName={`px-4 py-3 ${COL.revenue}`}
              />
              <SortableTableTh
                label="Сесії"
                columnKey="todaySessions"
                activeKey={parsedSort.key}
                dir={parsedSort.dir}
                onSort={handleSort}
                align="right"
                thClassName={`px-4 py-3 ${COL.sessions}`}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  Завантаження списку…
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr
                  key={s.id}
                  className="cursor-pointer bg-white transition hover:bg-green-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/35"
                  tabIndex={0}
                  aria-label={`Відкрити станцію «${s.name}»`}
                  onClick={() => navigate(stationPath(s.id))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(stationPath(s.id));
                    }
                  }}
                >
                  <td className={`${tdBase} font-medium text-gray-900 ${COL.name}`}>
                    <span className={`${tdTruncate} text-gray-900`} title={s.name}>
                      {s.name}
                    </span>
                  </td>
                  <td className={`${tdBase} text-gray-600 ${COL.city}`}>
                    <span className={`${tdTruncate} text-gray-600`} title={s.city || undefined}>
                      {s.city || '—'}
                    </span>
                  </td>
                  <td className={`${tdBase} text-gray-800 ${COL.country}`}>
                    <span
                      className={`${tdTruncate} text-gray-800`}
                      title={
                        [formatCountryLabel(s.country), countryIsoTooltip(s.country)]
                          .filter(Boolean)
                          .join(' — ') || undefined
                      }
                    >
                      {formatCountryLabel(s.country)}
                    </span>
                  </td>
                  <td className={`${tdBase} ${COL.status}`}>
                    <span className="inline-flex max-w-full min-w-0">
                      <StatusPill tone={stationStatusTone(s.status)}>
                        {stationStatusLabel(s.status)}
                      </StatusPill>
                    </span>
                  </td>
                  <td className={`${tdBase} text-right tabular-nums text-gray-900 ${COL.revenue}`}>
                    {s.todayRevenue.toLocaleString('uk-UA')} грн
                  </td>
                  <td className={`${tdBase} text-right tabular-nums text-gray-900 ${COL.sessions}`}>
                    {s.todaySessions}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            {stationsSearchQuery.trim()
              ? 'Нічого не знайдено за цим запитом'
              : 'Нічого не знайдено'}
          </p>
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
