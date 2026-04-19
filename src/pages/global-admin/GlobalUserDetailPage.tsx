import { Link, Navigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useGlobalAdmin } from '../../context/GlobalAdminContext';
import { fetchAdminUserDetail } from '../../api/adminUsers';
import type { EndUser, EndUserCar } from '../../types/globalAdmin';
import { getCarBrandLogoUrl } from '../../utils/carBrandLogo';
import { AppCard, OutlineButton, StatusPill } from '../../components/station-admin/Primitives';
import { globalAdminPageTitle } from '../../styles/globalAdminTheme';

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

function bookingTone(s: string): 'success' | 'warn' | 'muted' | 'danger' | 'info' {
  switch (s) {
    case 'confirmed':
    case 'paid':
      return 'success';
    case 'pending':
      return 'warn';
    case 'cancelled':
      return 'danger';
    default:
      return 'muted';
  }
}

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

function paymentTone(s: string): 'success' | 'warn' | 'danger' | 'muted' {
  switch (s) {
    case 'success':
      return 'success';
    case 'pending':
      return 'warn';
    case 'failed':
      return 'danger';
    default:
      return 'muted';
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

function sessionTone(s: string): 'success' | 'warn' | 'muted' | 'danger' | 'info' {
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
    <div className="flex gap-4 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-emerald-50/30 p-4 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-emerald-200/80 hover:shadow-md">
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
        <p className="text-lg font-semibold leading-snug text-slate-900">{car.model}</p>
        <p className="mt-1 font-mono text-sm font-medium tracking-wide text-slate-800">{car.plate}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          <span className="font-medium text-slate-600">Роз’єм:</span> {car.connector}
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
      <div className="space-y-6">
        <p className="text-sm text-gray-500">Завантаження профілю…</p>
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin-dashboard/users"
          className="text-sm font-medium text-green-600 hover:text-green-700"
        >
          ← До списку користувачів
        </Link>
        <AppCard className="border-red-100 bg-red-50/80 !p-5">
          <p className="font-medium text-red-900">Не вдалося відкрити профіль</p>
          <p className="mt-1 text-sm text-red-800/90">{loadError ?? 'Користувача не знайдено.'}</p>
        </AppCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin-dashboard/users"
          className="text-sm font-medium text-green-600 hover:text-green-700"
        >
          ← До списку користувачів
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-slate-100/90 shadow-inner">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserAvatarPlaceholderIcon className="h-9 w-9 text-slate-400" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={globalAdminPageTitle}>{user.name}</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">{user.email}</p>
              <p className="text-sm text-gray-500">{user.phone}</p>
              <p className="mt-2 text-xs text-gray-400">Реєстрація: {fmt(user.registeredAt)}</p>
            </div>
          </div>
          <Link to={`/admin-dashboard/users/${user.id}/edit`}>
            <OutlineButton type="button">Редагувати дані</OutlineButton>
          </Link>
        </div>
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
        <AppCard className="space-y-4 !p-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Збережені автомобілі</h2>
            <p className="mt-1 text-xs text-slate-500">
              Логотип за брендом (перше слово латиницею) або нейтральна іконка.
            </p>
          </div>
          <div className="space-y-3">
            {user.cars.map((c) => (
              <UserCarCard key={c.id} car={c} />
            ))}
          </div>
          {user.cars.length === 0 ? (
            <p className="text-sm text-slate-500">Немає збережених авто.</p>
          ) : null}
        </AppCard>
      ) : null}

      {tab === 'bookings' ? (
        <AppCard className="space-y-3">
          {sortedBookingsForList.map((b) => (
            <Link
              key={b.id}
              to={`/admin-dashboard/bookings/${encodeURIComponent(b.id)}`}
              className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition hover:border-green-200 hover:bg-green-50/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{b.stationName}</p>
                <p className="text-xs text-gray-500">{b.slotLabel}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {fmt(b.start)} — {fmt(b.end)}
                </p>
              </div>
              <StatusPill tone={bookingTone(b.status)}>{bookingLabel(b.status)}</StatusPill>
            </Link>
          ))}
          {user.bookings.length === 0 ? (
            <p className="text-sm text-gray-500">Бронювань немає.</p>
          ) : sortedBookingsForList.length === 0 ? (
            <p className="text-sm text-gray-500">За обраний період бронювань немає.</p>
          ) : null}
        </AppCard>
      ) : null}

      {tab === 'sessions' ? (
        <AppCard className="space-y-3">
          {sortedSessionsForList.map((s) => (
            <Link
              key={s.id}
              to={`/admin-dashboard/sessions/${encodeURIComponent(s.id)}`}
              state={{ fromUserId: user.id }}
              className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition hover:border-green-200 hover:bg-green-50/40 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{s.stationName}</p>
                <p className="text-xs text-gray-500">
                  {s.portLabel} · {fmt(s.startedAt)}
                  {s.endedAt ? ` — ${fmt(s.endedAt)}` : ''}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {s.kwh} кВт·год · {s.cost.toLocaleString('uk-UA')} грн
                </p>
                {s.bookingId ? (
                  <p className="mt-1 text-xs text-gray-500">Бронювання #{s.bookingId}</p>
                ) : null}
              </div>
              <StatusPill tone={sessionTone(s.status)}>{sessionLabel(s.status)}</StatusPill>
            </Link>
          ))}
          {user.sessions.length === 0 ? (
            <p className="text-sm text-gray-500">Сесій немає.</p>
          ) : sortedSessionsForList.length === 0 ? (
            <p className="text-sm text-gray-500">За обраний період сесій немає.</p>
          ) : null}
        </AppCard>
      ) : null}

      {tab === 'payments' ? (
        <AppCard className="space-y-3">
          {sortedPaymentsForList.map((p) => (
            <Link
              key={p.id}
              to={`/admin-dashboard/sessions/${encodeURIComponent(p.sessionId)}`}
              state={{ fromUserId: user.id }}
              className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition hover:border-green-200 hover:bg-green-50/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{p.description}</p>
                <p className="text-xs text-gray-500">
                  {fmt(p.createdAt)} · {p.method}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                <p className="text-sm font-bold tabular-nums text-slate-900">
                  {p.amount.toLocaleString('uk-UA')} {p.currency}
                </p>
                <StatusPill tone={paymentTone(p.status)}>{paymentLabel(p.status)}</StatusPill>
              </div>
            </Link>
          ))}
          {user.payments.length === 0 ? (
            <p className="text-sm text-gray-500">Платежів немає.</p>
          ) : sortedPaymentsForList.length === 0 ? (
            <p className="text-sm text-gray-500">За обраний період платежів немає.</p>
          ) : null}
        </AppCard>
      ) : null}
    </div>
  );
}
