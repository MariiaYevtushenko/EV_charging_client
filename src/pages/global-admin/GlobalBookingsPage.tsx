import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useGlobalAdmin } from '../../context/GlobalAdminContext';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { appInputClass } from '../../components/station-admin/formStyles';

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

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString('uk-UA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

export default function GlobalBookingsPage() {
  const { allBookings } = useGlobalAdmin();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = [...allBookings].sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
    );
    if (!needle) return list;
    return list.filter(
      (b) =>
        b.userName.toLowerCase().includes(needle) ||
        b.stationName.toLowerCase().includes(needle) ||
        b.id.toLowerCase().includes(needle)
    );
  }, [allBookings, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Бронювання</h1>
       
      </div>

      <AppCard className="!p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Користувач, станція…"
          className={`${appInputClass} bg-white/90`}
        />
      </AppCard>

      <AppCard className="overflow-x-auto !p-0" padding={false}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Початок</th>
              <th className="px-4 py-3">Користувач</th>
              <th className="px-4 py-3">Станція</th>
              <th className="px-4 py-3">Слот</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3 text-right">Дія</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((b) => (
              <tr key={`${b.userId}-${b.id}`} className="bg-white hover:bg-gray-50/80">
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmt(b.start)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{b.userName}</td>
                <td className="px-4 py-3 text-gray-700">{b.stationName}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{b.slotLabel}</td>
                <td className="px-4 py-3">
                  <StatusPill tone={bookingTone(b.status)}>{bookingLabel(b.status)}</StatusPill>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/admin-dashboard/users/${b.userId}`}
                    className="font-semibold text-green-700 hover:text-green-800"
                  >
                    Профіль
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Нічого не знайдено.</p>
        ) : null}
      </AppCard>
    </div>
  );
}
