import { Link, Navigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useGlobalAdmin } from '../../context/GlobalAdminContext';
import { fetchAdminUserDetail } from '../../api/adminUsers';
import type { EndUser, EndUserBooking, EndUserCar, EndUserPayment, EndUserSession } from '../../types/globalAdmin';
import { getCarBrandLogoUrl } from '../../utils/carBrandLogo';
import { AppCard } from '../../components/station-admin/Primitives';
import { globalAdminPageTitle } from '../../styles/globalAdminTheme';
import { stationFormBackIconLink } from '../../styles/stationAdminTheme';

type UserTab = 'cars' | 'bookings' | 'sessions' | 'payments';

/** Фільтр списків історії на вкладках бронювань / сесій / платежів. */
type HistoryTimeRange = '7d' | '30d' | 'all';

const HISTORY_RANGE_OPTIONS: { id: HistoryTimeRange; label: string }[] = [
  { id: '7d', label: '7 днів' },
  { id: '30d', label: '30 днів' },
  { id: 'all', label: 'Весь час' },
];

function historyRangeCutoffMs(range: HistoryTimeRange): number | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function isOnOrAfterCutoff(isoDate: string, range: HistoryTimeRange): boolean {
  const cutoff = historyRangeCutoffMs(range);
  if (cutoff == null) return true;
  const t = new Date(isoDate).getTime();
  return Number.isFinite(t) && t >= cutoff;
}

const tabClass = (active: boolean) =>
  `relative shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
    active
      ? 'border-green-600 text-green-800'
      : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800'
  }`;

/** Оболонка контенту: менший зазор зверху відносно main, ширші поля по боках. */
const userDetailPageShell = '-mt-3 space-y-6 px-3 sm:px-6 lg:px-10 xl:px-12';

/** Лівіше за контент; у рядку з аватаром вирівнюється по центру висоти іконки. */
const userDetailBackLinkClass = `${stationFormBackIconLink} -ml-3 shrink-0 sm:-ml-4`;

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

/** Колір напису статусу — той самий відтінок, що й у `BookingStatusIcon`. */
function bookingStatusTextClass(status: EndUserBooking['status']): string {
  switch (status) {
    case 'pending':
      return 'text-amber-700';
    case 'confirmed':
      return 'text-sky-700';
    case 'paid':
      return 'text-green-700';
    case 'cancelled':
      return 'text-red-700';
    default:
      return 'text-slate-600';
  }
}

/** Коротка дата числами (без назв місяців) — бронювання та сесії в профілі. */
function formatBookingCardDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso;
    return d.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Колір напису статусу сесії — узгоджено з `SessionStatusIcon`. */
function sessionStatusTextClass(status: EndUserSession['status']): string {
  switch (status) {
    case 'active':
      return 'text-sky-700';
    case 'completed':
      return 'text-green-700';
    case 'failed':
      return 'text-red-700';
    default:
      return 'text-slate-600';
  }
}

/** Колір напису статусу платежу — узгоджено з `PaymentStatusIcon`. */
function paymentStatusTextClass(status: EndUserPayment['status']): string {
  switch (status) {
    case 'success':
      return 'text-green-700';
    case 'pending':
      return 'text-amber-700';
    case 'failed':
      return 'text-red-700';
    default:
      return 'text-slate-600';
  }
}

/** Єдина типографіка карток у профілі: авто, бронювання, сесії, платежі. */
const userProfileCardTitleClass = 'text-base font-semibold leading-snug text-slate-900';
const userProfileCardSecondaryClass = 'mt-1 text-sm leading-snug text-slate-600';
const userProfileCardAmountClass = 'mt-1 text-sm font-semibold tabular-nums leading-snug text-slate-900';
const userProfileCardStatusClass = 'mt-1 text-sm font-medium leading-snug';

const userHistoryCardLinkClass =
  'flex min-w-0 items-stretch gap-3 overflow-hidden rounded-xl border border-slate-200/90 bg-white px-3 py-3 shadow-sm transition hover:border-emerald-200/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40';

/** Кольорова смуга на повну висоту картки (компенсація `py-3` у батьківському Link) + тонкі білі поля зверху/знизу. */
function HistoryCardStatusIconShell({ stripClass, children }: { stripClass: string; children: ReactNode }) {
  return (
    <span className="flex w-12 shrink-0 self-stretch -my-3 flex-col py-2" aria-hidden>
      <span
        className={`flex min-h-0 flex-1 items-center justify-center rounded-xl ${stripClass}`}
      >
        {children}
      </span>
    </span>
  );
}

