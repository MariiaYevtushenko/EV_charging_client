import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGlobalAdmin } from '../../context/GlobalAdminContext';
import AdminListPagination from '../../components/admin/AdminListPagination';
import SortableTableTh, { defaultDirForSortColumn } from '../../components/admin/SortableTableTh';
import type { AdminUsersSortKey } from '../../api/adminUsers';
import type { EvUserRole } from '../../types/globalAdmin';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { globalAdminPageTitle, globalAdminSearchInput } from '../../styles/globalAdminTheme';

const USERS_SEARCH_DEBOUNCE_MS = 350;

const ROLE_CARDS: { id: EvUserRole; label: string; pillTone: 'success' | 'warn' | 'danger' }[] = [
  { id: 'USER', label: 'Користувачі', pillTone: 'success' },
  { id: 'STATION_ADMIN', label: 'Адміністратори станцій', pillTone: 'warn' },
  { id: 'ADMIN', label: 'Адміністратори', pillTone: 'danger' },
];

function roleLabel(role: EvUserRole | undefined): string {
  switch (role ?? 'USER') {
    case 'USER':
      return 'Користувач';
    case 'STATION_ADMIN':
      return 'Адмін станції';
    case 'ADMIN':
      return 'Адміністратор';
    default:
      return '—';
  }
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
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

export default function GlobalUsersPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const {
    endUsers,
    endUsersReady,
    usersPage,
    usersTotal,
    usersPageSize,
    setUsersPage,
    usersRoleFilter,
    setUsersRoleFilter,
    usersSearchQuery,
    setUsersSearchQuery,
    usersRoleCounts,
    usersSortKey,
    usersSortDir,
    setUsersSort,
  } = useGlobalAdmin();

  const [searchDraft, setSearchDraft] = useState(usersSearchQuery);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setUsersSearchQuery(searchDraft.trim());
    }, USERS_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchDraft, setUsersSearchQuery]);

  const onSort = useCallback(
    (key: string) => {
      const k = key as AdminUsersSortKey;
      if (usersSortKey === k) {
        setUsersSort(k, usersSortDir === 'asc' ? 'desc' : 'asc');
      } else {
        setUsersSort(k, defaultDirForSortColumn(k));
      }
    },
    [usersSortKey, usersSortDir, setUsersSort]
  );

  const toggleRoleFilter = useCallback(
    (id: EvUserRole) => {
      setUsersRoleFilter(usersRoleFilter === id ? null : id);
    },
    [usersRoleFilter, setUsersRoleFilter]
  );

  const rows = useMemo(() => {
    let list = endUsers;
    if (currentUser?.id) {
      list = list.filter((u) => u.id !== currentUser.id);
    }
    return list;
  }, [endUsers, currentUser?.id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className={globalAdminPageTitle}>Користувачі</h1>
          <div className="mt-3 max-w-xl">
            <label htmlFor="global-users-search" className="sr-only">
              Пошук користувачів
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"
                aria-hidden
              >
                <SearchIcon className="h-5 w-5" />
              </span>
              <input
                id="global-users-search"
                type="search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Пошук за ім’ям, прізвищем, email або телефоном…"
                className={globalAdminSearchInput}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      </div>

      {usersRoleCounts ? (
        <div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ROLE_CARDS.map(({ id, label, pillTone }) => {
              const selected = usersRoleFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleRoleFilter(id)}
                  aria-pressed={selected}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 ${
                    selected
                      ? 'border-green-600 bg-green-50/95 ring-2 ring-green-500/80 ring-offset-1 ring-offset-white'
                      : 'border-green-100/90 bg-white/95 ring-1 ring-slate-900/[0.04] hover:border-green-200 hover:bg-green-50/40'
                  }`}
                >
                  <StatusPill tone={pillTone}>{label}</StatusPill>
                  <p className="text-2xl font-bold tabular-nums text-slate-900">
                    {usersRoleCounts[id]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <AppCard className="overflow-x-auto !p-0" padding={false}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <SortableTableTh
                label="ПІБ"
                columnKey="name"
                activeKey={usersSortKey}
                dir={usersSortDir}
                onSort={onSort}
              />
              <SortableTableTh
                label="Email"
                columnKey="email"
                activeKey={usersSortKey}
                dir={usersSortDir}
                onSort={onSort}
              />
              <SortableTableTh
                label="Телефон"
                columnKey="phone"
                activeKey={usersSortKey}
                dir={usersSortDir}
                onSort={onSort}
              />
              <SortableTableTh
                label="Роль"
                columnKey="role"
                activeKey={usersSortKey}
                dir={usersSortDir}
                onSort={onSort}
              />
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Дія
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!endUsersReady ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  Завантаження списку…
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr
                  key={u.id}
                  className="cursor-pointer bg-white transition hover:bg-green-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/35"
                  tabIndex={0}
                  aria-label={`Відкрити картку «${u.name}»`}
                  onClick={() => navigate(`/admin-dashboard/users/${u.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/admin-dashboard/users/${u.id}`);
                    }
                  }}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-gray-600" title={u.email}>
                    {u.email}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{u.phone}</td>
                  <td className="px-4 py-3 text-gray-700">{roleLabel(u.role)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link
                      to={`/admin-dashboard/users/${u.id}/edit`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label={`Редагувати «${u.name}»`}
                      title="Редагувати"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {endUsersReady && rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            {usersSearchQuery.trim()
              ? 'Нічого не знайдено за цим запитом. Спробуйте змінити пошук або фільтр ролі.'
              : 'Немає записів для відображення (або лише ваш обліковий запис, який не показується).'}
          </p>
        ) : null}
      </AppCard>

      <AdminListPagination
        page={usersPage}
        pageSize={usersPageSize}
        total={usersTotal}
        onPageChange={setUsersPage}
      />
    </div>
  );
}
