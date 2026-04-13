import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { useStations, type StationSortKey } from '../../context/StationsContext';
import AdminListPagination from '../../components/admin/AdminListPagination';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AppCard, OutlineButton, StatusPill } from '../../components/station-admin/Primitives';
import type { Station } from '../../types/station';
import { appPrimaryCtaClass } from '../../components/station-admin/formStyles';
import { stationStatusLabel, stationStatusTone } from '../../utils/stationLabels';
import type { StationStatus } from '../../types/station';
import { parseStationSortValue } from '../../features/station-list/stationSortOptions';

const STATUS_STATS_ORDER: StationStatus[] = ['working', 'maintenance', 'offline', 'archived'];

export type AdminStationsListPageProps = {
 
  dashboardBase: string;
};

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
      />
    </svg>
  );
}

function UnarchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10m0 0l-4-4m4 4l4-4"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function SortableTh({
  label,
  sortKey,
  sortValue,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: StationSortKey;
  sortValue: string;
  onSort: (key: StationSortKey) => void;
  align?: 'left' | 'right';
}) {
  const { key: activeKey, dir } = parseStationSortValue(sortValue);
  const active = activeKey === sortKey;
  return (
    <th
      scope="col"
      className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'}`}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-lg uppercase tracking-wide transition hover:bg-gray-100/90 hover:text-gray-800 ${
          align === 'right' ? 'w-full justify-end' : ''
        } ${active ? 'font-bold text-green-800' : 'font-semibold text-gray-500'}`}
      >
        <span>{label}</span>
        <span className="select-none text-[10px] leading-none opacity-80" aria-hidden>
          {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </button>
    </th>
  );
}

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
    archiveStation,
    unarchiveStation,
    deleteStation,
    loading,
    error,
    reload,
    stationListStatusFilter,
    setStationListStatusFilter,
  } = useStations();
  const [archiveTarget, setArchiveTarget] = useState<Station | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [unarchiveTarget, setUnarchiveTarget] = useState<Station | null>(null);
  const [unarchiveBusy, setUnarchiveBusy] = useState(false);
  const [unarchiveError, setUnarchiveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Station | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const stationPath = useCallback((id: string) => `${dashboardBase}/stations/${id}`, [dashboardBase]);

  const handleSort = useCallback(
    (key: StationSortKey) => {
      const { key: currentKey, dir } = parseStationSortValue(sortValue);
      if (currentKey === key) {
        setSortValue(`${key}:${dir === 'asc' ? 'desc' : 'asc'}`);
      } else {
        setSortValue(`${key}:asc`);
      }
    },
    [sortValue, setSortValue]
  );

  const confirmArchive = useCallback(async () => {
    if (!archiveTarget) return;
    setArchiveBusy(true);
    setArchiveError(null);
    try {
      await archiveStation(archiveTarget.id);
      setArchiveTarget(null);
    } catch (e) {
      setArchiveError(e instanceof Error ? e.message : 'Не вдалося заархівувати станцію');
    } finally {
      setArchiveBusy(false);
    }
  }, [archiveTarget, archiveStation]);

  const confirmUnarchive = useCallback(async () => {
    if (!unarchiveTarget) return;
    setUnarchiveBusy(true);
    setUnarchiveError(null);
    try {
      await unarchiveStation(unarchiveTarget.id);
      setUnarchiveTarget(null);
    } catch (e) {
      setUnarchiveError(e instanceof Error ? e.message : 'Не вдалося розархівувати станцію');
    } finally {
      setUnarchiveBusy(false);
    }
  }, [unarchiveTarget, unarchiveStation]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteStation(deleteTarget.id);
      setDeleteTarget(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Не вдалося видалити станцію');
    } finally {
      setDeleteBusy(false);
    }
  }, [deleteTarget, deleteStation]);

  const rows = filteredStations;

  const toggleStatusFilter = useCallback(
    (status: StationStatus) => {
      setStationListStatusFilter(stationListStatusFilter === status ? null : status);
    },
    [stationListStatusFilter, setStationListStatusFilter]
  );

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={archiveTarget !== null}
        onClose={() => {
          if (!archiveBusy) {
            setArchiveTarget(null);
            setArchiveError(null);
          }
        }}
        onConfirm={confirmArchive}
        title={
          archiveTarget ? `Перемістити «${archiveTarget.name}» в архів?` : 'Перемістити в архів?'
        }
        description={
          <>
            <p>
              Станція зникне з карти та з активних списків; її можна буде розархівувати на сторінці
              станції.
            </p>
            {archiveError ? (
              <p className="mt-2 font-medium text-red-600" role="alert">
                {archiveError}
              </p>
            ) : null}
          </>
        }
        confirmLabel="Так, в архів"
        cancelLabel="Скасувати"
        variant="neutral"
        busy={archiveBusy}
      />

      <ConfirmDialog
        open={unarchiveTarget !== null}
        onClose={() => {
          if (!unarchiveBusy) {
            setUnarchiveTarget(null);
            setUnarchiveError(null);
          }
        }}
        onConfirm={confirmUnarchive}
        title={
          unarchiveTarget
            ? `Розархівувати «${unarchiveTarget.name}»?`
            : 'Розархівувати станцію?'
        }
        description={
          <>
            <p>
              Станція знову з’явиться на карті та в активних списках (статус роботи можна змінити на
              сторінці станції).
            </p>
            {unarchiveError ? (
              <p className="mt-2 font-medium text-red-600" role="alert">
                {unarchiveError}
              </p>
            ) : null}
          </>
        }
        confirmLabel="Так, розархівувати"
        cancelLabel="Скасувати"
        variant="neutral"
        busy={unarchiveBusy}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleteBusy) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDelete}
        title={
          deleteTarget
            ? `Остаточно видалити «${deleteTarget.name}»?`
            : 'Остаточно видалити станцію?'
        }
        description={
          <>
            <p>
              Запис станції, порти та пов’язані бронювання й сесії будуть безповоротно видалені з бази.
              Цю дію не скасувати.
            </p>
            {deleteError ? (
              <p className="mt-2 font-medium text-red-600" role="alert">
                {deleteError}
              </p>
            ) : null}
          </>
        }
        confirmLabel="Так, видалити назавжди"
        cancelLabel="Скасувати"
        variant="danger"
        busy={deleteBusy}
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">Не вдалося завантажити станції</p>
          <p className="mt-1 text-red-800/90">{error}</p>
          <OutlineButton type="button" className="mt-3 !text-xs" onClick={() => void reload()}>
            Спробувати знову
          </OutlineButton>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Станції</h1>
        </div>
        <Link to={`${dashboardBase}/stations/new`} className={appPrimaryCtaClass}>
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
                  className={`flex flex-col gap-2 rounded-2xl border p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                    selected
                      ? 'border-emerald-500 bg-emerald-50/95 ring-2 ring-emerald-500/80 ring-offset-1 ring-offset-white'
                      : 'border-emerald-100/90 bg-white/95 ring-1 ring-emerald-950/[0.04] hover:border-emerald-200 hover:bg-emerald-50/40'
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
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <SortableTh label="Станція" sortKey="name" sortValue={sortValue} onSort={handleSort} />
              <SortableTh label="Місто" sortKey="city" sortValue={sortValue} onSort={handleSort} />
              <SortableTh label="Статус" sortKey="status" sortValue={sortValue} onSort={handleSort} />
              <SortableTh
                label="Дохід сьогодні"
                sortKey="todayRevenue"
                sortValue={sortValue}
                onSort={handleSort}
                align="right"
              />
              <SortableTh
                label="Сесії"
                sortKey="todaySessions"
                sortValue={sortValue}
                onSort={handleSort}
                align="right"
              />
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Дія
              </th>
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
                  className="cursor-pointer bg-white transition hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35"
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
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.city}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone={stationStatusTone(s.status)}>
                      {stationStatusLabel(s.status)}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                    {s.todayRevenue.toLocaleString('uk-UA')} грн
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900">{s.todaySessions}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex flex-nowrap items-center justify-end gap-2">
                      {s.status === 'archived' ? (
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-emerald-700 transition hover:bg-emerald-50 hover:text-emerald-900"
                          aria-label={`Розархівувати станцію «${s.name}»`}
                          title="Розархівувати"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUnarchiveError(null);
                            setUnarchiveTarget(s);
                          }}
                        >
                          <UnarchiveIcon className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label={`Перемістити в архів станцію «${s.name}»`}
                          title="В архів"
                          onClick={(e) => {
                            e.stopPropagation();
                            setArchiveError(null);
                            setArchiveTarget(s);
                          }}
                        >
                          <ArchiveIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50 hover:text-red-700"
                        aria-label={`Видалити назавжди станцію «${s.name}»`}
                        title="Видалити назавжди"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteError(null);
                          setDeleteTarget(s);
                        }}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Нічого не знайдено</p>
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
