import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { EndUser, TariffPlan } from '../types/globalAdmin';
import { INITIAL_END_USERS, INITIAL_TARIFF_PLANS } from '../data/globalAdminMock';

export type PaymentRow = EndUser['payments'][number] & {
  userId: string;
  userName: string;
};

export type BookingRow = EndUser['bookings'][number] & {
  userId: string;
  userName: string;
};

type GlobalAdminContextValue = {
  endUsers: EndUser[];
  getEndUser: (id: string) => EndUser | undefined;
  updateEndUser: (id: string, patch: Partial<EndUser>) => void;
  replaceEndUser: (user: EndUser) => void;
  tariffPlans: TariffPlan[];
  updateTariffPlan: (id: string, patch: Partial<TariffPlan>) => void;
  allPayments: PaymentRow[];
  allBookings: BookingRow[];
};

const GlobalAdminContext = createContext<GlobalAdminContextValue | undefined>(undefined);

function buildPaymentRows(users: EndUser[]): PaymentRow[] {
  return users.flatMap((u) =>
    u.payments.map((p) => ({
      ...p,
      userId: u.id,
      userName: u.name,
    }))
  );
}

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
  const [endUsers, setEndUsers] = useState<EndUser[]>(() =>
    INITIAL_END_USERS.map((u) => ({
      ...u,
      cars: u.cars.map((c) => ({ ...c })),
      bookings: u.bookings.map((b) => ({ ...b })),
      payments: u.payments.map((p) => ({ ...p })),
      charges: u.charges.map((c) => ({ ...c })),
    }))
  );
  const [tariffPlans, setTariffPlans] = useState<TariffPlan[]>(() =>
    INITIAL_TARIFF_PLANS.map((t) => ({ ...t }))
  );

  const getEndUser = useCallback(
    (id: string) => endUsers.find((u) => u.id === id),
    [endUsers]
  );

  const updateEndUser = useCallback((id: string, patch: Partial<EndUser>) => {
    setEndUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const replaceEndUser = useCallback((user: EndUser) => {
    setEndUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
  }, []);

  const updateTariffPlan = useCallback((id: string, patch: Partial<TariffPlan>) => {
    setTariffPlans((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const allPayments = useMemo(() => buildPaymentRows(endUsers), [endUsers]);
  const allBookings = useMemo(() => buildBookingRows(endUsers), [endUsers]);

  const value = useMemo(
    () => ({
      endUsers,
      getEndUser,
      updateEndUser,
      replaceEndUser,
      tariffPlans,
      updateTariffPlan,
      allPayments,
      allBookings,
    }),
    [
      endUsers,
      getEndUser,
      updateEndUser,
      replaceEndUser,
      tariffPlans,
      updateTariffPlan,
      allPayments,
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
