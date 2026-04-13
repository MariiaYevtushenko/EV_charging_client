import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminNetworkBookingRow } from '../../api/adminNetwork';
import { useStationAdminNetwork } from '../../context/StationAdminNetworkContext';
import SortableTableTh, {
  defaultDirForSortColumn,
  type SortDir,
} from '../../components/admin/SortableTableTh';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { appInputClass } from '../../components/station-admin/formStyles';

type BookingSortKey = 'start' | 'userName' | 'stationName' | 'slot' | 'status';

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

export default function StationBookingsPage() {
  const { bookings, loading, error } = useStationAdminNetwork();
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<BookingSortKey>('start');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = !needle
      ? bookings
      : bookings.filter(
          (b) =>
            b.userName.toLowerCase().includes(needle) ||
            b.stationName.toLowerCase().includes(needle) ||
            b.id.toLowerCase().includes(needle)
        );
    return [...filtered].sort((a, b) => cmpBookings(a, b, sortKey, sortDir));
  }, [bookings, q, sortKey, sortDir]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Бронювання</h1>
        <p className="mt-1 text-sm text-gray-500">Усі бронювання по мережі станцій.</p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="min-w-0">
        <label className="sr-only" htmlFor="station-bookings-search">
          Пошук
        </label>
        <input
          id="station-bookings-search"
          type="search"
          placeholder="Користувач, станція, ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={appInputClass}
          disabled={loading}
        />
      </div>

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
                Дія
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  Завантаження…
                </td>
              </tr>
            ) : null}
            {rows.map((b) => (
              <tr key={b.id} className="bg-white hover:bg-gray-50/80">
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmt(b.start)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{b.userName}</td>
                <td className="px-4 py-3 text-gray-700">{b.stationName}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{b.slotLabel}</td>
                <td className="px-4 py-3">
                  <StatusPill tone={bookingTone(b.status)}>{bookingLabel(b.status)}</StatusPill>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/station-dashboard/stations/${b.stationId}`}
                    className="font-semibold text-green-700 hover:text-green-800"
                  >
                    Станція
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Нічого не знайдено.</p>
        ) : null}
      </AppCard>
    </div>
  );
}
