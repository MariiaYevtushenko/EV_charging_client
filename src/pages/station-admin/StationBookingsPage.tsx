import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchAdminNetworkBookingStatusCounts,
  fetchAdminNetworkBookings,
  type AdminNetworkBookingRow,
  type AdminNetworkBookingStatusCounts,
  type NetworkListPeriod,
} from '../../api/adminNetwork';
import NetworkListPeriodControl from '../../components/admin/NetworkListPeriodControl';
import { ApiError } from '../../api/http';
import AdminListPagination from '../../components/admin/AdminListPagination';
import SortableTableTh, {
  defaultDirForSortColumn,
  type SortDir,
} from '../../components/admin/SortableTableTh';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { formatCountryLabel } from '../../utils/countryDisplay';
import { stationAdminPageTitle, stationAdminSearchInput } from '../../styles/stationAdminTheme';
import {
  ADMIN_LIST_SEARCH_DEBOUNCE_MS,
  GLOBAL_ADMIN_NETWORK_TABLE_PAGE_SIZE,
} from '../../constants/adminUi';

const BOOKING_STATUS_TAB_ORDER: AdminNetworkBookingRow['status'][] = ['pending', 'paid', 'cancelled'];

type BookingSortKey = 'start' | 'userName' | 'stationName' | 'slot' | 'status';

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

function bookingTone(s: string): 'success' | 'warn' | 'muted' | 'danger' | 'info' {
  switch (s) {
    case 'confirmed':
    case 'paid':
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
    case 'paid':
      return 'Завершено';
    default:
      return s;
  }
}

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

export default function StationBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<AdminNetworkBookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<BookingSortKey>('start');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminNetworkBookingRow['status'] | null>(null);
  const [statusCounts, setStatusCounts] = useState<AdminNetworkBookingStatusCounts | null>(null);
  const [period, setPeriod] = useState<NetworkListPeriod>('all');

  useEffect(() => {
    const t = window.setTimeout(() => setSearchQuery(searchDraft.trim()), ADMIN_LIST_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, period]);

  useEffect(() => {
    void fetchAdminNetworkBookingStatusCounts(searchQuery || undefined, period)
      .then(setStatusCounts)
      .catch(() => setStatusCounts(null));
  }, [searchQuery, period]);

  const toggleStatusFilter = useCallback((s: AdminNetworkBookingRow['status']) => {
    setStatusFilter((prev) => (prev === s ? null : s));
  }, []);

  const onSort = useCallback(
    (key: string) => {
      const k = key as BookingSortKey;
      setPage(1);
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
    void fetchAdminNetworkBookings({
      page,
      pageSize: GLOBAL_ADMIN_NETWORK_TABLE_PAGE_SIZE,
      q: searchQuery || undefined,
      status: statusFilter ?? undefined,
      sort: sortKey,
      order: sortDir,
      period,
    })
      .then((data) => {
        setBookings(data.items);
        setTotal(data.total);
      })
      .catch((e: unknown) => {
        setBookings([]);
        setTotal(0);
        setError(e instanceof ApiError ? e.message : 'Не вдалося завантажити бронювання');
      })
      .finally(() => setLoading(false));
  }, [page, searchQuery, statusFilter, sortKey, sortDir, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = bookings;

  const openDetail = (bookingId: string) => {
    navigate(`/station-dashboard/bookings/${encodeURIComponent(bookingId)}`);
  };

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className={stationAdminPageTitle}>Бронювання</h1>

        <div className="mt-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:gap-6">
          <label htmlFor="station-admin-bookings-search" className="sr-only">
            Пошук бронювань
          </label>
          <div className="relative min-w-0 w-full flex-1 sm:min-w-0">
            <span
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"
              aria-hidden
            >
              <SearchIcon className="h-5 w-5" />
            </span>
            <input
              id="station-admin-bookings-search"
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Користувач, станція, місто …"
              className={stationAdminSearchInput}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="flex w-full min-w-0 justify-end sm:w-auto sm:shrink-0">
            <NetworkListPeriodControl value={period} onChange={setPeriod} />
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      {statusCounts ? (
        <div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {BOOKING_STATUS_TAB_ORDER.map((st) => {
              const selected = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => toggleStatusFilter(st)}
                  aria-pressed={selected}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/45 ${
                    selected
                      ? 'border-green-600 bg-green-50/95 ring-2 ring-green-600/80 ring-offset-1 ring-offset-white'
                      : 'border-slate-200 bg-white/95 ring-1 ring-slate-950/[0.04] hover:border-slate-300 hover:bg-green-50/40'
                  }`}
                >
                  <StatusPill tone={bookingTone(st)}>{bookingLabel(st)}</StatusPill>
                  <p className="text-2xl font-bold tabular-nums text-gray-900">
                    {statusCounts[st].toLocaleString('uk-UA')}
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
                label="Порт"
                columnKey="slot"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                align="right"
              />
              <SortableTableTh
                label="Статус"
                columnKey="status"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  Завантаження…
                </td>
              </tr>
            ) : null}
            {rows.map((b) => (
              <tr
                key={b.id}
                role="link"
                tabIndex={0}
                className="cursor-pointer bg-white transition hover:bg-green-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/35"
                onClick={() => openDetail(b.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDetail(b.id);
                  }
                }}
              >
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmt(b.start)}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{b.userName}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{b.stationName}</div>
                  <div className="text-xs text-gray-500">
                    {[b.stationCity, formatCountryLabel(b.stationCountry)].filter(Boolean).join(' · ') ||
                      '—'}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-gray-800">Порт {b.portNumber}</td>
                <td className="px-4 py-3">
                  <StatusPill tone={bookingTone(b.status)}>{bookingLabel(b.status)}</StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            {total === 0 && !searchQuery && !statusFilter
              ? 'Нічого не знайдено.'
              : searchQuery || statusFilter
                ? 'Нічого не знайдено за цим запитом'
                : 'Нічого не знайдено.'}
          </p>
        ) : null}
      </AppCard>

      <AdminListPagination
        page={page}
        pageSize={GLOBAL_ADMIN_NETWORK_TABLE_PAGE_SIZE}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
}
