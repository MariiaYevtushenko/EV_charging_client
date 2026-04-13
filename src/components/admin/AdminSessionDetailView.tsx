import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { AdminSessionDetailDto } from '../../api/adminNetwork';
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
    case 'completed':
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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="mt-1.5 text-gray-900">{children}</div>
    </div>
  );
}

export type AdminSessionDetailLinkConfig = {
  stationHref: (stationId: string) => string;
  userHref?: (userId: string) => string | undefined;
  bookingHref?: (bookingId: string) => string | undefined;
};

type Props = {
  data: AdminSessionDetailDto;
  links: AdminSessionDetailLinkConfig;
};

export default function AdminSessionDetailView({ data, links }: Props) {
  const booking = data.booking;
  const userLink = data.userId && links.userHref ? links.userHref(data.userId) : undefined;
  const bookingLink = booking && links.bookingHref ? links.bookingHref(booking.id) : undefined;

  const bookingSameCalendarDay =
    booking && fmtDateShort(booking.start) === fmtDateShort(booking.end);

  return (
    <div className="space-y-6">
      {/* Огляд: статус + ключові цифри */}
      <AppCard className="overflow-hidden !p-0" padding={false}>
        <div className="flex flex-wrap items-stretch justify-between gap-4 border-b border-emerald-100/80 bg-gradient-to-br from-emerald-50/90 via-white to-slate-50/40 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
            <div>
              <p className="text-xs font-medium text-gray-500">Статус сесії</p>
              <div className="mt-1.5">
                <StatusPill tone={sessionTone(data.status)}>{sessionLabel(data.status)}</StatusPill>
              </div>
            </div>
            <div className="hidden h-10 w-px shrink-0 bg-emerald-200/80 sm:block" aria-hidden />
            <div>
              <p className="text-xs font-medium text-gray-500">Енергія</p>
              <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-gray-900">
                {data.kwh.toLocaleString('uk-UA', { maximumFractionDigits: 3 })}
                <span className="ml-1.5 text-base font-semibold text-gray-500">кВт·год</span>
              </p>
            </div>
            {data.bill ? (
              <>
                <div className="hidden h-10 w-px shrink-0 bg-emerald-200/80 sm:block" aria-hidden />
                <div>
                  <p className="text-xs font-medium text-gray-500">Сума за сесію</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800">
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

        <div className="space-y-8 p-5 sm:p-6">
          <section aria-labelledby="session-time-heading">
            <h3 id="session-time-heading" className="text-sm font-semibold text-gray-900">
              Час зарядки
            </h3>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Початок">
                <p className="font-medium leading-snug">{fmtLong(data.startedAt)}</p>
              </Field>
              <Field label="Кінець">
                <p className="font-medium leading-snug">
                  {data.endedAt ? fmtLong(data.endedAt) : '— (сесія активна)'}
                </p>
              </Field>
              <Field label="Порт" className="sm:col-span-2 lg:col-span-1">
                <p className="text-sm leading-relaxed text-gray-800">{data.portLabel}</p>
                <Link
                  to={links.stationHref(data.stationId)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Станція
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </Field>
            </div>
          </section>

          <section
            className="border-t border-gray-100 pt-8"
            aria-labelledby="session-user-heading"
          >
            <h3 id="session-user-heading" className="text-sm font-semibold text-gray-900">
              Користувач і авто
            </h3>
            <div className="mt-4 grid gap-8 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <Field label="Користувач">
                  <p className="text-base font-semibold">{data.userName}</p>
                  {data.userEmail ? (
                    <p className="mt-1 text-sm text-gray-600">{data.userEmail}</p>
                  ) : null}
                </Field>
                {userLink ? (
                  <Link
                    to={userLink}
                    className="mt-4 inline-flex text-sm font-semibold text-green-700 underline-offset-2 hover:text-green-800 hover:underline"
                  >
                    Профіль користувача
                  </Link>
                ) : null}
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <Field label="Авто">
                  {data.vehicle ? (
                    <p className="text-sm leading-relaxed">
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

      {booking ? (
        <AppCard className="!p-0" padding={false}>
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-gray-900">Бронювання</h2>
            <p className="mt-0.5 text-xs text-gray-500">Запис #{booking.id}</p>
          </div>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Статус</span>
              <StatusPill
                tone={
                  booking.status === 'confirmed' || booking.status === 'completed'
                    ? 'success'
                    : booking.status === 'cancelled'
                      ? 'danger'
                      : 'warn'
                }
              >
                {bookingStatusLabel(booking.status)}
              </StatusPill>
            </div>
            <div className="min-w-0 flex-1 sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 sm:hidden">
                Вікно бронювання
              </p>
              {bookingSameCalendarDay ? (
                <p className="mt-1 text-sm text-gray-800 sm:mt-0">
                  <span className="text-gray-500">{fmtDateShort(booking.start)}</span>
                  <span className="mx-1.5 text-gray-300">·</span>
                  <span className="font-medium tabular-nums">{fmtTimeShort(booking.start)}</span>
                  <span className="mx-2 text-gray-400">—</span>
                  <span className="font-medium tabular-nums">{fmtTimeShort(booking.end)}</span>
                </p>
              ) : (
                <p className="mt-1 text-sm leading-relaxed text-gray-800 sm:mt-0">
                  {fmtLong(booking.start)} — {fmtLong(booking.end)}
                </p>
              )}
            </div>
            <div className="shrink-0">
              {bookingLink ? (
                <Link
                  to={bookingLink}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 shadow-sm transition hover:bg-emerald-50 sm:w-auto"
                >
                  Відкрити бронювання
                </Link>
              ) : (
                <span className="text-sm text-gray-500">Без посилання в кабінеті</span>
              )}
            </div>
          </div>
        </AppCard>
      ) : (
        <AppCard className="!p-5">
          <p className="text-sm text-gray-600">
            Немає прив’язаного бронювання <span className="text-gray-400">(walk-in або інший сценарій)</span>
          </p>
        </AppCard>
      )}

      <div id="admin-session-bill" className="scroll-mt-24">
      <AppCard className="!p-0" padding={false}>
        <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50/90 to-white px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">Рахунок</h2>
            {data.bill ? (
              <span className="font-mono text-xs text-gray-500">ID {data.bill.id}</span>
            ) : null}
          </div>
        </div>

        {data.bill ? (
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">До сплати</p>
                <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-gray-900">
                  {data.bill.calculatedAmount.toLocaleString('uk-UA', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  <span className="text-xl font-semibold text-gray-500">грн</span>
                </p>
                <div className="mt-3">
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

              <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <Field label="Оплачено" className="sm:col-span-2 lg:col-span-1">
                  <p className="text-sm">{data.bill.paidAt ? fmtLong(data.bill.paidAt) : '—'}</p>
                </Field>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 sm:px-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Рахунок створено</p>
              <p className="mt-1 text-sm text-gray-800">{fmtLong(data.bill.createdAt)}</p>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <p className="text-sm text-amber-900">
              Рахунок ще не сформовано. Для завершених сесій очікується запис у таблиці{' '}
              <code className="rounded bg-amber-50 px-1.5 py-0.5 text-xs">bill</code>.
            </p>
          </div>
        )}
      </AppCard>
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
