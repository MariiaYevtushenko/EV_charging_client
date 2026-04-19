import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppCard, OutlineButton } from '../../components/station-admin/Primitives';
import { appSecondaryCtaClass } from '../../components/station-admin/formStyles';
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
  userPortalSearchInput,
  userPortalTabActive,
  userPortalTabBadgeIdle,
  userPortalTabBadgeOnAccent,
  userPortalTabBar,
  userPortalTabIdle,
} from '../../styles/userPortalTheme';

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

function MagnifyingGlassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
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

function bookingSearchText(b: UserBooking): string {
  const { dateLine, timeLine } = fmtRange(b.start, b.end);
  return [b.stationName, b.slotLabel, dateLine, timeLine, b.status].join(' ').toLowerCase();
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
  const [query, setQuery] = useState('');
  const [cancelTarget, setCancelTarget] = useState<UserBooking | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const upcoming = useMemo(
    () => bookings.filter((b) => b.status === 'upcoming' || b.status === 'active'),
    [bookings]
  );
  const past = useMemo(
    () => bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled'),
    [bookings]
  );

  const baseList = tab === 'upcoming' ? upcoming : past;
  const q = query.trim().toLowerCase();
  const list = useMemo(() => {
    if (!q) return baseList;
    return baseList.filter((b) => bookingSearchText(b).includes(q));
  }, [baseList, q]);

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
    <div className="space-y-6">
      <div>
        <h1 className={userPortalPageTitle}>Мої бронювання</h1>
        <p className={userPortalPageSubtitle}>
          Переглядайте майбутні візити та історію. Скасувати можна лише заплановані бронювання.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className={userPortalTabBar}>
          <button
            type="button"
            onClick={() => setTab('upcoming')}
            className={tab === 'upcoming' ? userPortalTabActive : userPortalTabIdle}
          >
            Майбутні
            <span className={tab === 'upcoming' ? userPortalTabBadgeOnAccent : userPortalTabBadgeIdle}>
              {upcoming.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('past')}
            className={tab === 'past' ? userPortalTabActive : userPortalTabIdle}
          >
            Історія
            <span className={tab === 'past' ? userPortalTabBadgeOnAccent : userPortalTabBadgeIdle}>
              {past.length}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук за станцією, слотом, датою…"
            className={userPortalSearchInput}
            autoComplete="off"
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
                {q
                  ? 'Нічого не знайдено'
                  : tab === 'upcoming'
                    ? 'Немає запланованих бронювань'
                    : 'Історія порожня'}
              </p>
              <p className="mt-1 max-w-md text-sm text-slate-600">
                {q
                  ? 'Спробуйте інший запит або очистьте поле пошуку.'
                  : tab === 'upcoming'
                    ? 'Оформіть нове бронювання на карті та з вибором слоту — тут з’являться майбутні візити.'
                    : 'Після завершених або скасованих сесій записи з’являться тут.'}
              </p>
            </div>
            {q ? (
              <button type="button" className={appSecondaryCtaClass} onClick={() => setQuery('')}>
                Очистити пошук
              </button>
            ) : tab === 'upcoming' ? (
              <Link to="/dashboard/bookings/new" className={userPortalPrimaryCta}>
                Оформити бронювання
              </Link>
            ) : null}
          </div>
        </AppCard>
      ) : (
        <div className="space-y-2">
          {list.map((b) => {
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
              <AppCard key={b.id} className="overflow-hidden p-0">
                <div className="flex flex-col sm:flex-row sm:items-stretch">
                  <Link
                    to={`/dashboard/bookings/${b.id}`}
                    className="group flex min-w-0 flex-1 gap-3 p-3 transition hover:bg-slate-50/90 sm:gap-3.5 sm:p-4"
                  >
                    <div className={userPortalIconTileSm}>
                      <CalendarDaysIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                        <div className="min-w-0">
                          <p className={`${userPortalCardTitleHover} text-base sm:text-[1.05rem]`}>
                            {b.stationName}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-600 sm:text-sm">
                            <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-slate-400 sm:h-4 sm:w-4" />
                            <span className="truncate">{b.slotLabel}</span>
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 sm:px-2.5 sm:py-1 sm:text-xs ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs text-slate-700 sm:text-sm">
                        <span className="font-medium text-slate-800">{dateLine}</span>
                        {timeLine ? (
                          <>
                            <span className="text-slate-300" aria-hidden>
                              ·
                            </span>
                            <span className="tabular-nums text-slate-600">{timeLine}</span>
                          </>
                        ) : null}
                        {typeof b.payNowAmount === 'number' ? (
                          <>
                            <span className="text-slate-300" aria-hidden>
                              ·
                            </span>
                            <span className="font-semibold text-green-800">
                              До сплати зараз: {b.payNowAmount} грн
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </Link>

                  {canCancel ? (
                    <div className="flex shrink-0 flex-col justify-center border-t border-slate-100 bg-slate-50/60 px-3 py-2.5 sm:border-l sm:border-t-0 sm:bg-white sm:px-4 sm:py-3">
                      <OutlineButton
                        type="button"
                        className="whitespace-nowrap"
                        disabled={cancellingId === b.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCancelTarget(b);
                        }}
                      >
                        {cancellingId === b.id ? 'Скасування…' : 'Скасувати'}
                      </OutlineButton>
                    </div>
                  ) : null}
                </div>
              </AppCard>
            );
          })}
        </div>
      )}

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