function historyCardIconCircle(icon: ReactNode, circleClass: string) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm ${circleClass}`}
    >
      {icon}
    </span>
  );
}

function BookingStatusIcon({ status }: { status: EndUserBooking['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <HistoryCardStatusIconShell stripClass="bg-amber-100">
          {historyCardIconCircle(
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>,
            'bg-white text-amber-600 ring-1 ring-amber-200/80'
          )}
        </HistoryCardStatusIconShell>
      );
    case 'confirmed':
      return (
        <HistoryCardStatusIconShell stripClass="bg-sky-100">
          {historyCardIconCircle(
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>,
            'bg-white text-sky-600 ring-1 ring-sky-200/80'
          )}
        </HistoryCardStatusIconShell>
      );
    case 'paid':
      return (
        <HistoryCardStatusIconShell stripClass="bg-green-100">
          {historyCardIconCircle(
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>,
            'bg-white text-green-600 ring-1 ring-green-200/80'
          )}
        </HistoryCardStatusIconShell>
      );
    case 'cancelled':
      return (
        <HistoryCardStatusIconShell stripClass="bg-red-100">
          {historyCardIconCircle(
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>,
            'bg-red-600 text-white ring-1 ring-red-700/20'
          )}
        </HistoryCardStatusIconShell>
      );
    default:
      return (
        <HistoryCardStatusIconShell stripClass="bg-slate-100">
          {historyCardIconCircle(
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l2.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>,
            'bg-white text-slate-600 ring-1 ring-slate-200/80'
          )}
        </HistoryCardStatusIconShell>
      );
  }
}

function SessionStatusIcon({ status }: { status: EndUserSession['status'] }) {
  switch (status) {
    case 'active':
      return (
        <HistoryCardStatusIconShell stripClass="bg-sky-100">
          {historyCardIconCircle(
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>,
            'bg-white text-sky-600 ring-1 ring-sky-200/80'
          )}
        </HistoryCardStatusIconShell>
      );
    case 'completed':
      return (
        <HistoryCardStatusIconShell stripClass="bg-green-100">
          {historyCardIconCircle(
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>,
            'bg-white text-green-600 ring-1 ring-green-200/80'
          )}
        </HistoryCardStatusIconShell>
      );
    case 'failed':
      return (
        <HistoryCardStatusIconShell stripClass="bg-red-100">
          {historyCardIconCircle(
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>,
            'bg-red-600 text-white ring-1 ring-red-700/20'
          )}
        </HistoryCardStatusIconShell>
      );
    default:
      return (
        <HistoryCardStatusIconShell stripClass="bg-slate-100">
          {historyCardIconCircle(
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l2.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>,
            'bg-white text-slate-600 ring-1 ring-slate-200/80'
          )}
        </HistoryCardStatusIconShell>
      );
  }
}

function PaymentStatusIcon({ status }: { status: EndUserPayment['status'] }) {
  switch (status) {
    case 'success':
      return (
        <HistoryCardStatusIconShell stripClass="bg-green-100">
          {historyCardIconCircle(
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>,
            'bg-white text-green-600 ring-1 ring-green-200/80'
          )}
        </HistoryCardStatusIconShell>
      );
    case 'pending':
      return (
        <HistoryCardStatusIconShell stripClass="bg-amber-100">
          {historyCardIconCircle(
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>,
            'bg-white text-amber-600 ring-1 ring-amber-200/80'
          )}
        </HistoryCardStatusIconShell>
      );
    case 'failed':
      return (
        <HistoryCardStatusIconShell stripClass="bg-red-100">
          {historyCardIconCircle(
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>,
            'bg-red-600 text-white ring-1 ring-red-700/20'
          )}
        </HistoryCardStatusIconShell>
      );
    default:
      return (
        <HistoryCardStatusIconShell stripClass="bg-slate-100">
          {historyCardIconCircle(
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l2.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>,
            'bg-white text-slate-600 ring-1 ring-slate-200/80'
          )}
        </HistoryCardStatusIconShell>
      );
  }
}

function paymentLabel(s: string) {
  switch (s) {
    case 'success':
      return 'Успіх';
    case 'pending':
      return 'Очікується';
    case 'failed':
      return 'Помилка';
    default:
      return s;
  }
}

function sessionLabel(s: string) {
  switch (s) {
    case 'active':
      return 'Активна';
    case 'completed':
      return 'Завершена';
    case 'failed':
      return 'Помилка';
    default:
      return s;
  }
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

function UserAvatarPlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function CarSilhouetteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.25 2.25 0 00-1.227-1.294l-3.228-1.614A2.25 2.25 0 0012.75 6H9.75a2.25 2.25 0 00-2.023 1.256l-3.228 1.614A2.25 2.25 0 003.375 10.5V18.75m17.25 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.25 2.25 0 00-1.227-1.294l-3.228-1.614A2.25 2.25 0 0012.75 6H9.75a2.25 2.25 0 00-2.023 1.256l-3.228 1.614A2.25 2.25 0 003.375 10.5V18.75"
      />
    </svg>
  );
}

function UserCarCard({ car }: { car: EndUserCar }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = useMemo(() => getCarBrandLogoUrl(car.model), [car.model]);
  const showLogo = Boolean(logoUrl) && !logoFailed;

  return (
    <div className="flex min-w-0 gap-4 rounded-xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-emerald-50/30 p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-inner">
        {showLogo ? (
          <img
            src={logoUrl!}
            alt=""
            className="h-full w-full object-contain p-1.5"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <CarSilhouetteIcon className="h-9 w-9 text-emerald-700/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={userProfileCardTitleClass}>{car.model}</p>
        <p className={`${userProfileCardSecondaryClass} font-mono font-medium tracking-wide text-slate-800`}>
          {car.plate}
        </p>
      </div>
    </div>
  );
}

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString('uk-UA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

export default function GlobalUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { replaceEndUser } = useGlobalAdmin();
  const [user, setUser] = useState<EndUser | null>(null);
  const [tab, setTab] = useState<UserTab>('cars');
  const [historyTimeRange, setHistoryTimeRange] = useState<HistoryTimeRange>('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const idNum = userId ? Number(userId) : NaN;
  const invalidId = !Number.isFinite(idNum) || idNum < 1;

  const sortedBookingsForList = useMemo(() => {
    if (!user) return [];
    return [...user.bookings]
      .filter((b) => isOnOrAfterCutoff(b.start, historyTimeRange))
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
  }, [user, historyTimeRange]);

  const sortedSessionsForList = useMemo(() => {
    if (!user) return [];
    return [...user.sessions]
      .filter((s) => isOnOrAfterCutoff(s.startedAt, historyTimeRange))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [user, historyTimeRange]);

  const sortedPaymentsForList = useMemo(() => {
    if (!user) return [];
    return [...user.payments]
      .filter((p) => isOnOrAfterCutoff(p.createdAt, historyTimeRange))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [user, historyTimeRange]);

  useEffect(() => {
    if (invalidId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void fetchAdminUserDetail(idNum)
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        replaceEndUser(u);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Не вдалося завантажити користувача';
        setLoadError(msg);
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idNum, invalidId, replaceEndUser]);

  if (invalidId) {
    return <Navigate to="/admin-dashboard/users" replace />;
  }

  if (loading) {
    return (
      <div className={userDetailPageShell}>
        <p className="text-sm text-gray-500">Завантаження профілю…</p>
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <div className={userDetailPageShell}>
        <Link
          to="/admin-dashboard/users"
          className={userDetailBackLinkClass}
          title="До списку користувачів"
          aria-label="До списку користувачів"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <AppCard className="border-red-100 bg-red-50/80 !p-5">
          <p className="font-medium text-red-900">Не вдалося відкрити профіль</p>
          <p className="mt-1 text-sm text-red-800/90">{loadError ?? 'Користувача не знайдено.'}</p>
        </AppCard>
      </div>
    );
  }

  return (
    <div className={userDetailPageShell}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <Link
              to="/admin-dashboard/users"
              className={userDetailBackLinkClass}
              title="До списку користувачів"
              aria-label="До списку користувачів"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-slate-100/90 shadow-inner">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserAvatarPlaceholderIcon className="h-9 w-9 text-slate-400" aria-hidden />
              )}
            </div>
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={globalAdminPageTitle}>{user.name}</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">{user.email}</p>
            <p className="text-sm text-gray-500">{user.phone}</p>
            <p className="mt-2 text-xs text-gray-400">Реєстрація: {fmt(user.registeredAt)}</p>
          </div>
        </div>
        <Link
          to={`/admin-dashboard/users/${user.id}/edit`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40 sm:mt-0.5"
          title="Редагувати дані"
          aria-label="Редагувати дані користувача"
        >
          <PencilIcon className="h-5 w-5" />
        </Link>
      </div>

      <nav
        className="-mx-1 flex gap-5 overflow-x-auto border-b border-gray-200 px-1"
        aria-label="Розділи користувача"
      >
        <button type="button" className={tabClass(tab === 'cars')} onClick={() => setTab('cars')}>
          Авто ({user.cars.length})
        </button>
        <button type="button" className={tabClass(tab === 'bookings')} onClick={() => setTab('bookings')}>
          Бронювання ({user.bookings.length})
        </button>
        <button type="button" className={tabClass(tab === 'sessions')} onClick={() => setTab('sessions')}>
          Сесії ({user.sessions.length})
        </button>
        <button type="button" className={tabClass(tab === 'payments')} onClick={() => setTab('payments')}>
          Платежі ({user.payments.length})
        </button>
      </nav>

      {tab === 'bookings' || tab === 'sessions' || tab === 'payments' ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Період</p>
          <div
            className="inline-flex max-w-full flex-wrap rounded-xl border border-slate-200 bg-slate-50/90 p-1 shadow-inner shadow-slate-900/5"
            role="group"
            aria-label="Період відображення історії"
          >
            {HISTORY_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setHistoryTimeRange(opt.id)}
                aria-pressed={historyTimeRange === opt.id}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 ${
                  historyTimeRange === opt.id
                    ? 'bg-white text-green-900 shadow-sm ring-1 ring-slate-200/90'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'cars' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {user.cars.map((c) => (
              <UserCarCard key={c.id} car={c} />
            ))}
          </div>
          {user.cars.length === 0 ? (
            <p className="text-sm text-slate-500">Немає збережених авто</p>
          ) : null}
        </div>
      ) : null}

      {tab === 'bookings' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortedBookingsForList.map((b) => (
              <Link
                key={b.id}
                to={`/admin-dashboard/bookings/${encodeURIComponent(b.id)}`}
                title={bookingLabel(b.status)}
                aria-label={`Бронювання: ${b.stationName}, ${bookingLabel(b.status)}`}
                className={userHistoryCardLinkClass}
              >
                <BookingStatusIcon status={b.status} />
                <div className="min-w-0 flex-1">
                  <p className={userProfileCardTitleClass}>{b.stationName}</p>
                  <p className={`${userProfileCardSecondaryClass} tabular-nums`}>{formatBookingCardDate(b.start)}</p>
                  <p className={`${userProfileCardStatusClass} ${bookingStatusTextClass(b.status)}`}>
                    {bookingLabel(b.status)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {user.bookings.length === 0 ? (
            <p className="text-center text-sm text-gray-500">Бронювань немає</p>
          ) : sortedBookingsForList.length === 0 ? (
            <p className="text-center text-sm text-gray-500">За обраний період бронювань немає</p>
          ) : null}
        </div>
      ) : null}

      {tab === 'sessions' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortedSessionsForList.map((s) => (
              <Link
                key={s.id}
                to={`/admin-dashboard/sessions/${encodeURIComponent(s.id)}`}
                state={{ fromUserId: user.id }}
                title={sessionLabel(s.status)}
                aria-label={`Сесія: ${s.stationName}, ${sessionLabel(s.status)}`}
                className={userHistoryCardLinkClass}
              >
                <SessionStatusIcon status={s.status} />
                <div className="min-w-0 flex-1">
                  <p className={userProfileCardTitleClass}>{s.stationName}</p>
                  <p className={`${userProfileCardSecondaryClass} tabular-nums`}>{formatBookingCardDate(s.startedAt)}</p>
                  <p className={`${userProfileCardStatusClass} ${sessionStatusTextClass(s.status)}`}>
                    {sessionLabel(s.status)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {user.sessions.length === 0 ? (
            <p className="text-center text-sm text-gray-500">Сесій немає</p>
          ) : sortedSessionsForList.length === 0 ? (
            <p className="text-center text-sm text-gray-500">За обраний період сесій немає</p>
          ) : null}
        </div>
      ) : null}

      {tab === 'payments' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortedPaymentsForList.map((p) => (
              <Link
                key={p.id}
                to={`/admin-dashboard/payments/${encodeURIComponent(p.sessionId)}`}
                state={{ fromUserId: user.id }}
                title={paymentLabel(p.status)}
                aria-label={`Платіж: ${p.description}, ${paymentLabel(p.status)}`}
                className={userHistoryCardLinkClass}
              >
                <PaymentStatusIcon status={p.status} />
                <div className="min-w-0 flex-1">
                  <p className={userProfileCardTitleClass}>{p.description}</p>
                  <p className={userProfileCardSecondaryClass}>
                    {fmt(p.createdAt)} · {p.method}
                  </p>
                  <p className={userProfileCardAmountClass}>
                    {p.amount.toLocaleString('uk-UA')} {p.currency}
                  </p>
                  <p className={`${userProfileCardStatusClass} ${paymentStatusTextClass(p.status)}`}>
                    {paymentLabel(p.status)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {user.payments.length === 0 ? (
            <p className="text-center text-sm text-gray-500">Платежів немає</p>
          ) : sortedPaymentsForList.length === 0 ? (
            <p className="text-center text-sm text-gray-500">За обраний період платежів немає</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
