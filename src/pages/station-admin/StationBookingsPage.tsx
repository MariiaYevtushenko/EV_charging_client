import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AdminNetworkBookingRow, NetworkListPeriod } from '../../api/adminNetwork';
import AdminListPagination from '../../components/admin/AdminListPagination';
import NetworkListPeriodControl from '../../components/admin/NetworkListPeriodControl';
import { useStationAdminNetwork } from '../../context/StationAdminNetworkContext';
import { isOnOrAfterNetworkPeriodCutoff } from '../../utils/networkListPeriod';
import { defaultDirForSortColumn, type SortDir } from '../../components/admin/SortableTableTh';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { formatCountryLabel } from '../../utils/countryDisplay';
import { stationAdminPageTitle, stationAdminSearchInput } from '../../styles/stationAdminTheme';

const LIST_SEARCH_DEBOUNCE_MS = 350;
/** 4×3 на широкому екрані — зручно для сітки карток */
const STATION_BOOKINGS_PAGE_SIZE = 12;

type BookingSortKey = 'start' | 'userName' | 'stationName' | 'slot' | 'duration' | 'status';

function bookingDurationMinutes(b: AdminNetworkBookingRow): number {
  try {
    const a = new Date(b.start).getTime();
    const e = new Date(b.end).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(e)) return 0;
    return Math.max(0, Math.round((e - a) / 60000));
  } catch {
    return 0;
  }
}

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

function bookingMatchesSearch(b: AdminNetworkBookingRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const parts = [
    b.id,
    b.userId ?? '',
    b.userName,
    b.stationName,
    b.stationCity,
    b.stationCountry,
    formatCountryLabel(b.stationCountry),
    b.stationId,
    b.slotLabel,
    String(b.portNumber),
    b.status,
    bookingLabel(b.status),
    fmt(b.start),
    fmt(b.end),
  ];
  return parts.some((p) => p.toLowerCase().includes(needle));
}

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
      c = a.portNumber - b.portNumber;
      break;
    case 'duration':
      c = bookingDurationMinutes(a) - bookingDurationMinutes(b);
      break;
    case 'status':
      c = a.status.localeCompare(b.status, 'uk');
      break;
    default:
      c = new Date(a.start).getTime() - new Date(b.start).getTime();
  }
  return sortDir === 'desc' ? -c : c;
}

export default function StationBookingsPage() {
  const navigate = useNavigate();
  const { bookings, bookingsTotal, loading, error } = useStationAdminNetwork();
  const [sortKey, setSortKey] = useState<BookingSortKey>('start');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<NetworkListPeriod>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchQuery(searchDraft.trim()), LIST_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  const setSortField = useCallback((key: BookingSortKey) => {
    setPage(1);
    setSortKey(key);
    setSortDir(defaultDirForSortColumn(key));
  }, []);

  const toggleSortDir = useCallback(() => {
    setPage(1);
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  }, []);

  const sortedRows = useMemo(
    () => [...bookings].sort((a, b) => cmpBookings(a, b, sortKey, sortDir)),
    [bookings, sortKey, sortDir]
  );

  const rows = useMemo(
    () =>
      sortedRows.filter(
        (b) =>
          isOnOrAfterNetworkPeriodCutoff(b.start, period) && bookingMatchesSearch(b, searchQuery)
      ),
    [sortedRows, searchQuery, period]
  );

  const totalPages = rows.length === 0 ? 1 : Math.max(1, Math.ceil(rows.length / STATION_BOOKINGS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * STATION_BOOKINGS_PAGE_SIZE;
    return rows.slice(start, start + STATION_BOOKINGS_PAGE_SIZE);
  }, [rows, safePage]);

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className={stationAdminPageTitle}>Бронювання</h1>
      
        <div className="mt-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:gap-6">
          <label htmlFor="station-admin-bookings-search" className="sr-only">
            Пошук бронювань
          </label>
          <div className="relative min-w-0 w-full sm:max-w-xl">
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
              placeholder="Користувач, станція, місто, країна…"
              className={stationAdminSearchInput}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="flex w-full min-w-0 justify-end sm:w-auto sm:shrink-0">
            <NetworkListPeriodControl
              value={period}
              onChange={(p) => {
                setPeriod(p);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <AppCard className="!p-0 shadow-sm ring-1 ring-slate-900/[0.04]" padding={false}>
        <div className="flex flex-col gap-4 border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50/70 to-slate-50/90 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:py-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Сортування</p>
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <label htmlFor="station-bookings-sort" className="sr-only">
              Поле сортування
            </label>
            <select
              id="station-bookings-sort"
              value={sortKey}
              onChange={(e) => setSortField(e.target.value as BookingSortKey)}
              className="min-w-0 max-w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none ring-emerald-500/0 transition focus:ring-2 focus:ring-emerald-500/40"
            >
              <option value="start">Початок бронювання</option>
              <option value="userName">Користувач</option>
              <option value="stationName">Станція</option>
              <option value="slot">Порт</option>
              <option value="duration">Тривалість</option>
              <option value="status">Статус</option>
            </select>
            <button
              type="button"
              onClick={toggleSortDir}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-emerald-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              title={sortDir === 'desc' ? 'За спаданням — натисніть, щоб змінити напрямок' : 'За зростанням — натисніть, щоб змінити напрямок'}
            >
              <span className="text-slate-500">{sortDir === 'desc' ? 'Спочатку більші' : 'Спочатку менші'}</span>
              <span className="tabular-nums text-lg leading-none text-emerald-700" aria-hidden>
                {sortDir === 'desc' ? '↓' : '↑'}
              </span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {loading && bookings.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">Завантаження…</p>
          ) : null}

          {!loading && pagedRows.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pagedRows.map((b) => {
                const dur = bookingDurationMinutes(b);
                const loc = [b.stationCity, formatCountryLabel(b.stationCountry)].filter(Boolean).join(' · ') || '—';
                return (
                  <div
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/station-dashboard/bookings/${b.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/station-dashboard/bookings/${b.id}`);
                      }
                    }}
                    className="group flex cursor-pointer flex-col rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-sm ring-1 ring-slate-900/[0.03] transition hover:border-emerald-300/80 hover:shadow-md hover:ring-emerald-500/15"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-[11px] font-medium uppercase leading-snug tracking-wide text-slate-500 line-clamp-2">
                        {fmt(b.start)}
                      </p>
                      <span className="shrink-0 [&>span]:scale-95">
                        <StatusPill tone={bookingTone(b.status)}>{bookingLabel(b.status)}</StatusPill>
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-slate-900 group-hover:text-emerald-900">
                      {b.stationName}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{loc}</p>
                    <p className="mt-3 truncate text-sm font-medium text-slate-800">{b.userName}</p>
                    <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      <span>
                        Порт <span className="font-semibold tabular-nums text-slate-900">{b.portNumber}</span>
                      </span>
                      <span className="text-slate-300" aria-hidden>
                        ·
                      </span>
                      <span>
                        <span className="text-slate-500">Тривалість</span>{' '}
                        <span className="font-semibold tabular-nums text-slate-900">{dur} хв</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {!loading && rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              {bookingsTotal === 0
                ? 'Нічого не знайдено.'
                : searchQuery
                  ? 'Нічого не знайдено за цим запитом. Спробуйте змінити пошук.'
                  : 'Нічого не знайдено.'}
            </p>
          ) : null}
        </div>

        {!loading && rows.length > 0 ? (
          <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3 sm:px-5">
            <AdminListPagination
              page={safePage}
              pageSize={STATION_BOOKINGS_PAGE_SIZE}
              total={rows.length}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </AppCard>
    </div>
  );
}
