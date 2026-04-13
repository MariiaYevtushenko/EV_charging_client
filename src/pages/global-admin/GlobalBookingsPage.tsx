import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAdminNetworkBookings,
  type AdminNetworkBookingRow,
} from '../../api/adminNetwork';
import { ApiError } from '../../api/http';
import AdminListPagination from '../../components/admin/AdminListPagination';
import SortableTableTh, {
  defaultDirForSortColumn,
  type SortDir,
} from '../../components/admin/SortableTableTh';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';

const BOOKING_PAGE_SIZE = 50;

type StatusTab = 'all' | AdminNetworkBookingRow['status'];

type BookingSortKey = 'start' | 'userName' | 'stationName' | 'slot' | 'status';

const tabClass = (active: boolean) =>
  `relative shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
    active
      ? 'border-green-600 text-green-800'
      : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800'
  }`;

function bookingTone(s: string): 'success' | 'warn' | 'muted' | 'danger' | 'info' {
  switch (s) {
    case 'confirmed':
    case 'completed':
      return 'success';
    case 'pending':
      return 'warn';
    case 'cancelled':
      return 'danger';
    default:
      return 'muted';
  }
}

function bookingLabel(s: string) {
  switch (s) {
    case 'confirmed':
      return 'Підтверджено';
    case 'pending':
      return 'Очікує';
    case 'cancelled':
      return 'Скасовано';
    case 'completed':
      return 'Завершено';
    default:
      return s;
  }
}

/** День, місяць (повна назва), рік + час — завжди з роком. */
function fmt(dt: string) {
  try {
    const d = new Date(dt);
    const datePart = d.toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    return `${datePart}, ${timePart}`;
  } catch {
    return dt;
  }
}

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'all', label: 'Усі' },
  { id: 'pending', label: 'Очікує' },
  { id: 'completed', label: 'Завершено' },
  { id: 'cancelled', label: 'Скасовано' },
];

function cmpBookings(
  a: AdminNetworkBookingRow,
  b: AdminNetworkBookingRow,
  sortKey: BookingSortKey,
  sortDir: SortDir
): number {
  let c = 0;
  switch (sortKey) {
    case 'start':
      c = new Date(a.start).getTime() - new Date(b.start).getTime();
      break;
    case 'userName':
      c = a.userName.localeCompare(b.userName, 'uk');
      break;
    case 'stationName':
      c = a.stationName.localeCompare(b.stationName, 'uk');
      break;
    case 'slot':
      c = a.slotLabel.localeCompare(b.slotLabel, 'uk');
      break;
    case 'status':
      c = a.status.localeCompare(b.status, 'uk');
      break;
    default:
      c = new Date(a.start).getTime() - new Date(b.start).getTime();
  }
  return sortDir === 'desc' ? -c : c;
}

export default function GlobalBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<AdminNetworkBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<BookingSortKey>('start');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [page, setPage] = useState(1);

  const onSort = useCallback(
    (key: string) => {
      const k = key as BookingSortKey;
      if (sortKey === k) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(k);
        setSortDir(defaultDirForSortColumn(k));
      }
    },
    [sortKey]
  );

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    void fetchAdminNetworkBookings()
      .then(setBookings)
      .catch((e: unknown) => {
        setBookings([]);
        setError(e instanceof ApiError ? e.message : 'Не вдалося завантажити бронювання');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedBase = useMemo(
    () => [...bookings].sort((a, b) => cmpBookings(a, b, sortKey, sortDir)),
    [bookings, sortKey, sortDir]
  );

  const filteredByStatus = useMemo(() => {
    if (statusTab === 'all') return sortedBase;
    return sortedBase.filter((b) => b.status === statusTab);
  }, [sortedBase, statusTab]);

  useEffect(() => {
    setPage(1);
  }, [statusTab, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredByStatus.length / BOOKING_PAGE_SIZE) || 1);
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [filteredByStatus.length, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * BOOKING_PAGE_SIZE;
    return filteredByStatus.slice(start, start + BOOKING_PAGE_SIZE);
  }, [filteredByStatus, page]);

  const openDetail = (id: string) => {
    navigate(`/admin-dashboard/bookings/${id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Бронювання</h1>
        <p className="mt-1 text-sm text-gray-500">Усі бронювання з бази. Рядок — відкрити деталі.</p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <nav
        className="-mx-1 flex gap-4 overflow-x-auto border-b border-gray-200 px-1 sm:gap-6"
        aria-label="Фільтр за статусом"
      >
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tabClass(statusTab === t.id)}
            onClick={() => setStatusTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <AppCard className="overflow-x-auto !p-0" padding={false}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <SortableTableTh
                label="Початок"
                columnKey="start"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTableTh
                label="Користувач"
                columnKey="userName"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTableTh
                label="Станція"
                columnKey="stationName"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTableTh
                label="Слот"
                columnKey="slot"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTableTh
                label="Статус"
                columnKey="status"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Дії
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && filteredByStatus.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  Завантаження…
                </td>
              </tr>
            ) : null}
            {pagedRows.map((b) => (
              <tr
                key={b.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer bg-white hover:bg-emerald-50/70"
                onClick={() => openDetail(b.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDetail(b.id);
                  }
                }}
              >
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmt(b.start)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{b.userName}</td>
                <td className="px-4 py-3 text-gray-700">{b.stationName}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{b.slotLabel}</td>
                <td className="px-4 py-3">
                  <StatusPill tone={bookingTone(b.status)}>{bookingLabel(b.status)}</StatusPill>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap justify-end gap-2">
                    {b.userId ? (
                      <Link
                        to={`/admin-dashboard/users/${b.userId}`}
                        className="font-semibold text-green-700 hover:text-green-800"
                      >
                        Профіль
                      </Link>
                    ) : null}
                    <Link
                      to={`/admin-dashboard/stations/${b.stationId}`}
                      className="font-semibold text-green-700 hover:text-green-800"
                    >
                      Станція
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filteredByStatus.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Нічого не знайдено.</p>
        ) : null}
        {filteredByStatus.length > 0 ? (
          <div className="border-t border-gray-100 px-4 py-4">
            <AdminListPagination
              page={page}
              pageSize={BOOKING_PAGE_SIZE}
              total={filteredByStatus.length}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </AppCard>
    </div>
  );
}
