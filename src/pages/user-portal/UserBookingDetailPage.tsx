import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStations } from '../../context/StationsContext';
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
      return 'Завершено';
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
    const date = a.toLocaleDateString('uk-UA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const t1 = a.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const t2 = b.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    return { date, timeRange: `${t1} — ${t2}` };
  } catch {
    return { date: start, timeRange: end };
  }
}

function pricingCaption(model: UserBookingPricingModel | undefined, amount: number | undefined) {
  if (model === 'reservation_fee') {
    return `Попереднє бронювання: сплачено зараз ${amount ?? 50} грн; енергія — після сесії за тарифом.`;
  }
  if (model === 'dynamic_prepay') {
    return `Динамічна оплата: оцінка списана зараз — ${amount?.toLocaleString('uk-UA') ?? '—'} грн  .`;
  }
  return 'Модель оплати не вказана  .';
}

export default function UserBookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { bookings, cancelBooking } = useUserPortal();
  const { getStation } = useStations();

  const booking = useMemo(
    () => bookings.find((b) => b.id === bookingId),
    [bookings, bookingId]
  );

  const station = booking ? getStation(booking.stationId) : undefined;
  const range = booking ? fmtRange(booking.start, booking.end) : null;

  if (!booking) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/bookings" className="text-sm font-medium text-green-700 hover:underline">
          ← До бронювань
        </Link>
        <AppCard className="py-12 text-center text-sm text-gray-500">Бронювання не знайдено.</AppCard>
      </div>
    );
  }

  const durationText =
    booking.durationMin != null
      ? `${booking.durationMin} хв (${Math.floor(booking.durationMin / 60)} год ${booking.durationMin % 60} хв)`
      : '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/dashboard/bookings" className="text-sm font-medium text-green-700 hover:underline">
          ← До бронювань
        </Link>
        {booking.status === 'upcoming' ? (
          <OutlineButton
            type="button"
            className="!text-xs"
            onClick={() => {
              cancelBooking(booking.id);
              navigate('/dashboard/bookings');
            }}
          >
            Скасувати бронювання
          </OutlineButton>
        ) : null}
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Деталі бронювання</h1>
        <p className="mt-1 font-mono text-xs text-gray-400">ID: {booking.id}</p>
      </div>

      <AppCard className="!p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-gray-900">{booking.stationName}</p>
            {station ? (
              <p className="mt-1 text-sm text-gray-600">
                {station.city}, {station.address}
              </p>
            ) : null}
          </div>
          <StatusPill tone={statusTone(booking.status)}>{statusLabel(booking.status)}</StatusPill>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Дата</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{range?.date}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Час слоту</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{range?.timeRange}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Порт / конектор</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{booking.slotLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Тривалість</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{durationText}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Оплата  </dt>
            <dd className="mt-1 text-sm text-gray-800">{pricingCaption(booking.pricingModel, booking.payNowAmount)}</dd>
            {booking.payNowAmount != null ? (
              <p className="mt-2 text-lg font-bold tabular-nums text-green-700">
                Сплачено зараз: {booking.payNowAmount.toLocaleString('uk-UA')} грн
              </p>
            ) : null}
          </div>
        </dl>

        <div className="mt-8 border-t border-gray-100 pt-6">
          <Link to={`/dashboard/stations/${booking.stationId}`} className={appPrimaryCtaClass}>
            Сторінка станції
          </Link>
        </div>
      </AppCard>
    </div>
  );
}
