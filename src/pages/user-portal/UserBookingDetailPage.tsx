import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStations } from '../../context/StationsContext';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard, OutlineButton, StatusPill } from '../../components/station-admin/Primitives';
import { appPrimaryCtaClass } from '../../components/station-admin/formStyles';
import { userPortalPageTitle } from '../../styles/userPortalTheme';
import type { UserBookingPricingModel, UserBookingStatus } from '../../types/userPortal';

const backLinkClass =
  'inline-flex text-sm font-semibold text-emerald-700 transition hover:text-emerald-900 hover:underline';

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500';

const linkAccentClass =
  'inline-flex items-center gap-0.5 text-sm font-semibold text-emerald-700 transition hover:text-emerald-900 hover:underline';

function fmtDateTimeLong(iso: string) {
  try {
    return new Date(iso).toLocaleString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusTone(s: UserBookingStatus): 'success' | 'warn' | 'muted' | 'danger' | 'info' {
  switch (s) {
    case 'upcoming':
      return 'warn';
    case 'active':
      return 'success';
    case 'completed':
      return 'muted';
    case 'missed':
      return 'info';
    case 'cancelled':
      return 'danger';
    default:
      return 'muted';
  }
}

function statusLabel(s: UserBookingStatus) {
  switch (s) {
    case 'upcoming':
      return 'Очікує';
    case 'active':
      return 'Активне';
    case 'completed':
      return 'Завершено';
    case 'missed':
      return 'Пропущено';
    case 'cancelled':
      return 'Скасовано';
    default:
      return s;
  }
}

function pricingTypeLabel(model: UserBookingPricingModel | undefined): string {
  if (model === 'reservation_fee') return 'Фіксована ціна на момент бронювання';
  if (model === 'dynamic_prepay') return 'Передплата (динамічна ціна)';
  return '—';
}

function pricingValueLine(
  model: UserBookingPricingModel | undefined,
  payNowAmount: number | undefined
): string {
  if (model === 'reservation_fee' && payNowAmount != null) {
    return `${payNowAmount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`;
  }
  if (model === 'dynamic_prepay' && payNowAmount != null) {
    return `${payNowAmount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} грн/кВт·год`;
  }
  if (payNowAmount != null) {
    return `${payNowAmount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`;
  }
  return '—';
}

function pricingValueCaption(model: UserBookingPricingModel | undefined): string {
  if (model === 'reservation_fee') return 'Сума передплати';
  if (model === 'dynamic_prepay') return 'Розрахунковий тариф';
  return 'Сума';
}

export default function UserBookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bookings, cancelBooking, cars } = useUserPortal();
  const { getStation } = useStations();

  const booking = useMemo(
    () => bookings.find((b) => b.id === bookingId),
    [bookings, bookingId]
  );

  const station = booking ? getStation(booking.stationId) : undefined;

  if (!booking) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/bookings" className={backLinkClass}>
          ← До бронювань
        </Link>
        <AppCard className="py-12 text-center text-sm text-gray-500">Бронювання не знайдено</AppCard>
      </div>
    );
  }

  const canCancel = booking.status === 'upcoming';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/dashboard/bookings" className={backLinkClass}>
          ← До бронювань
        </Link>
        {canCancel ? (
          <OutlineButton
            type="button"
            className="!text-xs"
            onClick={() => {
              void (async () => {
                await cancelBooking(booking.id);
                navigate('/dashboard/bookings');
              })();
            }}
          >
            Скасувати бронювання
          </OutlineButton>
        ) : null}
      </div>

      <div>
        <h1 className={userPortalPageTitle}>Бронювання #{booking.id}</h1>
      </div>

      <AppCard padding={false} className="overflow-hidden border-slate-200/90 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">Статус:</span>
            <StatusPill tone={statusTone(booking.status)}>{statusLabel(booking.status)}</StatusPill>
          </div>
        </div>

        <div className="grid gap-8 p-5 sm:grid-cols-2 sm:gap-10">
          <div className="space-y-6">
            <div>
              <p className={sectionLabel}>Початок</p>
              <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{fmtDateTimeLong(booking.start)}</p>
            </div>
            <div>
              <p className={sectionLabel}>Станція</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{booking.stationName}</p>
              <p className="mt-1 text-sm text-slate-600">{booking.slotLabel}</p>
              {station ? (
                <p className="mt-1 text-xs text-slate-500">
                  {station.city}
                  {station.address ? ` · ${station.address}` : ''}
                </p>
              ) : null}
            </div>
            <Link to={`/dashboard/stations/${booking.stationId}`} className={linkAccentClass}>
              Детальна інформація про станцію
              <span aria-hidden className="text-base leading-none">
                ›
              </span>
            </Link>
          </div>

          <div className="space-y-6">
            <div>
              <p className={sectionLabel}>Кінець</p>
              <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{fmtDateTimeLong(booking.end)}</p>
            </div>
            <div>
              <p className={sectionLabel}>Користувач</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{user?.name ?? '—'}</p>
              {user?.email ? <p className="mt-1 text-xs text-slate-600">{user.email}</p> : null}
              <Link to="/dashboard/profile" className={`${linkAccentClass} mt-3`}>
                Профіль користувача
                <span aria-hidden className="text-base leading-none">
                  ›
                </span>
              </Link>
            </div>
         
          </div>
        </div>

        <div className="grid gap-6 border-t border-slate-100 px-5 py-5 sm:grid-cols-2 sm:gap-10">
          <div>
            <p className={sectionLabel}>Тип бронювання</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{pricingTypeLabel(booking.pricingModel)}</p>
          </div>
          <div>
            <p className={sectionLabel}>{pricingValueCaption(booking.pricingModel)}</p>
            <p className="mt-2 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
              {pricingValueLine(booking.pricingModel, booking.payNowAmount)}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 px-5 py-5">
          <Link to={`/dashboard/stations/${booking.stationId}`} className={`${appPrimaryCtaClass} inline-flex items-center gap-1`}>
            Сторінка станції
            <span aria-hidden className="text-base leading-none">
              ›
            </span>
          </Link>
        </div>
      </AppCard>
    </div>
  );
}
