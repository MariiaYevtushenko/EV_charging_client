import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import type { NetworkListPeriod } from '../../api/adminNetwork';
import AdminListPagination from '../../components/admin/AdminListPagination';
import NetworkListPeriodControl from '../../components/admin/NetworkListPeriodControl';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useUserPortal } from '../../context/UserPortalContext';
import type { UserBooking } from '../../types/userPortal';
import { UserPortalEmptyState } from '../../components/user-portal/UserPortalEmptyState';
import {
  userPortalListPageShell,
  userPortalPageHeaderRow,
  userPortalPageTitle,
  userPortalPrimaryCta,
} from '../../styles/userPortalTheme';
import {
  stationAdminUnderlineTabActive,
  stationAdminUnderlineTabIdle,
} from '../../styles/stationAdminTheme';
import { isOnOrAfterNetworkPeriodCutoff } from '../../utils/networkListPeriod';

const BOOKINGS_PAGE_SIZE = 10;

const bookingsTabClass = (active: boolean) =>
  active ? stationAdminUnderlineTabActive : stationAdminUnderlineTabIdle;

const bookingsTabBadgeClass = (active: boolean) =>
  active
    ? 'shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-green-800'
    : 'shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600';

function CalendarDaysIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function bookingVisual(b: UserBooking): {
  statusLabel: string;
  statusPillClass: string;
  iconWrapClass: string;
  icon: ReactElement;
  barClass: string;
} {
  if (b.status === 'upcoming') {
    return {
      statusLabel: 'Очікує',
      statusPillClass: 'bg-amber-100 text-amber-900 ring-amber-400/30',
      iconWrapClass: 'bg-amber-50 text-amber-600 ring-amber-200/80',
      icon: <ClockIcon className="h-5 w-5" />,
      barClass: 'bg-amber-400',
    };
  }
  if (b.status === 'active') {
    return {
      statusLabel: 'Активне',
      statusPillClass: 'bg-emerald-100 text-emerald-900 ring-emerald-500/25',
      iconWrapClass: 'bg-emerald-50 text-emerald-600 ring-emerald-200/80',
      icon: <BoltIcon className="h-5 w-5" />,
      barClass: 'bg-emerald-500',
    };
  }
  if (b.status === 'completed') {
    return {
      statusLabel: 'Завершено',
      statusPillClass: 'bg-slate-100 text-slate-800 ring-slate-400/25',
      iconWrapClass: 'bg-slate-50 text-slate-600 ring-slate-200/80',
      icon: <CheckCircleIcon className="h-5 w-5" />,
      barClass: 'bg-slate-400',
    };
  }
  if (b.status === 'missed') {
    return {
      statusLabel: 'Пропущено',
      statusPillClass: 'bg-sky-100 text-sky-900 ring-sky-400/30',
      iconWrapClass: 'bg-sky-50 text-sky-600 ring-sky-200/80',
      icon: <ClockIcon className="h-5 w-5" />,
      barClass: 'bg-sky-400',
    };
  }
  return {
    statusLabel: 'Скасовано',
    statusPillClass: 'bg-rose-100 text-rose-900 ring-rose-400/30',
    iconWrapClass: 'bg-rose-50 text-rose-600 ring-rose-200/80',
    icon: <XCircleIcon className="h-5 w-5" />,
    barClass: 'bg-rose-500',
  };
}

