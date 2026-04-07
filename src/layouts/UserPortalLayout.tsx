import { useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SeedDemoDataButton from '../components/SeedDemoDataButton';
import { useUserPortal } from '../context/UserPortalContext';
import { fetchUserVehicles } from '../api/userReads';
import { mapVehicleApiRowToUserCar } from '../api/userVehicles';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'bg-green-600 text-white shadow-md shadow-green-600/25'
      : 'text-gray-600 hover:bg-emerald-50/90 hover:text-gray-900 hover:shadow-sm'
  }`;

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  );
}

function CarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0v6a1 1 0 001 1h1m-3-7v7m0 0a2 2 0 104 0m-4 0a2 2 0 114 0m8 0a2 2 0 104 0m-4 0a2 2 0 114 0"
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
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function CardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

export default function UserPortalLayout() {
  const { user, logout } = useAuth();
  const { replaceCars } = useUserPortal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    const uid = Number(user.id);
    if (!Number.isFinite(uid)) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchUserVehicles(uid);
        if (cancelled) return;
        replaceCars(rows.map((r) => mapVehicleApiRowToUserCar(r)));
      } catch {
        if (!cancelled) replaceCars([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, replaceCars]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials =
    user?.name
      ?.split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '?';

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-transparent text-gray-900 antialiased">
      <aside className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-emerald-200/60 bg-white px-4 py-6 shadow-sm">
        <Link
          to="/dashboard"
          className="mb-10 flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-1 transition hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-white shadow-md shadow-green-600/25">
            <BoltIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">EV Stations</p>
            <p className="text-sm font-bold text-gray-900">Мій кабінет</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          <NavLink to="/dashboard" end className={navLinkClass}>
            <MapIcon className="h-5 w-5 shrink-0 opacity-90" />
            Карта та сесія
          </NavLink>
          <NavLink to="/dashboard/session" className={navLinkClass}>
            <BoltIcon className="h-5 w-5 shrink-0 opacity-90" />
            Почати зарядку
          </NavLink>
          <NavLink to="/dashboard/cars" className={navLinkClass}>
            <CarIcon className="h-5 w-5 shrink-0 opacity-90" />
            Мої авто
          </NavLink>
          <NavLink to="/dashboard/sessions" className={navLinkClass}>
            <ClockIcon className="h-5 w-5 shrink-0 opacity-90" />
            Історія сесій
          </NavLink>
          <NavLink to="/dashboard/bookings" className={navLinkClass}>
            <CalendarIcon className="h-5 w-5 shrink-0 opacity-90" />
            Бронювання
          </NavLink>
          <NavLink to="/dashboard/payments" className={navLinkClass}>
            <CardIcon className="h-5 w-5 shrink-0 opacity-90" />
            Платежі
          </NavLink>
          <NavLink to="/dashboard/analytics" className={navLinkClass}>
            <ChartIcon className="h-5 w-5 shrink-0 opacity-90" />
            Аналітика
          </NavLink>
          <NavLink to="/dashboard/profile" className={navLinkClass}>
            <UserIcon className="h-5 w-5 shrink-0 opacity-90" />
            Профіль
          </NavLink>
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t border-emerald-100/80 pt-4">
          <SeedDemoDataButton />
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-emerald-200/80 bg-white/70 px-3 py-2.5 text-left text-sm font-medium text-gray-600 shadow-sm transition hover:border-emerald-300 hover:bg-white hover:text-gray-900"
          >
            Вийти
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-16 shrink-0 items-center gap-4 border-b border-emerald-100/90 bg-white/90 px-6 shadow-sm shadow-emerald-900/5 backdrop-blur-md">
          <div className="relative max-w-xl flex-1">
           
           
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-gray-900">{user?.name ?? 'Користувач'}</p>
           
            </div>
            <Link
              to="/dashboard/profile"
              className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-green-600 text-sm font-bold text-white shadow-md shadow-green-600/25 ring-2 ring-white transition hover:bg-green-700 hover:ring-green-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-green-400"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden>{initials}</span>
              )}
            </Link>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
