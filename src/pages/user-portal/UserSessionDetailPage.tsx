import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStations } from '../../context/StationsContext';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { appPrimaryCtaClass } from '../../components/station-admin/formStyles';

function fmtFull(dt: string) {
  try {
    return new Date(dt).toLocaleString('uk-UA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dt;
  }
}

function durationLabel(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h} год ${m} хв (${min} хв)`;
  if (h > 0) return `${h} год (${min} хв)`;
  return `${min} хв`;
}

function fmtShortBookingStart(iso: string) {
  try {
    return new Date(iso).toLocaleString('uk-UA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtPaymentDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const relatedLinkClass =
  'inline-flex text-sm font-semibold text-emerald-700 transition hover:text-emerald-900 hover:underline';

export default function UserSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { sessions, bookings, payments } = useUserPortal();
  const { getStation } = useStations();

  const session = useMemo(() => sessions.find((s) => s.id === sessionId), [sessions, sessionId]);
  const station = session ? getStation(session.stationId) : undefined;

  const linkedBooking = useMemo(
    () => (session?.bookingId ? bookings.find((b) => b.id === session.bookingId) : undefined),
    [bookings, session]
  );

  const linkedPayment = useMemo(() => {
    if (!session) return undefined;
    if (session.billId) return payments.find((p) => p.id === session.billId);
    return payments.find((p) => p.sessionId === session.id);
  }, [payments, session]);

  const paymentIdForLink = session?.billId ?? linkedPayment?.id;
  const paymentHref = paymentIdForLink ? `/dashboard/payments/${paymentIdForLink}` : null;

  const avgPerKwh =
    session && session.kwh > 0 ? session.cost / session.kwh : null;

  if (!session) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/sessions" className="text-sm font-medium text-green-700 hover:underline">
          ← До історії сесій
        </Link>
        <AppCard className="py-12 text-center text-sm text-gray-500">Сесію не знайдено.</AppCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/dashboard/sessions" className="text-sm font-medium text-green-700 hover:underline">
        ← До історії сесій
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Деталі сесії</h1>
          <p className="mt-1 font-mono text-xs text-gray-400">ID: {session.id}</p>
        </div>
        <StatusPill tone="muted">Завершено</StatusPill>
      </div>

      <AppCard className="!p-6">
        <p className="text-lg font-bold text-gray-900">{session.stationName}</p>
        {station ? (
          <p className="mt-1 text-sm text-gray-600">
            {station.city}, {station.address}
          </p>
        ) : null}

        <dl className="mt-6 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Порт</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{session.portLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Тривалість</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{durationLabel(session.durationMin)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Початок</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{fmtFull(session.startedAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Кінець</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{fmtFull(session.endedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Енергія</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-gray-900">
              {session.kwh.toLocaleString('uk-UA')} кВт·год
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Вартість</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-green-700">
              {session.cost.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн
            </dd>
          </div>
          {avgPerKwh != null ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Середня ціна</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-800">
                {avgPerKwh.toLocaleString('uk-UA', { maximumFractionDigits: 2 })} грн / кВт·год
              </dd>
            </div>
          ) : null}
        </dl>

        {session.bookingId || paymentHref ? (
          <div className="mt-6 border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold text-gray-900">Пов’язані записи</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {session.bookingId ? (
                <div className="rounded-xl border border-gray-100 bg-slate-50/90 p-4 ring-1 ring-slate-900/[0.03]">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Бронювання</p>
                  {linkedBooking ? (
                    <>
                      <p className="mt-2 text-sm font-semibold text-gray-900">{linkedBooking.stationName}</p>
                      <p className="mt-0.5 text-xs text-gray-600">{linkedBooking.slotLabel}</p>
                      <p className="mt-1 text-xs text-gray-500">{fmtShortBookingStart(linkedBooking.start)}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-gray-600">Бронювання #{session.bookingId}</p>
                  )}
                  <Link
                    to={`/dashboard/bookings/${session.bookingId}`}
                    className={`${relatedLinkClass} mt-3`}
                  >
                    Деталі бронювання
                  </Link>
                </div>
              ) : null}

              {paymentHref ? (
                <div className="rounded-xl border border-gray-100 bg-slate-50/90 p-4 ring-1 ring-slate-900/[0.03]">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Платіж</p>
                  {linkedPayment ? (
                    <>
                      <p className="mt-2 text-lg font-bold tabular-nums text-gray-900">
                        {linkedPayment.amount.toLocaleString('uk-UA', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        грн
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{fmtPaymentDate(linkedPayment.createdAt)}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-gray-600">
                      Рахунок за сесію
                      {session.cost > 0 ? (
                        <span className="ml-1 font-semibold tabular-nums text-gray-900">
                          ·{' '}
                          {session.cost.toLocaleString('uk-UA', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          грн
                        </span>
                      ) : null}
                    </p>
                  )}
                  <Link to={paymentHref} className={`${relatedLinkClass} mt-3`}>
                    Деталі платежу
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-8 border-t border-gray-100 pt-6">
          <Link to={`/dashboard/stations/${session.stationId}`} className={appPrimaryCtaClass}>
            Сторінка станції
          </Link>
        </div>
      </AppCard>
    </div>
  );
}
