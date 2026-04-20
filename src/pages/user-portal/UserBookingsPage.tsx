import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { NetworkListPeriod } from '../../api/adminNetwork';
import NetworkListPeriodControl from '../../components/admin/NetworkListPeriodControl';
import AdminListPagination from '../../components/admin/AdminListPagination';
import { AppCard } from '../../components/station-admin/Primitives';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useUserPortal } from '../../context/UserPortalContext';
import type { UserBooking } from '../../types/userPortal';
import {
  userPortalBookingStatus,
  userPortalCardTitleHover,
  userPortalIconTileLg,
  userPortalIconTileSm,
  userPortalPageSubtitle,
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

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"
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
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
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

function statusKeyForBooking(b: UserBooking): keyof typeof userPortalBookingStatus {
  if (b.status === 'upcoming') return 'upcoming';
  if (b.status === 'active') return 'active';
  if (b.status === 'completed') return 'completed';
  return 'cancelled';
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
    () => bookings.filter((b) => b.status === 'upcoming' || b.status === 'active'),
    [bookings]
  );
  const past = useMemo(
    () => bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled'),
    [bookings]
  );

  const baseList = tab === 'upcoming' ? upcoming : past;
  const list = useMemo(
    () => baseList.filter((b) => isOnOrAfterNetworkPeriodCutoff(b.start, period)),
    [baseList, period]
  );

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
    <div className="space-y-5">
      <div>
        <h1 className={userPortalPageTitle}>Мої бронювання</h1>
        
      </div>

     
        <div className="flex flex-col gap-5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-5 sm:py-4">
          <div className={`${userPortalTabBar} w-fit max-w-full shrink-0`}>
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
              Історія
              <span className={tab === 'past' ? userPortalTabBadgeOnAccent : userPortalTabBadgeIdle}>
                {past.length}
              </span>
            </button>
          </div>
          <div className="min-w-0 sm:flex sm:flex-1 sm:justify-end">
            <NetworkListPeriodControl
              value={period}
              onChange={(p) => {
                setPeriod(p);
                setPage(1);
              }}
            />
          </div>
        </div>
      

      {list.length === 0 ? (
        <AppCard>
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className={userPortalIconTileLg}>
              <CalendarDaysIcon className="h-8 w-8" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">
                {tab === 'upcoming' ? 'Немає запланованих бронювань' : 'Історія порожня'}
              </p>
              <p className="mt-1 max-w-md text-sm text-slate-600">
                {tab === 'upcoming'
                  ? 'Оформіть нове бронювання на карті та з вибором слоту — тут з’являться майбутні візити.'
                  : 'Після завершених або скасованих сесій записи з’являться тут.'}
              </p>
            </div>
            {tab === 'upcoming' ? (
              <Link to="/dashboard/bookings/new" className={userPortalPrimaryCta}>
                Оформити бронювання
              </Link>
            ) : null}
          </div>
        </AppCard>
      ) : (
        <ul className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5">
          {pageSlice.map((b) => {
            const { dateLine, timeLine } = fmtRange(b.start, b.end);
            const isUpcomingTab = tab === 'upcoming';
            const canCancel =
              isUpcomingTab && (b.status === 'upcoming' || b.status === 'active');

            const statusLabel =
              b.status === 'upcoming'
                ? 'Заплановано'
                : b.status === 'active'
                  ? 'Активне'
                  : b.status === 'completed'
                    ? 'Завершено'
                    : 'Скасовано';

            const sk = statusKeyForBooking(b);
            const statusClass = userPortalBookingStatus[sk];

            return (
              <li key={b.id} className="relative flex h-full min-h-0">
                <div className="relative flex h-full w-full min-h-[148px] flex-col overflow-visible rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-emerald-200/90 hover:shadow-md hover:ring-emerald-950/[0.06]">
                  <Link
                    to={`/dashboard/bookings/${b.id}`}
                    className={`group flex min-h-0 flex-1 flex-col p-4 transition hover:bg-slate-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:p-5 ${
                      canCancel ? 'pr-12 sm:pr-14' : ''
                    }`}
                    onClick={() => setMenuOpenBookingId(null)}
                  >
                    <div className="flex min-h-0 gap-3">
                      <div className={userPortalIconTileSm}>
                        <CalendarDaysIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p
                          className={`${userPortalCardTitleHover} truncate text-base leading-snug sm:text-[1.05rem]`}
                          title={b.stationName}
                        >
                          {b.stationName}
                        </p>
                        <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-slate-600 sm:text-sm">
                          <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-slate-400 sm:h-4 sm:w-4" />
                          <span className="truncate" title={b.slotLabel}>
                            {b.slotLabel}
                          </span>
                        </p>
                      </div>
                    </div>

                    {timeLine ? (
                      <p
                        className="mt-3 truncate text-xs text-slate-600 sm:text-sm"
                        title={timeLine}
                      >
                        {timeLine}
                      </p>
                    ) : null}

                    <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-emerald-100/90 pt-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/55">Дата</p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-900" title={dateLine}>
                          {dateLine}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 sm:min-w-[7.5rem]">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/55">Статус</p>
                        <span
                          className={`inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass}`}
                          title={statusLabel}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  </Link>

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
        <AdminListPagination
          page={safePage}
          pageSize={BOOKINGS_PAGE_SIZE}
          total={list.length}
          onPageChange={setPage}
        />
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
