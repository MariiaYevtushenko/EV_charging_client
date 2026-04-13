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
  type UsersRoleCounts,
} from '../api/adminUsers';
import { fetchAdminNetworkPayments } from '../api/adminNetwork';
import { ApiError } from '../api/http';

const USERS_PAGE_SIZE = 50;

export type PaymentRow = EndUser['payments'][number] & {
  userId: string | null;
  userName: string;
};

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
  usersRoleCounts: UsersRoleCounts | null;
  replaceEndUsers: (users: EndUser[]) => void;
  getEndUser: (id: string) => EndUser | undefined;
  updateEndUser: (id: string, patch: Partial<EndUser>) => void;
  replaceEndUser: (user: EndUser) => void;
  tariffPlans: TariffPlan[];
  updateTariffPlan: (id: string, patch: Partial<TariffPlan>) => void;
  /** Усі платежі (bill) з `/api/admin/network/payments`. */
  allPayments: PaymentRow[];
  paymentsLoading: boolean;
  paymentsError: string | null;
  reloadPayments: () => void;
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
  const [usersRoleCounts, setUsersRoleCounts] = useState<UsersRoleCounts | null>(null);
  const [tariffPlans, setTariffPlans] = useState<TariffPlan[]>([]);

  const [allPayments, setAllPayments] = useState<PaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const reloadPayments = useCallback(() => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    void fetchAdminNetworkPayments()
      .then((rows) => {
        setAllPayments(
          rows.map((r) => ({
            id: r.id,
            sessionId: r.sessionId,
            amount: r.amount,
            currency: r.currency,
            method: r.method,
            status: r.status,
            createdAt: r.createdAt,
            description: r.description,
            userId: r.userId,
            userName: r.userName,
          }))
        );
      })
      .catch((e: unknown) => {
        setAllPayments([]);
        setPaymentsError(e instanceof ApiError ? e.message : 'Не вдалося завантажити платежі');
      })
      .finally(() => setPaymentsLoading(false));
  }, []);

  useEffect(() => {
    void reloadPayments();
  }, [reloadPayments]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchAdminUsersPage(usersPage, USERS_PAGE_SIZE, usersRoleFilter);
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
  }, [usersPage, usersRoleFilter]);

  const setUsersPage = useCallback((page: number) => {
    setUsersPageState(Math.max(1, page));
  }, []);

  const setUsersRoleFilter = useCallback((role: EvUserRole | null) => {
    setUsersRoleFilterState(role);
    setUsersPageState(1);
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
      usersRoleCounts,
      replaceEndUsers,
      getEndUser,
      updateEndUser,
      replaceEndUser,
      tariffPlans,
      updateTariffPlan,
      allPayments,
      paymentsLoading,
      paymentsError,
      reloadPayments,
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
      usersRoleCounts,
      replaceEndUsers,
      getEndUser,
      updateEndUser,
      replaceEndUser,
      tariffPlans,
      updateTariffPlan,
      allPayments,
      paymentsLoading,
      paymentsError,
      reloadPayments,
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
