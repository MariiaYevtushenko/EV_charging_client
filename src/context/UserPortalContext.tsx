import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { deleteUserBooking, fetchUserBookings } from '../api/userReads';
import { mapBookingApiToUserBooking } from '../api/userPortalMappers';
import type { UserBooking, UserCar, UserCurrentSession, UserPaymentRow, UserSessionRecord } from '../types/userPortal';

type UserPortalContextValue = {
  cars: UserCar[];
  /** Повна заміна списку (наприклад після завантаження з API). */
  replaceCars: (cars: UserCar[]) => void;
  addCar: (car: Omit<UserCar, 'id'>) => void;
  updateCar: (id: string, patch: Partial<Omit<UserCar, 'id'>>) => void;
  removeCar: (id: string) => void;
  sessions: UserSessionRecord[];
  replaceSessions: (rows: UserSessionRecord[]) => void;
  bookings: UserBooking[];
  replaceBookings: (rows: UserBooking[]) => void;
  cancelBooking: (id: string) => Promise<void>;
  currentSession: UserCurrentSession | null;
  endCurrentSession: () => void;
  /** Почати зарядку на обраному порту (якщо сесія вже є — ігнорується). */
  startSessionAtPort: (params: {
    stationId: string;
    stationName: string;
    portLabel: string;
    dayTariff: number;
  }) => boolean;
  payments: UserPaymentRow[];
  replacePayments: (rows: UserPaymentRow[]) => void;
};

const UserPortalContext = createContext<UserPortalContextValue | undefined>(undefined);

export function UserPortalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const sessionRef = useRef<UserCurrentSession | null>(null);
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
  const [currentSession, setCurrentSessionState] = useState<UserCurrentSession | null>(null);

  const setCurrentSession = useCallback((next: UserCurrentSession | null | ((prev: UserCurrentSession | null) => UserCurrentSession | null)) => {
    setCurrentSessionState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      sessionRef.current = resolved;
      return resolved;
    });
  }, []);
  const [payments, setPayments] = useState<UserPaymentRow[]>([]);
  const replacePayments = useCallback((rows: UserPaymentRow[]) => {
    setPayments(rows);
  }, []);

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

  const endCurrentSession = useCallback(() => {
    setCurrentSession(null);
  }, [setCurrentSession]);

  const startSessionAtPort = useCallback(
    (params: { stationId: string; stationName: string; portLabel: string; dayTariff: number }) => {
      if (sessionRef.current) return false;
      const kwh = 0.45;
      const next: UserCurrentSession = {
        stationId: params.stationId,
        stationName: params.stationName,
        portLabel: params.portLabel,
        progressPct: 5,
        kwhSoFar: kwh,
        costSoFar: Math.round(params.dayTariff * kwh * 100) / 100,
        startedAt: new Date().toISOString().slice(0, 19),
        elapsedLabel: '00:02:40',
      };
      sessionRef.current = next;
      setCurrentSessionState(next);
      return true;
    },
    []
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
      currentSession,
      endCurrentSession,
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
      currentSession,
      endCurrentSession,
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
