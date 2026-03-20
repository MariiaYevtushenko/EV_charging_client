import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';

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

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
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

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

export default function StationAdminLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

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

  const balanceText =
    user?.balance !== undefined
      ? `${user.balance.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`
      : '—';

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-transparent text-gray-900 antialiased">
      <aside className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-emerald-200/60 bg-white px-4 py-6 shadow-sm">
        <Link
          to="/station-dashboard"
          className="mb-10 flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-1 transition hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          title="На головну — карта"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-white shadow-md shadow-green-600/25">
            <BoltIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">EcoCharge</p>
            <p className="text-sm font-bold text-gray-900">Адмін станцій</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          <NavLink to="/station-dashboard" end className={navLinkClass}>
            <MapIcon className="h-5 w-5 shrink-0 opacity-90" />
            Карта та огляд
          </NavLink>
          <NavLink to="/station-dashboard/stations" className={navLinkClass}>
            <BuildingIcon className="h-5 w-5 shrink-0 opacity-90" />
            Список станцій
          </NavLink>
          <NavLink to="/station-dashboard/analytics" className={navLinkClass}>
            <ChartIcon className="h-5 w-5 shrink-0 opacity-90" />
            Аналітика
          </NavLink>
          <NavLink to="/station-dashboard/notifications" className={navLinkClass}>
            <span className="relative inline-flex shrink-0">
              <BellIcon className="h-5 w-5 opacity-90" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </span>
            Сповіщення
          </NavLink>
          <NavLink to="/station-dashboard/profile" className={navLinkClass}>
            <UserIcon className="h-5 w-5 shrink-0 opacity-90" />
            Профіль
          </NavLink>
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 rounded-xl border border-emerald-200/80 bg-white/70 px-3 py-2.5 text-left text-sm font-medium text-gray-600 shadow-sm transition hover:border-emerald-300 hover:bg-white hover:text-gray-900"
        >
          Вийти
        </button>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-16 shrink-0 items-center gap-4 border-b border-emerald-100/90 bg-white/90 px-6 shadow-sm shadow-emerald-900/5 backdrop-blur-md">
          <div className="relative max-w-xl flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Пошук станцій, сесій, користувачів…"
              className="w-full rounded-2xl border border-emerald-100/90 bg-emerald-50/40 py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(34,197,94,0.15)] focus:ring-0"
            />
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-gray-900">{user?.name ?? 'Користувач'}</p>
              <p className="text-xs text-gray-500">Баланс: {balanceText}</p>
            </div>
            <Link
              to="/station-dashboard/notifications"
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-100/90 bg-white/90 text-gray-600 shadow-sm shadow-emerald-900/5 transition hover:border-emerald-300 hover:bg-emerald-50/80 hover:text-green-800 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              title="Сповіщення"
            >
              <BellIcon className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
              <span className="sr-only">Сповіщення{unreadCount > 0 ? `, ${unreadCount} непрочитаних` : ''}</span>
            </Link>
            <Link
              to="/station-dashboard/profile"
              className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-green-600 text-sm font-bold text-white shadow-md shadow-green-600/25 ring-2 ring-white transition hover:bg-green-700 hover:ring-green-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-green-400"
              title="Профіль"
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