function formatBookingWhen(startIso: string, endIso: string): { dateLabel: string; timeLabel: string } {
  try {
    const a = new Date(startIso);
    const b = new Date(endIso);
    const dateLabel = a.toLocaleDateString('uk-UA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    const timeLabel = `${a.toLocaleTimeString('uk-UA', timeOpts)} — ${b.toLocaleTimeString('uk-UA', timeOpts)}`;
    return { dateLabel, timeLabel };
  } catch {
    return { dateLabel: startIso, timeLabel: '' };
  }
}

export default function UserBookingsPage() {
  const { bookings, cancelBooking } = useUserPortal();

  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [period, setPeriod] = useState<NetworkListPeriod>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [tab, period]);
  const [cancelTarget, setCancelTarget] = useState<UserBooking | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const upcoming = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'upcoming' || b.status === 'active')
        .sort((a, b) => a.start.localeCompare(b.start)),
    [bookings]
  );
  const past = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'completed' || b.status === 'cancelled' || b.status === 'missed')
        .sort((a, b) => b.start.localeCompare(a.start)),
    [bookings]
  );

  const pool = useMemo(() => {
    if (tab === 'upcoming') return upcoming;
    return past.filter((b) => isOnOrAfterNetworkPeriodCutoff(b.start, period));
  }, [tab, upcoming, past, period]);

  const totalPages = pool.length === 0 ? 1 : Math.max(1, Math.ceil(pool.length / BOOKINGS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * BOOKINGS_PAGE_SIZE;
    return pool.slice(start, start + BOOKINGS_PAGE_SIZE);
  }, [pool, safePage]);

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    setCancellingId(cancelTarget.id);
    try {
      await cancelBooking(cancelTarget.id);
    } finally {
      setCancellingId(null);
      setCancelTarget(null);
    }
  }

  return (
    <div className={`space-y-5 sm:space-y-6 ${userPortalListPageShell} pb-8`}>
      <div className={userPortalPageHeaderRow}>
        <h1 className={`${userPortalPageTitle} shrink-0`}>Бронювання</h1>
        <div className="min-w-0 sm:flex sm:shrink-0 sm:justify-end">
          <Link to="/dashboard/bookings/new" className={userPortalPrimaryCta}>
           + Нове бронювання
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <nav
          className="-mx-1 flex min-w-0 max-w-2xl flex-1 items-center gap-8 overflow-x-auto border-b border-gray-200 px-1"
          role="tablist"
          aria-label="Фільтр бронювань"
        >
          <button
            type="button"
            role="tab"
            id="bookings-tab-upcoming"
            aria-selected={tab === 'upcoming'}
            aria-controls="bookings-list-panel"
            onClick={() => setTab('upcoming')}
            className={`${bookingsTabClass(tab === 'upcoming')} inline-flex min-w-0 items-center gap-1.5`}
          >
            <span className="truncate">Заплановані</span>
            <span className={bookingsTabBadgeClass(tab === 'upcoming')}>{upcoming.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="bookings-tab-past"
            aria-selected={tab === 'past'}
            aria-controls="bookings-list-panel"
            onClick={() => setTab('past')}
            className={`${bookingsTabClass(tab === 'past')} inline-flex min-w-0 items-center gap-1.5`}
          >
            <span className="truncate">У минулому</span>
            <span className={bookingsTabBadgeClass(tab === 'past')}>{past.length}</span>
          </button>
        </nav>

        <div className="shrink-0 lg:pb-3">
          <NetworkListPeriodControl
            value={period}
            disabled={tab === 'upcoming'}
            onChange={(p) => {
              setPeriod(p);
              setPage(1);
            }}
          />
        </div>
      </div>

      {pool.length === 0 ? (
        <div
          id="bookings-list-panel"
          role="tabpanel"
          aria-labelledby={tab === 'upcoming' ? 'bookings-tab-upcoming' : 'bookings-tab-past'}
        >
          <UserPortalEmptyState
            icon={<CalendarDaysIcon className="h-8 w-8" />}
            title={tab === 'upcoming' ? 'Немає запланованих бронювань' : 'Минулі бронювання відсутні'}
            description={
              tab === 'upcoming'
                ? 'Створіть броню з вибором станції та часового слота — тут з’являться майбутні візити.'
                : 'Завершені, пропущені та скасовані записи за обраний період (7 / 30 днів або весь час) з’являться тут.'
            }
            footer={
              tab === 'upcoming' ? (
                <Link to="/dashboard/bookings/new" className={userPortalPrimaryCta}>
                  Оформити бронювання
                </Link>
              ) : null
            }
          />
        </div>
      ) : (
        <ul
          id="bookings-list-panel"
          role="tabpanel"
          aria-labelledby={tab === 'upcoming' ? 'bookings-tab-upcoming' : 'bookings-tab-past'}
          className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4"
        >
          {pageSlice.map((b) => {
            const vis = bookingVisual(b);
            const { dateLabel, timeLabel } = formatBookingWhen(b.start, b.end);
            const isUpcomingTab = tab === 'upcoming';
            const canCancel = isUpcomingTab && (b.status === 'upcoming' || b.status === 'active');

            return (
              <li key={b.id} className="min-w-0">
                <div className="group relative flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-950/[0.04] transition hover:border-slate-300/90 hover:shadow-md">
                  <div className={`absolute left-0 top-0 h-full w-1 ${vis.barClass}`} aria-hidden />
                  <div className="flex flex-1 flex-col gap-4 pl-4 pr-3 py-4 sm:pl-5 sm:pr-4">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-2 ring-offset-2 ring-offset-white ${vis.iconWrapClass}`}
                      >
                        {vis.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/dashboard/bookings/${b.id}`}
                          className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h2 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 group-hover:text-slate-800">
                                {b.stationName}
                              </h2>
                              <p className="mt-0.5 text-sm text-slate-500">{b.slotLabel}</p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${vis.statusPillClass}`}
                            >
                              {vis.statusLabel}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium capitalize text-slate-800">{dateLabel}</p>
                          {timeLabel ? (
                            <p className="mt-0.5 text-sm tabular-nums text-slate-600">{timeLabel}</p>
                          ) : null}
                        </Link>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <Link
                        to={`/dashboard/bookings/${b.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-900"
                      >
                        Деталі
                        <ChevronRightIcon className="h-4 w-4" />
                      </Link>
                      {canCancel ? (
                        <button
                          type="button"
                          disabled={cancellingId === b.id}
                          className="text-sm font-semibold text-rose-700 transition hover:text-rose-900 disabled:opacity-50"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCancelTarget(b);
                          }}
                        >
                          {cancellingId === b.id ? 'Скасування…' : 'Скасувати'}
                        </button>
                      ) : (
                        <span className="hidden sm:block sm:h-5" aria-hidden />
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pool.length > 0 ? (
        <AdminListPagination
          page={safePage}
          pageSize={BOOKINGS_PAGE_SIZE}
          total={pool.length}
          onPageChange={setPage}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Скасувати бронювання?"
        description={cancelTarget ? `${cancelTarget.stationName} · ${cancelTarget.slotLabel}` : undefined}
        confirmLabel="Скасувати бронювання"
        cancelLabel="Назад"
        variant="danger"
        busy={Boolean(cancelTarget && cancellingId === cancelTarget.id)}
        onConfirm={handleConfirmCancel}
        onClose={() => {
          if (!cancellingId) setCancelTarget(null);
        }}
      />
    </div>
  );
}
