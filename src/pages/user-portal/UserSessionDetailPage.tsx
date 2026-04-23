import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStations } from '../../context/StationsContext';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard, DangerButton, StatusPill } from '../../components/station-admin/Primitives';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FloatingToast, FloatingToastRegion } from '../../components/admin/FloatingToast';
import {
  prefetchSessionCompleteNotificationPermission,
  showSessionCompleteDesktopNotifications,
} from '../../utils/sessionCompleteNotifications';
import { completeUserSession } from '../../api/userSessions';
import { userFacingApiErrorMessage } from '../../api/http';
import { liveKwhSoFarAt } from '../../utils/liveSessionKwh';
import { userPortalPageTitle } from '../../styles/userPortalTheme';
import { formatCountryLabel } from '../../utils/countryDisplay';
import type { UserBookingStatus, UserPaymentRow, UserSessionUiStatus } from '../../types/userPortal';

type UserSessionLocationState = { showSessionCompleteHints?: boolean };

const backLinkClass =
  'inline-flex text-sm font-semibold text-emerald-700 transition hover:text-emerald-900 hover:underline';

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

function fmtTimeShort(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function fmtDateShort(iso: string) {
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

function fmtBookingPeriodLine(startIso: string, endIso: string) {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sameDay = s.toDateString() === e.toDateString();
    const d1 = s.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
    const t1 = s.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const t2 = e.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return `${d1} ${t1} — ${t2}`;
    const d2 = e.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${d1}, ${t1} — ${d2}, ${t2}`;
  } catch {
    return `${startIso} — ${endIso}`;
  }
}

function sessionRecordStatusUi(
  status: UserSessionUiStatus
): { label: string; tone: 'success' | 'warn' | 'muted' | 'danger' | 'info' } {
  switch (status) {
    case 'active':
      return { label: 'Активна', tone: 'success' };
    case 'failed':
      return { label: 'Збій', tone: 'danger' };
    default:
      return { label: 'Завершено', tone: 'success' };
  }
}

function bookingStatusUi(status: UserBookingStatus): { label: string; tone: 'success' | 'warn' | 'muted' | 'danger' | 'info' } {
  switch (status) {
    case 'upcoming':
      return { label: 'Очікує', tone: 'warn' };
    case 'active':
      return { label: 'Активне', tone: 'success' };
    case 'completed':
      return { label: 'Завершено', tone: 'success' };
    case 'missed':
      return { label: 'Пропущено', tone: 'info' };
    case 'cancelled':
      return { label: 'Скасовано', tone: 'danger' };
    default:
      return { label: '—', tone: 'muted' };
  }
}

function paymentStatusUi(
  status: UserPaymentRow['status'] | undefined
): { label: string; tone: 'success' | 'warn' | 'muted' | 'danger' } {
  switch (status) {
    case 'success':
      return { label: 'Успішно', tone: 'success' };
    case 'pending':
      return { label: 'Очікує на оплату', tone: 'warn' };
    case 'failed':
      return { label: 'Відмовлено', tone: 'danger' };
    default:
      return { label: 'Невідомо', tone: 'muted' };
  }
}

const ctaIconClass = 'h-4 w-4';

function CtaChevron() {
  return (
    <svg className={ctaIconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

const portalSessionCtaClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700';

function LocationPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function UserSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sessions, bookings, payments, reloadSessionsAndPayments } = useUserPortal();
  const { getStation } = useStations();

  const hintsHandledRef = useRef(false);
  const hintsRetryReloadRef = useRef(false);
  const [sessionCompleteToast1, setSessionCompleteToast1] = useState(false);
  const [sessionCompleteToast2, setSessionCompleteToast2] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [endSessionError, setEndSessionError] = useState<string | null>(null);

  useEffect(() => {
    hintsHandledRef.current = false;
    hintsRetryReloadRef.current = false;
  }, [sessionId]);

  const session = useMemo(() => sessions.find((s) => s.id === sessionId), [sessions, sessionId]);

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (session?.status !== 'active') return;
    const t = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [session?.status, sessionId]);

  const displayedSessionKwh = useMemo(() => {
    if (!session) return 0;
    if (session.status !== 'active') return session.kwh;
    return liveKwhSoFarAt(session, nowTick, getStation);
  }, [session, nowTick, getStation]);

  useEffect(() => {
    if (!sessionId) return;
    const st = location.state as UserSessionLocationState | null | undefined;
    if (!st?.showSessionCompleteHints || hintsHandledRef.current) return;

    if (!session) {
      if (!hintsRetryReloadRef.current) {
        hintsRetryReloadRef.current = true;
        void reloadSessionsAndPayments();
      }
      return;
    }

    hintsHandledRef.current = true;
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: {} }
    );
    setSessionCompleteToast1(true);
    showSessionCompleteDesktopNotifications();
    const t1 = window.setTimeout(() => {
      setSessionCompleteToast1(false);
      setSessionCompleteToast2(true);
    }, 4200);
    const t2 = window.setTimeout(() => setSessionCompleteToast2(false), 9200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [
    session,
    sessionId,
    location.state,
    location.pathname,
    location.search,
    location.hash,
    navigate,
    reloadSessionsAndPayments,
  ]);
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

  const amountDisplay = linkedPayment?.amount ?? session?.cost ?? 0;

  const bookingSameCalendarDay =
    linkedBooking && fmtDateShort(linkedBooking.start) === fmtDateShort(linkedBooking.end);

  const handleConfirmEndSession = useCallback(async () => {
    if (!sessionId || !session || session.status !== 'active') return;
    const uid = Number(user?.id);
    if (!Number.isFinite(uid)) return;
    setEndSessionError(null);
    setEndingSession(true);
    try {
      await completeUserSession(uid, Number(sessionId), {
        kwhConsumed: Math.max(0, liveKwhSoFarAt(session, nowTick, getStation)),
      });
      hintsHandledRef.current = false;
      await reloadSessionsAndPayments();
      setConfirmEndOpen(false);
      navigate(
        { pathname: location.pathname, search: location.search, hash: location.hash },
        { replace: true, state: { showSessionCompleteHints: true } }
      );
    } catch (e) {
      setEndSessionError(userFacingApiErrorMessage(e, 'Не вдалося завершити сесію'));
    } finally {
      setEndingSession(false);
    }
  }, [
    session,
    sessionId,
    user?.id,
    reloadSessionsAndPayments,
    navigate,
    location.pathname,
    location.search,
    location.hash,
    getStation,
    nowTick,
  ]);

  if (!session) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/sessions" className={backLinkClass}>
          ← До списку сесій
        </Link>
        <AppCard className="py-12 text-center text-sm text-gray-500">Сесію не знайдено.</AppCard>
      </div>
    );
  }

  const stationLine = `${session.stationName}${session.portLabel ? ` — ${session.portLabel}` : ''}`;
  const hasBooking = Boolean(session.bookingId);
  const billPaymentStatus = paymentStatusUi(linkedPayment?.status);
  const sessionUi = sessionRecordStatusUi(session.status);

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmEndOpen && session.status === 'active'}
        onClose={() => !endingSession && setConfirmEndOpen(false)}
        onConfirm={() => void handleConfirmEndSession()}
        title="Завершити зарядку?"
        description={
          <span>
            Ви точно хочете завершити сесію на станції «{session.stationName}»? Буде створено рахунок за спожиту
            енергію.
            {endSessionError ? (
              <span className="mt-3 block text-sm font-medium text-red-700">{endSessionError}</span>
            ) : null}
          </span>
        }
        confirmLabel={endingSession ? 'Завершення…' : 'Так, завершити'}
        cancelLabel="Скасувати"
        variant="danger"
        busy={endingSession}
      />
      <FloatingToastRegion live="assertive">
        <FloatingToast
          show={sessionCompleteToast1}
          tone="success"
          onDismiss={() => setSessionCompleteToast1(false)}
        >
          Сесію зарядки успішно завершено.
        </FloatingToast>
        <FloatingToast
          show={sessionCompleteToast2}
          tone="info"
          onDismiss={() => setSessionCompleteToast2(false)}
        >
          Можете оплатити рахунок у розділі «Платежі».
        </FloatingToast>
      </FloatingToastRegion>
      <div>
        <Link to="/dashboard/sessions" className={backLinkClass}>
          ← До списку сесій
        </Link>
        <h1 className={`${userPortalPageTitle} mt-3`}>Сесія #{session.id}</h1>
      </div>

      <div
        className={
          hasBooking
            ? 'grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-6'
            : 'mx-auto flex w-full max-w-4xl flex-col gap-4'
        }
      >
        <div className={`flex min-w-0 flex-col ${hasBooking ? 'min-h-0 lg:h-full' : ''}`}>
          <AppCard
            className={`flex flex-col overflow-hidden !p-0 ${hasBooking ? 'h-full min-h-0' : ''} ${
              session.status === 'active' ? 'ring-2 ring-emerald-400/35 ring-offset-2 ring-offset-white' : ''
            }`}
            padding={false}
          >
            <div className="flex flex-wrap items-stretch justify-between gap-3 border-b border-emerald-100/80 bg-gradient-to-br from-emerald-50/90 via-white to-slate-50/40 px-4 py-4 sm:px-5">
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 lg:gap-6">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <p className="text-xs font-medium text-gray-500">Статус сесії</p>
                  <StatusPill tone={sessionUi.tone}>{sessionUi.label}</StatusPill>
                </div>
                <div className="hidden h-9 w-px shrink-0 bg-emerald-200/80 sm:block" aria-hidden />
                <div>
                  <p className="text-xs font-medium text-gray-500">Енергія</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-gray-900 sm:text-2xl">
                    {displayedSessionKwh.toLocaleString('uk-UA', { maximumFractionDigits: 3 })}
                    <span className="ml-1.5 text-base font-semibold text-gray-500">кВт·год</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-5 p-4 sm:p-5">
             
              <section aria-labelledby="user-session-time-heading">
                <h3
                  id="user-session-time-heading"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  Час
                </h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="Початок">
                    <p className="font-medium">{fmtDateTimeLong(session.startedAt)}</p>
                  </Field>
                  <Field label="Кінець">
                    <p className="font-medium">
                      {session.status === 'active'
                        ? '— (триває)'
                        : session.endedAt
                          ? fmtDateTimeLong(session.endedAt)
                          : '—'}
                    </p>
                  </Field>
                </div>
              </section>

              <section
                className="border-t border-gray-100 pt-5"
                aria-labelledby="user-session-station-heading"
              >
                <h3
                  id="user-session-station-heading"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  Станція
                </h3>
                <div className="mt-3">
                  <p className="text-sm font-medium leading-snug text-gray-800">{stationLine}</p>
                  {station ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <LocationPinIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span>
                        {[station.city, formatCountryLabel(station.country)].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </p>
                  ) : null}
                </div>
              </section>

              {session.status === 'active' ? (
                <div className="border-t border-gray-100 pt-5">
                  <DangerButton
                    type="button"
                    className="w-full"
                    onClick={() => {
                      setEndSessionError(null);
                      prefetchSessionCompleteNotificationPermission();
                      setConfirmEndOpen(true);
                    }}
                  >
                    Завершити сесію
                  </DangerButton>
                </div>
              ) : null}
            </div>
          </AppCard>
        </div>

        <div
          className={`flex min-w-0 flex-col gap-4 ${hasBooking ? 'min-h-0 lg:h-full' : ''}`}
        >
          {session.bookingId ? (
            <AppCard className="shrink-0 !overflow-hidden !p-0" padding={false}>
              <div className="border-b border-emerald-100/80 bg-gradient-to-br from-emerald-50/80 via-white to-slate-50/40 px-4 py-3.5 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-gray-900">Бронювання</h2>
                  </div>
                  {linkedBooking ? (
                    <StatusPill tone={bookingStatusUi(linkedBooking.status).tone}>
                      {bookingStatusUi(linkedBooking.status).label}
                    </StatusPill>
                  ) : (
                    <StatusPill tone="muted">—</StatusPill>
                  )}
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5 sm:px-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Період бронювання
                    </p>
                    <div className="mt-1.5">
                      {linkedBooking ? (
                        bookingSameCalendarDay ? (
                          <p className="text-sm text-gray-800">
                            <span className="text-gray-500">{fmtDateShort(linkedBooking.start)}</span>
                            <span className="mx-1.5 text-gray-300">·</span>
                            <span className="font-medium tabular-nums">{fmtTimeShort(linkedBooking.start)}</span>
                            <span className="mx-2 text-gray-400">—</span>
                            <span className="font-medium tabular-nums">{fmtTimeShort(linkedBooking.end)}</span>
                          </p>
                        ) : (
                          <p className="text-sm leading-snug text-gray-800">
                            {fmtBookingPeriodLine(linkedBooking.start, linkedBooking.end)}
                          </p>
                        )
                      ) : (
                        <p className="text-sm text-gray-500">Бронювання #{session.bookingId}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Link to={`/dashboard/bookings/${session.bookingId}`} className={portalSessionCtaClass}>
                      Бронювання
                      <CtaChevron />
                    </Link>
                  </div>
                </div>
              </div>
            </AppCard>
          ) : null}

          <div
            className={`min-w-0 scroll-mt-24 ${hasBooking ? 'flex min-h-0 flex-1 flex-col' : ''}`}
          >
            <AppCard
              className={`flex flex-col !p-0 ${hasBooking ? 'min-h-0 flex-1' : ''}`}
              padding={false}
            >
              <div className="flex items-center justify-between gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50/90 to-white px-4 py-3 sm:px-5">
                <h2 className="min-w-0 truncate text-sm font-semibold text-gray-900">Рахунок</h2>
                <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
                 
                  <StatusPill tone={billPaymentStatus.tone}>{billPaymentStatus.label}</StatusPill>
                </div>
              </div>
              <div
                className={`flex flex-col gap-4 p-4 sm:p-5 ${hasBooking ? 'min-h-0 flex-1' : ''}`}
              >
                {session.status === 'active' ? (
                  <p className="text-sm leading-relaxed text-gray-600">
                    Рахунок з&apos;явиться тут після завершення сесії. Натисніть «Завершити сесію» у блоці вище.
                  </p>
                ) : (
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">До сплати</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-gray-900 sm:text-3xl">
                        {amountDisplay.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        <span className="text-lg font-semibold text-gray-500 sm:text-xl">грн</span>
                      </p>
                    </div>
                    {paymentHref ? (
                      <Link
                        to={paymentHref}
                        className={`${portalSessionCtaClass} w-full shrink-0 justify-center sm:w-auto sm:justify-center`}
                      >
                        Рахунок
                        <CtaChevron />
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>
            </AppCard>
          </div>
        </div>
      </div>
    </div>
  );
}
