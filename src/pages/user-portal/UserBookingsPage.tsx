import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import type { NetworkListPeriod } from '../../api/adminNetwork';
import NetworkListPeriodControl from '../../components/admin/NetworkListPeriodControl';
import AdminListPagination from '../../components/admin/AdminListPagination';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useUserPortal } from '../../context/UserPortalContext';
import type { UserBooking } from '../../types/userPortal';
import { UserPortalEmptyState } from '../../components/user-portal/UserPortalEmptyState';
import { UserPortalRowCard, type UserPortalRowAccent } from '../../components/user-portal/UserPortalRowCard';
import {
  userPortalListPageShell,
  userPortalPageHeaderRow,
  userPortalPageTitle,
  userPortalPrimaryCta,
  userPortalTabActive,
  userPortalTabBadgeIdle,
  userPortalTabBadgeOnAccent,
  userPortalTabBar,
  userPortalTabIdle,
} from '../../styles/userPortalTheme';
import { isOnOrAfterNetworkPeriodCutoff } from '../../utils/networkListPeriod';

const BOOKINGS_PAGE_SIZE = 10;

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

function EllipsisVerticalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}

function BookingCardOverflowMenu({
  open,
  onOpenChange,
  onCancel,
  cancelling,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el || !(e.target instanceof Node)) return;
      if (!el.contains(e.target)) onOpenChange(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onOpenChange]);

  return (
    <div className="absolute right-2 top-2 z-20" ref={wrapRef}>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Дії"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(!open);
        }}
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.25rem)] min-w-[11rem] rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg ring-1 ring-slate-900/[0.06]"
        >
          <button
            role="menuitem"
            type="button"
            disabled={cancelling}
            className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
              onOpenChange(false);
            }}
          >
            {cancelling ? 'Скасування…' : 'Скасувати'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function fmtRange(startIso: string, endIso: string) {
  try {
    const a = new Date(startIso);
    const b = new Date(endIso);
    const sameDay = a.toDateString() === b.toDateString();
    const dateOpts: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    };
    const timeOpts: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };
    if (sameDay) {
      return {
        dateLine: a.toLocaleDateString('uk-UA', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }),
        timeLine: `${a.toLocaleTimeString('uk-UA', timeOpts)} — ${b.toLocaleTimeString('uk-UA', timeOpts)}`,
      };
    }
    return {
      dateLine: `${a.toLocaleDateString('uk-UA', dateOpts)} — ${b.toLocaleDateString('uk-UA', dateOpts)}`,
      timeLine: `${a.toLocaleTimeString('uk-UA', timeOpts)} — ${b.toLocaleTimeString('uk-UA', timeOpts)}`,
    };
  } catch {
    return { dateLine: `${startIso} — ${endIso}`, timeLine: '' };
  }
}

function shortBookingDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function bookingRowVisual(b: UserBooking): {
  accent: UserPortalRowAccent;
  statusTextClassName: string;
  statusLabel: string;
  icon: ReactElement;
} {
  if (b.status === 'upcoming') {
    return {
      accent: 'amber',
      statusTextClassName: 'text-amber-600',
      statusLabel: 'Очікує',
      icon: <ClockIcon className="h-5 w-5" />,
    };
  }
  if (b.status === 'active') {
    return {
      accent: 'green',
      statusTextClassName: 'text-green-700',
      statusLabel: 'Активне',
      icon: <BoltIcon className="h-5 w-5" />,
    };
  }
  if (b.status === 'completed') {
    return {
      accent: 'slate',
      statusTextClassName: 'text-slate-700',
      statusLabel: 'Завершено',
      icon: <CheckCircleIcon className="h-5 w-5" />,
    };
  }
  if (b.status === 'missed') {
    return {
      accent: 'amber',
      statusTextClassName: 'text-amber-800',
      statusLabel: 'Пропущено',
      icon: <ClockIcon className="h-5 w-5" />,
    };
  }
  return {
    accent: 'rose',
    statusTextClassName: 'text-rose-600',
    statusLabel: 'Скасовано',
    icon: <XCircleIcon className="h-5 w-5" />,
  };
}

