import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { EndUser, EvUserRole, TariffPlan } from '../types/globalAdmin';
import {
  fetchAdminUsersPage,
  mapEvUserPublicRowToEndUser,
  type AdminUsersSortKey,
  type UsersRoleCounts,
} from '../api/adminUsers';

const USERS_PAGE_SIZE = 50;

export type BookingRow = EndUser['bookings'][number] & {
  userId: string;
  userName: string;
};

type GlobalAdminContextValue = {
  endUsers: EndUser[];
  /** true після першого успішного завантаження сторінки користувачів. */
  endUsersReady: boolean;
  usersPage: number;
  usersTotal: number;
  usersPageSize: number;
  setUsersPage: (page: number) => void;
  /** null — усі ролі в списку; інакше фільтр на сервері (пагінація узгоджена). */
  usersRoleFilter: EvUserRole | null;
  setUsersRoleFilter: (role: EvUserRole | null) => void;
  /** Текст пошуку для списку користувачів (ім’я, прізвище, email, телефон) — запит `q` на сервері. */
  usersSearchQuery: string;
  setUsersSearchQuery: (q: string) => void;
  /** Сортування списку в БД (до пагінації). */
  usersSortKey: AdminUsersSortKey;
  usersSortDir: 'asc' | 'desc';
  setUsersSort: (key: AdminUsersSortKey, dir: 'asc' | 'desc') => void;
  usersRoleCounts: UsersRoleCounts | null;
  replaceEndUsers: (users: EndUser[]) => void;
  getEndUser: (id: string) => EndUser | undefined;
  updateEndUser: (id: string, patch: Partial<EndUser>) => void;
  replaceEndUser: (user: EndUser) => void;
  tariffPlans: TariffPlan[];
  updateTariffPlan: (id: string, patch: Partial<TariffPlan>) => void;
  allBookings: BookingRow[];
};

const GlobalAdminContext = createContext<GlobalAdminContextValue | undefined>(undefined);

function buildBookingRows(users: EndUser[]): BookingRow[] {
  return users.flatMap((u) =>
    u.bookings.map((b) => ({
      ...b,
      userId: u.id,
      userName: u.name,
    }))
  );
}

export function GlobalAdminProvider({ children }: { children: ReactNode }) {
  const [endUsers, setEndUsers] = useState<EndUser[]>([]);
  const [endUsersReady, setEndUsersReady] = useState(false);
  const [usersPage, setUsersPageState] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersRoleFilter, setUsersRoleFilterState] = useState<EvUserRole | null>(null);
  const [usersSearchQuery, setUsersSearchQueryState] = useState('');
  const [usersSortKey, setUsersSortKeyState] = useState<AdminUsersSortKey>('name');
  const [usersSortDir, setUsersSortDirState] = useState<'asc' | 'desc'>('asc');
  const [usersRoleCounts, setUsersRoleCounts] = useState<UsersRoleCounts | null>(null);
  const [tariffPlans, setTariffPlans] = useState<TariffPlan[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchAdminUsersPage(
          usersPage,
          USERS_PAGE_SIZE,
          usersRoleFilter,
          usersSearchQuery,
          usersSortKey,
          usersSortDir
        );
        if (cancelled) return;
        setUsersTotal(res.total);
        setUsersRoleCounts(res.roleCounts);
        const maxPage = Math.max(1, Math.ceil(res.total / res.pageSize) || 1);
        if (usersPage > maxPage) {
          setUsersPageState(maxPage);
          return;
        }
        setEndUsers(res.items.map(mapEvUserPublicRowToEndUser));
        setEndUsersReady(true);
      } catch {
        if (!cancelled) {
          setEndUsers([]);
          setUsersTotal(0);
          setUsersRoleCounts(null);
          setEndUsersReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [usersPage, usersRoleFilter, usersSearchQuery, usersSortKey, usersSortDir]);

  const setUsersPage = useCallback((page: number) => {
    setUsersPageState(Math.max(1, page));
  }, []);

  const setUsersRoleFilter = useCallback((role: EvUserRole | null) => {
    setUsersRoleFilterState(role);
    setUsersPageState(1);
  }, []);

  const setUsersSearchQuery = useCallback((q: string) => {
    setUsersSearchQueryState((prev) => {
      if (prev === q) return prev;
      setUsersPageState(1);
      return q;
    });
  }, []);

  const setUsersSort = useCallback((key: AdminUsersSortKey, dir: 'asc' | 'desc') => {
    setUsersSortKeyState((prevKey) => {
      if (prevKey !== key) {
        setUsersPageState(1);
      }
      return key;
    });
    setUsersSortDirState(dir);
  }, []);

  const replaceEndUsers = useCallback((users: EndUser[]) => {
    setEndUsers(users);
    setEndUsersReady(true);
  }, []);

  const getEndUser = useCallback(
    (id: string) => endUsers.find((u) => u.id === id),
    [endUsers]
  );

  const updateEndUser = useCallback((id: string, patch: Partial<EndUser>) => {
    setEndUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const replaceEndUser = useCallback((user: EndUser) => {
    setEndUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === user.id);
      if (idx === -1) return [...prev, user];
      return prev.map((u) => (u.id === user.id ? user : u));
    });
  }, []);

  const updateTariffPlan = useCallback((id: string, patch: Partial<TariffPlan>) => {
    setTariffPlans((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const allBookings = useMemo(() => buildBookingRows(endUsers), [endUsers]);

  const value = useMemo(
    () => ({
      endUsers,
      endUsersReady,
      usersPage,
      usersTotal,
      usersPageSize: USERS_PAGE_SIZE,
      setUsersPage,
      usersRoleFilter,
      setUsersRoleFilter,
      usersSearchQuery,
      setUsersSearchQuery,
      usersSortKey,
      usersSortDir,
      setUsersSort,
      usersRoleCounts,
      replaceEndUsers,
      getEndUser,
      updateEndUser,
      replaceEndUser,
      tariffPlans,
      updateTariffPlan,
      allBookings,
    }),
    [
      endUsers,
      endUsersReady,
      usersPage,
      usersTotal,
      setUsersPage,
      usersRoleFilter,
      setUsersRoleFilter,
      usersSearchQuery,
      setUsersSearchQuery,
      usersSortKey,
      usersSortDir,
      setUsersSort,
      usersRoleCounts,
      replaceEndUsers,
      getEndUser,
      updateEndUser,
      replaceEndUser,
      tariffPlans,
      updateTariffPlan,
      allBookings,
    ]
  );

  return <GlobalAdminContext.Provider value={value}>{children}</GlobalAdminContext.Provider>;
}

export function useGlobalAdmin() {
  const ctx = useContext(GlobalAdminContext);
  if (!ctx) throw new Error('useGlobalAdmin must be used within GlobalAdminProvider');
  return ctx;
}
