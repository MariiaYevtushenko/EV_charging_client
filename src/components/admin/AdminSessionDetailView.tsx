import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { AdminSessionDetailDto } from '../../api/adminNetwork';
import { BookingTypeCell } from './BookingTypeCell';
import { AppCard, StatusPill } from '../station-admin/Primitives';

function sessionTone(s: AdminSessionDetailDto['status']): 'success' | 'warn' | 'muted' | 'danger' | 'info' {
  switch (s) {
    case 'completed':
      return 'success';
    case 'active':
      return 'info';
    case 'failed':
      return 'danger';
    default:
      return 'muted';
  }
}

function sessionLabel(s: AdminSessionDetailDto['status']) {
  switch (s) {
    case 'active':
      return 'Активна';
    case 'completed':
      return 'Завершено';
    case 'failed':
      return 'Помилка';
    default:
      return s;
  }
}

function bookingStatusLabel(s: string) {
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

function payStatusLabelUi(s: string) {
  switch (s) {
    case 'success':
      return 'Успіх';
    case 'pending':
      return 'Очікує';
    case 'failed':
      return 'Помилка';
    default:
      return s;
  }
}

function fmtLong(dt: string) {
  try {
    return new Date(dt).toLocaleString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

function fmtTimeShort(dt: string) {
  try {
    return new Date(dt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dt;
  }
}

function fmtDateShort(dt: string) {
  try {
    return new Date(dt).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dt;
  }
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="mt-1 text-sm leading-snug text-gray-900">{children}</div>
    </div>
  );
}

export type AdminSessionDetailLinkConfig = {
  stationHref: (stationId: string) => string;
  userHref?: (userId: string) => string | undefined;
  bookingHref?: (bookingId: string) => string | undefined;
};

type SessionControlProps = {
  onComplete: (opts: { kwhConsumed?: number }) => Promise<void>;
  completing: boolean;
  error: string | null;
};

type Props = {
  data: AdminSessionDetailDto;
  links: AdminSessionDetailLinkConfig;
  /** Глобальний адмін: завершити активну сесію та створити bill */
  sessionControl?: SessionControlProps;
};

export default function AdminSessionDetailView({ data, links, sessionControl }: Props) {
  const booking = data.booking;
  const userLink = data.userId && links.userHref ? links.userHref(data.userId) : undefined;
  const bookingLink = booking && links.bookingHref ? links.bookingHref(booking.id) : undefined;

  const bookingSameCalendarDay =
    booking && fmtDateShort(booking.start) === fmtDateShort(booking.end);

  const [kwhDraft, setKwhDraft] = useState(() => String(data.kwh));
  useEffect(() => {
    setKwhDraft(String(data.kwh));
  }, [data.id, data.kwh, data.status]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-6">
      {/* Ліва колонка: сесія */}
      <div className="flex min-h-0 min-w-0 flex-col lg:h-full">
      <AppCard className="flex h-full min-h-0 flex-col overflow-hidden !p-0" padding={false}>
        <div className="flex flex-wrap items-stretch justify-between gap-3 border-b border-emerald-100/80 bg-gradient-to-br from-emerald-50/90 via-white to-slate-50/40 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 lg:gap-6">
            <div>
              <p className="text-xs font-medium text-gray-500">Статус сесії</p>
              <div className="mt-1.5">
                <StatusPill tone={sessionTone(data.status)}>{sessionLabel(data.status)}</StatusPill>
              </div>
            </div>
            <div className="hidden h-9 w-px shrink-0 bg-emerald-200/80 sm:block" aria-hidden />
            <div>
              <p className="text-xs font-medium text-gray-500">Енергія</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-gray-900 sm:text-2xl">
                {data.kwh.toLocaleString('uk-UA', { maximumFractionDigits: 3 })}
                <span className="ml-1.5 text-base font-semibold text-gray-500">кВт·год</span>
              </p>
            </div>
            {data.bill ? (
              <>
                <div
                  className="hidden h-9 w-px shrink-0 bg-emerald-200/80 sm:block lg:hidden"
                  aria-hidden
                />
                <div className="lg:hidden">
                  <p className="text-xs font-medium text-gray-500">Сума за сесію</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-emerald-800 sm:text-2xl">
                    {data.bill.calculatedAmount.toLocaleString('uk-UA', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    <span className="text-base font-semibold text-emerald-700/90">грн</span>
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {data.status === 'active' && sessionControl ? (
          <div className="border-b border-emerald-100/80 bg-amber-50/40 px-4 py-3 sm:px-5">
            <p className="text-sm font-semibold text-gray-900">Керування сесією</p>
           
            <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:gap-3">
              <label className="block min-w-0 flex-1 text-sm">
                <span className="text-gray-600">Спожито кВт·год</span>
                <input
                  type="number"
                  min={0}
                  step={0.001}
                  value={kwhDraft}
                  onChange={(e) => setKwhDraft(e.target.value)}
                  disabled={sessionControl.completing}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm tabular-nums text-gray-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 disabled:opacity-60"
                />
              </label>
              <button
                type="button"
                disabled={sessionControl.completing}
                onClick={async () => {
                  const normalized = kwhDraft.replace(',', '.').trim();
                  const parsed = Number(normalized);
                  const kwhConsumed =
                    normalized !== '' && Number.isFinite(parsed) && parsed >= 0 ? parsed : data.kwh;
                  await sessionControl.onComplete({ kwhConsumed });
                }}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
              >
                {sessionControl.completing ? 'Завершення…' : 'Завершити сесію'}
              </button>
            </div>
            {sessionControl.error ? (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {sessionControl.error}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-1 flex-col space-y-5 p-4 sm:p-5">
          <section aria-labelledby="session-time-heading">
            <h3 id="session-time-heading" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Час
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Початок">
                <p className="font-medium">{fmtLong(data.startedAt)}</p>
              </Field>
              <Field label="Кінець">
                <p className="font-medium">
                  {data.endedAt ? fmtLong(data.endedAt) : '— (сесія активна)'}
                </p>
              </Field>
              <Field label="Станція" className="sm:col-span-2">
                <div className="flex min-w-0 items-center gap-3">
                  <p className="min-w-0 flex-1 truncate text-gray-800" title={data.portLabel}>
                    {data.portLabel}
                  </p>
                  <Link
                    to={links.stationHref(data.stationId)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    Станція
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </Field>
            </div>
          </section>

          <section
            className="border-t border-gray-100 pt-5"
            aria-labelledby="session-user-heading"
          >
            
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                <Field label="Користувач">
                  <p className="text-base font-semibold leading-tight">{data.userName}</p>
                  {data.userEmail ? (
                    <p className="mt-0.5 text-sm text-gray-600">{data.userEmail}</p>
                  ) : null}
                </Field>
                {userLink ? (
                  <Link
                    to={userLink}
                    className="mt-2.5 inline-flex text-sm font-semibold text-green-700 underline-offset-2 hover:text-green-800 hover:underline"
                  >
                    Профіль користувача
                  </Link>
                ) : null}
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                <Field label="Авто">
                  {data.vehicle ? (
                    <p className="leading-snug ">
                      <span className="font-medium text-gray-900">{data.vehicle.model}</span>
                      <span className="text-gray-400"> · </span>
                      <span className="font-mono text-gray-800">{data.vehicle.plate}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">Не вказано</p>
                  )}
                </Field>
              </div>
            </div>
          </section>
        </div>
      </AppCard>
      </div>

      {/* Права колонка: бронювання + рахунок (одна висота з лівою колонкою на lg) */}
      <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:h-full">
      {booking ? (
        <AppCard className="shrink-0 !p-0 overflow-hidden" padding={false}>
          <div className="border-b border-emerald-100/80 bg-gradient-to-br from-emerald-50/80 via-white to-slate-50/40 px-4 py-3.5 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">Бронювання</h2>
                  <BookingTypeCell
                    bookingType={booking.bookingType}
                    prepaymentAmount={booking.prepaymentAmount}
                  />
                </div>
              </div>
              <StatusPill
                tone={
                  booking.status === 'confirmed' || booking.status === 'paid'
                    ? 'success'
                    : booking.status === 'cancelled'
                      ? 'danger'
                      : 'warn'
                }
              >
                {bookingStatusLabel(booking.status)}
              </StatusPill>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="min-w-0 flex-1 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5 sm:px-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Період бронювання
                </p>
                <div className="mt-1.5">
                  {bookingSameCalendarDay ? (
                    <p className="text-sm text-gray-800">
                      <span className="text-gray-500">{fmtDateShort(booking.start)}</span>
                      <span className="mx-1.5 text-gray-300">·</span>
                      <span className="font-medium tabular-nums">{fmtTimeShort(booking.start)}</span>
                      <span className="mx-2 text-gray-400">—</span>
                      <span className="font-medium tabular-nums">{fmtTimeShort(booking.end)}</span>
                    </p>
                  ) : (
                    <p className="text-sm leading-snug text-gray-800">
                      {fmtLong(booking.start)} — {fmtLong(booking.end)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center">
                {bookingLink ? (
                  <Link
                    to={bookingLink}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    Бронювання
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ) : (
                  <span className="text-sm text-gray-500">Без посилання в кабінеті</span>
                )}
              </div>
            </div>
          </div>
        </AppCard>
      ) : (
        <AppCard className="shrink-0 !p-4">
          <p className="text-sm leading-snug text-gray-600 text-center">
            Немає прив’язаного бронювання 
          </p>
        </AppCard>
      )}

      <div id="admin-session-bill" className="flex min-h-0 min-w-0 flex-1 flex-col scroll-mt-24">
      <AppCard className="flex min-h-0 flex-1 flex-col !p-0" padding={false}>
        <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50/90 to-white px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Рахунок</h2>

          </div>
        </div>

        {data.bill ? (
          <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">До сплати</p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-gray-900 sm:text-3xl">
                  {data.bill.calculatedAmount.toLocaleString('uk-UA', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  <span className="text-lg font-semibold text-gray-500 sm:text-xl">грн</span>
                </p>
                <div className="mt-2">
                  <StatusPill
                    tone={
                      data.bill.paymentStatus === 'success'
                        ? 'success'
                        : data.bill.paymentStatus === 'failed'
                          ? 'danger'
                          : 'warn'
                    }
                  >
                    {payStatusLabelUi(data.bill.paymentStatus)}
                  </StatusPill>
                </div>
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <Field label="Ціна кВт·год (на момент)">
                  <p className="tabular-nums text-gray-900">
                    {data.bill.pricePerKwhAtTime != null
                      ? `${data.bill.pricePerKwhAtTime.toLocaleString('uk-UA', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })} грн`
                      : '—'}
                  </p>
                </Field>
                <Field label="Спосіб оплати">
                  <p>{data.bill.paymentMethod}</p>
                </Field>
                <Field label="Оплачено" className="sm:col-span-2">
                  <p className="text-sm">{data.bill.paidAt ? fmtLong(data.bill.paidAt) : '—'}</p>
                </Field>
              </div>
            </div>

           
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-4 text-center sm:p-5">
            {data.status === 'failed' ? (
              <p className="max-w-md text-sm text-slate-600">
                Рахунок для цієї сесії відсутній
              
              </p>
            ) : data.status === 'active' ? (
              <p className="max-w-md text-sm text-slate-600">
                Рахунок ще не сформовано — сесія активна. Після завершення тут з’явиться підсумок
                оплати.
              </p>
            ) : (
              <p className="max-w-md text-sm text-amber-900">
                Рахунок ще не сформовано. Для завершених сесій очікується запис у таблиці{' '}
                <code className="rounded bg-amber-50 px-1.5 py-0.5 text-xs">bill</code>.
              </p>
            )}
          </div>
        )}
      </AppCard>
      </div>
      </div>
    </div>
  );
}

export function AdminSessionDetailBackLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800">
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {children}
    </Link>
  );
}
