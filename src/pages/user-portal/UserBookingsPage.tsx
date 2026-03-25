import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard, OutlineButton, StatusPill } from '../../components/station-admin/Primitives';
import { appPrimaryCtaClass } from '../../components/station-admin/formStyles';
import type { UserBookingPricingModel, UserBookingStatus } from '../../types/userPortal';

function statusTone(s: UserBookingStatus): 'success' | 'warn' | 'muted' | 'danger' | 'info' {
  switch (s) {
    case 'upcoming':
      return 'info';
    case 'active':
      return 'success';
    case 'completed':
      return 'muted';
    case 'cancelled':
      return 'danger';
    default:
      return 'muted';
  }
}

function statusLabel(s: UserBookingStatus) {
  switch (s) {
    case 'upcoming':
      return 'Майбутнє';
    case 'active':
      return 'Активне';
    case 'completed':
      return 'Минулі';
    case 'cancelled':
      return 'Скасовано';
    default:
      return s;
  }
}

function fmtRange(start: string, end: string) {
  try {
    const a = new Date(start);
    const b = new Date(end);
    return `${a.toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} — ${b.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return `${start} — ${end}`;
  }
}

function pricingCaption(model: UserBookingPricingModel | undefined, amount: number | undefined) {
  if (model === 'reservation_fee') {
    return `Попереднє бронювання · сплачено зараз ${amount ?? 50} грн (+ енергія після сесії)`;
  }
  if (model === 'dynamic_prepay') {
    return `Динамічна оплата · сплачено зараз ${amount?.toLocaleString('uk-UA') ?? '—'} грн (оцінка)`;
  }
  return null;
}

export default function UserBookingsPage() {
  const { bookings, cancelBooking } = useUserPortal();
  const [tab, setTab] = useState<'current' | 'past'>('current');

  const currentBookings = useMemo(
    () => bookings.filter((b) => b.status === 'upcoming' || b.status === 'active'),
    [bookings]
  );
  const pastBookings = useMemo(
    () => bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled'),
    [bookings]
  );

  const list = tab === 'current' ? currentBookings : pastBookings;

  const tabClass = (active: boolean) =>
    `border-b-2 px-1 pb-3 text-sm font-semibold transition ${
      active ? 'border-green-600 text-green-800' : 'border-transparent text-gray-500 hover:text-gray-800'
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Бронювання</h1>
         
        </div>
        <Link to="/dashboard/bookings/new" className={appPrimaryCtaClass}>
          Нове бронювання
        </Link>
      </div>

      <nav className="-mx-1 flex gap-6 border-b border-gray-200 px-1">
        <button type="button" className={tabClass(tab === 'current')} onClick={() => setTab('current')}>
          Поточні ({currentBookings.length})
        </button>
        <button type="button" className={tabClass(tab === 'past')} onClick={() => setTab('past')}>
          Минулі ({pastBookings.length})
        </button>
      </nav>

      <div className="space-y-3">
        {list.map((b) => {
          const priceLine = pricingCaption(b.pricingModel, b.payNowAmount);
          return (
            <AppCard key={b.id} className="!p-4 transition hover:ring-2 hover:ring-green-500/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link to={`/dashboard/bookings/${b.id}`} className="min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-green-500">
                  <p className="font-semibold text-gray-900">{b.stationName}</p>
                  <p className="text-xs text-gray-500">{b.slotLabel}</p>
                  {b.durationMin ? (
                    <p className="mt-0.5 text-xs text-gray-400">Тривалість: {b.durationMin} хв</p>
                  ) : null}
                  <p className="mt-1 text-sm text-gray-600">{fmtRange(b.start, b.end)}</p>
                  {priceLine ? <p className="mt-2 text-xs font-medium text-green-800">{priceLine}</p> : null}
                  <p className="mt-2 text-xs font-medium text-green-700">Деталі →</p>
                </Link>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <StatusPill tone={statusTone(b.status)}>{statusLabel(b.status)}</StatusPill>
                  {b.status === 'upcoming' ? (
                    <OutlineButton type="button" className="!text-xs !py-2" onClick={() => cancelBooking(b.id)}>
                      Скасувати
                    </OutlineButton>
                  ) : null}
                </div>
              </div>
            </AppCard>
          );
        })}
        {list.length === 0 ? (
          <AppCard className="py-10 text-center text-sm text-gray-500">У цій вкладці поки порожньо.</AppCard>
        ) : null}
      </div>
    </div>
  );
}
