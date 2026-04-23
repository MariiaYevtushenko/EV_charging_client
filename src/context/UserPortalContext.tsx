import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { deleteUserBooking, fetchUserBookings, fetchUserPayments, fetchUserSessions } from '../api/userReads';
import { createUserSession } from '../api/userSessions';
import {
  mapBillApiToPaymentRow,
  mapBookingApiToUserBooking,
  mapUserSessionApiToRecord,
} from '../api/userPortalMappers';
import type { UserBooking, UserCar, UserPaymentRow, UserSessionRecord } from '../types/userPortal';

type UserPortalContextValue = {
  cars: UserCar[];
  replaceCars: (cars: UserCar[]) => void;
  addCar: (car: Omit<UserCar, 'id'>) => void;
  updateCar: (id: string, patch: Partial<Omit<UserCar, 'id'>>) => void;
  removeCar: (id: string) => void;
  sessions: UserSessionRecord[];
  replaceSessions: (rows: UserSessionRecord[]) => void;
  bookings: UserBooking[];
  replaceBookings: (rows: UserBooking[]) => void;
  cancelBooking: (id: string) => Promise<void>;
  reloadSessionsAndPayments: () => Promise<void>;
  startSessionAtPort: (params: {
    stationId: string;
    portNumber: number;
    stationName: string;
    portLabel: string;
    /** ID авто з гаража (обовʼязково для старту сесії з UI). */
    vehicleId: string;
  }) => Promise<boolean>;
  payments: UserPaymentRow[];
  replacePayments: (rows: UserPaymentRow[]) => void;
};

const UserPortalContext = createContext<UserPortalContextValue | undefined>(undefined);

export function UserPortalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cars, setCars] = useState<UserCar[]>([]);

  const replaceCars = useCallback((next: UserCar[]) => {
    setCars(next);
  }, []);
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const replaceSessions = useCallback((rows: UserSessionRecord[]) => {
    setSessions(rows);
  }, []);
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const replaceBookings = useCallback((rows: UserBooking[]) => {
    setBookings(rows);
  }, []);
  const [payments, setPayments] = useState<UserPaymentRow[]>([]);
  const replacePayments = useCallback((rows: UserPaymentRow[]) => {
    setPayments(rows);
  }, []);

  const reloadSessionsAndPayments = useCallback(async () => {
    const uid = Number(user?.id);
    if (!Number.isFinite(uid)) return;
    const [sessRows, payRows] = await Promise.all([fetchUserSessions(uid), fetchUserPayments(uid)]);
    setSessions(sessRows.map((r) => mapUserSessionApiToRecord(r)));
    setPayments(payRows.map((r) => mapBillApiToPaymentRow(r)));
  }, [user?.id]);

  const addCar = useCallback((car: Omit<UserCar, 'id'>) => {
    const id = `uc-${Date.now().toString(36)}`;
    setCars((prev) => [...prev, { ...car, id }]);
  }, []);

  const updateCar = useCallback((id: string, patch: Partial<Omit<UserCar, 'id'>>) => {
    setCars((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const removeCar = useCallback((id: string) => {
    setCars((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const cancelBooking = useCallback(
    async (id: string) => {
      const uid = Number(user?.id);
      if (!Number.isFinite(uid)) return;
      try {
        await deleteUserBooking(uid, Number(id));
        const rows = await fetchUserBookings(uid);
        setBookings(rows.map((r) => mapBookingApiToUserBooking(r)));
      } catch {
        /* мережа / доступ */
      }
    },
    [user?.id]
  );

  const startSessionAtPort = useCallback(
    async (params: {
      stationId: string;
      portNumber: number;
      stationName: string;
      portLabel: string;
      vehicleId: string;
    }) => {
      const uid = Number(user?.id);
      if (!Number.isFinite(uid)) return false;
      const vid = Number(params.vehicleId);
      if (!Number.isFinite(vid) || vid <= 0) return false;
      const body: Record<string, unknown> = {
        stationId: Number(params.stationId),
        portNumber: params.portNumber,
        vehicleId: vid,
      };
      await createUserSession(uid, body);
      await reloadSessionsAndPayments();
      return true;
    },
    [user?.id, reloadSessionsAndPayments]
  );

  const value = useMemo(
    () => ({
      cars,
      replaceCars,
      addCar,
      updateCar,
      removeCar,
      sessions,
      replaceSessions,
      bookings,
      replaceBookings,
      cancelBooking,
      reloadSessionsAndPayments,
      startSessionAtPort,
      payments,
      replacePayments,
    }),
    [
      cars,
      replaceCars,
      addCar,
      updateCar,
      removeCar,
      sessions,
      replaceSessions,
      bookings,
      replaceBookings,
      cancelBooking,
      reloadSessionsAndPayments,
      startSessionAtPort,
      payments,
      replacePayments,
    ]
  );

  return <UserPortalContext.Provider value={value}>{children}</UserPortalContext.Provider>;
}

export function useUserPortal() {
  const ctx = useContext(UserPortalContext);
  if (!ctx) throw new Error('useUserPortal must be used within UserPortalProvider');
  return ctx;
}
