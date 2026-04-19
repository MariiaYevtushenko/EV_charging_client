import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AdminNetworkBookingRow } from '../../api/adminNetwork';
import { useStationAdminNetwork } from '../../context/StationAdminNetworkContext';
import SortableTableTh, {
  defaultDirForSortColumn,
  type SortDir,
} from '../../components/admin/SortableTableTh';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { formatCountryLabel } from '../../utils/countryDisplay';
import { stationAdminPageSubtitle, stationAdminPageTitle, stationAdminSearchInput } from '../../styles/stationAdminTheme';

const LIST_SEARCH_DEBOUNCE_MS = 350;

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

  useEffect(() => {
    const t = window.setTimeout(() => setSearchQuery(searchDraft.trim()), LIST_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

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

  const sortedRows = useMemo(
    () => [...bookings].sort((a, b) => cmpBookings(a, b, sortKey, sortDir)),
    [bookings, sortKey, sortDir]
  );

  const rows = useMemo(
    () => sortedRows.filter((b) => bookingMatchesSearch(b, searchQuery)),
    [sortedRows, searchQuery]
  );

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className={stationAdminPageTitle}>Бронювання</h1>
      
        <div className="mt-3 max-w-xl">
          <label htmlFor="station-admin-bookings-search" className="sr-only">
            Пошук бронювань
          </label>
          <div className="relative">
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
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
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
            {loading && bookings.length === 0 ? (
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
                className="cursor-pointer bg-white hover:bg-gray-50/80"
                onClick={() => navigate(`/station-dashboard/bookings/${b.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/station-dashboard/bookings/${b.id}`);
                  }
                }}
              >
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmt(b.start)}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{b.userName}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{b.stationName}</div>
                  <div className="text-xs text-slate-500">
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
            {bookingsTotal === 0
              ? 'Нічого не знайдено.'
              : searchQuery
                ? 'Нічого не знайдено за цим запитом. Спробуйте змінити пошук.'
                : 'Нічого не знайдено.'}
          </p>
        ) : null}
      </AppCard>
    </div>
  );
}
