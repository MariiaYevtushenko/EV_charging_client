import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useStations } from '../../context/StationsContext';
import {
  AdminAccentCard,
  AdminAccentRow,
  AdminAccentSummaryShell,
} from '../../components/admin/AdminAccentCard';
import { fetchAdminDashboard } from '../../api/adminDashboard';
import { fetchAdminNetworkBookings, fetchAdminNetworkSessions } from '../../api/adminNetwork';
import {
  globalAdminLinkAccent,
  globalAdminMapPromo,
  globalAdminPageTitle,
  globalAdminSectionLabel,
} from '../../styles/globalAdminTheme';

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function IconMap({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

const kpiLinkClass = `group flex items-center gap-1 ${globalAdminLinkAccent}`;

export default function GlobalAdminHome() {
  const { stationsTotal, stationStatusCounts, loading: stationsLoading } = useStations();

  const [dashLoading, setDashLoading] = useState(true);
  const [todayRev, setTodayRev] = useState<number | null>(null);
  const [todaySess, setTodaySess] = useState<number | null>(null);

  const [networkLoading, setNetworkLoading] = useState(true);
  const [bookingsCount, setBookingsCount] = useState<number | null>(null);
  const [sessionsCount, setSessionsCount] = useState<number | null>(null);

  const [activeSessionsCount, setActiveSessionsCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setDashLoading(true);
    void fetchAdminDashboard()
      .then((d) => {
        if (!cancelled) {
          setTodayRev(d.todayRevenueUah);
          setTodaySess(d.todaySessions);
          setActiveSessionsCount(d.activeSessions ?? 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTodayRev(null);
          setTodaySess(null);
          setActiveSessionsCount(0);
        }
      })
      .finally(() => {
        if (!cancelled) setDashLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setNetworkLoading(true);
    void Promise.all([
      fetchAdminNetworkBookings({ page: 1, pageSize: 1 }),
      fetchAdminNetworkSessions({ page: 1, pageSize: 1 }),
    ])
      .then(([bookings, sessions]) => {
        if (cancelled) return;
        setBookingsCount(bookings.total);
        setSessionsCount(sessions.total);
      })
      .catch(() => {
        if (!cancelled) {
          setBookingsCount(null);
          setSessionsCount(null);
        }
      })
      .finally(() => {
        if (!cancelled) setNetworkLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const working = stationStatusCounts?.working ?? 0;
  const offline = stationStatusCounts?.offline ?? 0;
  const maintenance = stationStatusCounts?.maintenance ?? 0;

  const showTodayRow = dashLoading || (todayRev != null && todaySess != null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={globalAdminPageTitle}>Головна</h1>
      </div>

      <div>
       
        <AdminAccentSummaryShell>
          {showTodayRow ? (
            <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 bg-green-50/40">
              <div className="px-4 py-3.5 sm:px-5">
                <p className="text-xs font-medium text-slate-500">Дохід сьогодні</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-green-700">
                  {dashLoading ? '…' : `${todayRev!.toLocaleString('uk-UA')} грн`}
                </p>
              </div>
              <div className="px-4 py-3.5 sm:px-5">
                <p className="text-xs font-medium text-slate-500">Сесії сьогодні</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                  {dashLoading ? '…' : todaySess!.toLocaleString('uk-UA')}
                </p>
              </div>
            </div>
          ) : null}
          <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="px-4 py-3.5 sm:px-5">
              <p className="text-xs font-medium text-slate-500">Працює</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-green-700">
                {stationsLoading ? '…' : working.toLocaleString('uk-UA')}
              </p>
            </div>
            <div className="px-4 py-3.5 sm:px-5">
              <p className="text-xs font-medium text-slate-500">Оффлайн</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-700">
                {stationsLoading ? '…' : offline.toLocaleString('uk-UA')}
              </p>
            </div>
            <div className="px-4 py-3.5 sm:px-5">
              <p className="text-xs font-medium text-slate-500">Обслуговування</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-amber-800">
                {stationsLoading ? '…' : maintenance.toLocaleString('uk-UA')}
              </p>
            </div>
          </div>
        </AdminAccentSummaryShell>
      </div>

      <div>
       
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminAccentCard hover className="group">
            <AdminAccentRow icon={<IconCalendar className="h-6 w-6" />}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Бронювання</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                {networkLoading ? '…' : bookingsCount != null ? bookingsCount.toLocaleString('uk-UA') : '—'}
              </p>
              <Link to="/admin-dashboard/bookings" className={`${kpiLinkClass} mt-3`}>
                Список
                <IconChevron className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </AdminAccentRow>
          </AdminAccentCard>

          <AdminAccentCard hover className="group">
            <AdminAccentRow icon={<IconBolt className="h-6 w-6" />}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Сесії</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                {networkLoading ? '…' : sessionsCount != null ? sessionsCount.toLocaleString('uk-UA') : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Активних:{' '}
                {networkLoading ? '…' : activeSessionsCount.toLocaleString('uk-UA')}
              </p>
              <Link to="/admin-dashboard/sessions" className={`${kpiLinkClass} mt-2`}>
                Список
                <IconChevron className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </AdminAccentRow>
          </AdminAccentCard>

          <AdminAccentCard hover className="group">
            <AdminAccentRow icon={<IconChart className="h-6 w-6" />}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Аналітика</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">Графіки та зведення з БД</p>
              <Link to="/admin-dashboard/analytics" className={`${kpiLinkClass} mt-3`}>
                Відкрити
                <IconChevron className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </AdminAccentRow>
          </AdminAccentCard>

          <AdminAccentCard hover className="group">
            <AdminAccentRow icon={<IconBuilding className="h-6 w-6" />}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Станції</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                {stationsLoading ? '…' : stationsTotal.toLocaleString('uk-UA')}
              </p>
              <Link to="/admin-dashboard/stations" className={`${kpiLinkClass} mt-3`}>
                Каталог
                <IconChevron className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </AdminAccentRow>
          </AdminAccentCard>
        </div>
      </div>

      <Link to="/admin-dashboard/map" className={globalAdminMapPromo}>
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <IconMap className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/80">Інтерактивна мапа</p>
              <p className="mt-1 text-xl font-bold sm:text-2xl">Карта мережі зарядки</p>
              <p className="mt-1 max-w-xl text-sm text-white/90">
                Фільтри, маркери станцій і картка обраної точки на одному екрані.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/25 transition group-hover:bg-white/25 sm:self-center">
            Відкрити карту
            <IconChevron className="h-5 w-5 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </div>
  );
}