export default function UserBookingsPage() {
  const { bookings, cancelBooking } = useUserPortal();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [period, setPeriod] = useState<NetworkListPeriod>('all');
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<UserBooking | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [menuOpenBookingId, setMenuOpenBookingId] = useState<string | null>(null);

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
        .filter(
          (b) =>
            b.status === 'completed' || b.status === 'cancelled' || b.status === 'missed',
        )
        .sort((a, b) => b.start.localeCompare(a.start)),
    [bookings]
  );

  const baseList = tab === 'upcoming' ? upcoming : past;
  const list = useMemo(() => {
    if (tab === 'upcoming') return baseList;
    return baseList.filter((b) => isOnOrAfterNetworkPeriodCutoff(b.start, period));
  }, [baseList, period, tab]);

  const totalPages = list.length === 0 ? 1 : Math.max(1, Math.ceil(list.length / BOOKINGS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * BOOKINGS_PAGE_SIZE;
    return list.slice(start, start + BOOKINGS_PAGE_SIZE);
  }, [list, safePage]);

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
    <div className={`space-y-5 ${userPortalListPageShell}`}>
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-950/[0.04] sm:p-5">
          <div className={userPortalPageHeaderRow}>
            <h1 className={`${userPortalPageTitle} shrink-0`}>Мої бронювання</h1>
            <div className="flex min-h-0 w-full min-w-0 shrink-0 items-center sm:min-h-[2.75rem] sm:justify-end">
              <div
                className={
                  tab === 'past'
                    ? 'w-full sm:w-auto'
                    : 'hidden w-full sm:block sm:w-auto sm:invisible sm:pointer-events-none'
                }
                aria-hidden={tab !== 'past'}
              >
                <NetworkListPeriodControl
                  value={period}
                  onChange={(p) => {
                    setPeriod(p);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className={`${userPortalTabBar} w-full max-w-full sm:w-fit`}>
              <button
                type="button"
                onClick={() => {
                  setTab('upcoming');
                  setPage(1);
                }}
                className={tab === 'upcoming' ? userPortalTabActive : userPortalTabIdle}
              >
                Заплановані
                <span className={tab === 'upcoming' ? userPortalTabBadgeOnAccent : userPortalTabBadgeIdle}>
                  {upcoming.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('past');
                  setPage(1);
                }}
                className={tab === 'past' ? userPortalTabActive : userPortalTabIdle}
              >
                Минулі
                <span className={tab === 'past' ? userPortalTabBadgeOnAccent : userPortalTabBadgeIdle}>
                  {past.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <UserPortalEmptyState
          icon={<CalendarDaysIcon className="h-8 w-8" />}
          title={tab === 'upcoming' ? 'Немає запланованих бронювань' : 'Минулі бронювання відсутні'}
          description={
            tab === 'upcoming'
              ? 'Оформіть нове бронювання на карті та з вибором слоту — тут з’являться майбутні візити'
              : 'Завершені та скасовані бронювання за обраний період з’являться тут. Спробуйте «Весь час», якщо список порожній'
          }
          footer={
            tab === 'upcoming' ? (
              <Link to="/dashboard/bookings/new" className={userPortalPrimaryCta}>
                Оформити бронювання
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="mx-auto grid max-w-5xl grid-cols-1 gap-3 lg:grid-cols-2">
          {pageSlice.map((b) => {
            const { timeLine } = fmtRange(b.start, b.end);
            const isUpcomingTab = tab === 'upcoming';
            const canCancel =
              isUpcomingTab && (b.status === 'upcoming' || b.status === 'active');
            const vis = bookingRowVisual(b);
            const dateTimeLine = timeLine
              ? `${shortBookingDate(b.start)} · ${timeLine}`
              : shortBookingDate(b.start);

            return (
              <li key={b.id} className="min-w-0">
                <div className="relative w-full min-w-0">
                  <UserPortalRowCard
                    to={`/dashboard/bookings/${b.id}`}
                    accent={vis.accent}
                    icon={vis.icon}
                    title={b.stationName}
                    subtitle={b.slotLabel}
                    dateLine={dateTimeLine}
                    statusLabel={vis.statusLabel}
                    statusTextClassName={vis.statusTextClassName}
                    statusPlacement="inline"
                    className={canCancel ? 'min-h-[4.75rem] pr-12 sm:pr-14' : ''}
                    onClick={() => setMenuOpenBookingId(null)}
                  />
                  {canCancel ? (
                    <BookingCardOverflowMenu
                      open={menuOpenBookingId === b.id}
                      onOpenChange={(next) => setMenuOpenBookingId(next ? b.id : null)}
                      onCancel={() => setCancelTarget(b)}
                      cancelling={cancellingId === b.id}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {list.length > 0 ? (
        <div className="mx-auto max-w-5xl">
          <AdminListPagination
            page={safePage}
            pageSize={BOOKINGS_PAGE_SIZE}
            total={list.length}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Скасувати бронювання?"
        description={
          cancelTarget
            ? `${cancelTarget.stationName} · ${cancelTarget.slotLabel}`
            : undefined
        }
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
