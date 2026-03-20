import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  UserBooking,
  UserBookingPricingModel,
  UserBookingStatus,
  UserCar,
  UserCurrentSession,
  UserPaymentRow,
  UserSessionRecord,
} from '../types/userPortal';
import {
  INITIAL_CURRENT_SESSION,
  INITIAL_USER_BOOKINGS,
  INITIAL_USER_CARS,
  INITIAL_USER_PAYMENTS,
  INITIAL_USER_SESSIONS,
} from '../data/userPortalMock';

type UserPortalContextValue = {
  cars: UserCar[];
  addCar: (car: Omit<UserCar, 'id'>) => void;
  updateCar: (id: string, patch: Partial<Omit<UserCar, 'id'>>) => void;
  removeCar: (id: string) => void;
  sessions: UserSessionRecord[];
  bookings: UserBooking[];
  addBooking: (input: {
    stationId: string;
    stationName: string;
    slotLabel: string;
    start: string;
    end: string;
    durationMin: number;
    pricingModel: UserBookingPricingModel;
    payNowAmount: number;
  }) => void;
  cancelBooking: (id: string) => void;
  currentSession: UserCurrentSession | null;
  endCurrentSession: () => void;
  startDemoSession: () => void;
  /** Почати зарядку на обраному порту (демо; якщо сесія вже є — ігнорується). */
  startSessionAtPort: (params: {
    stationId: string;
    stationName: string;
    portLabel: string;
    dayTariff: number;
  }) => boolean;
  payments: UserPaymentRow[];
};

const UserPortalContext = createContext<UserPortalContextValue | undefined>(undefined);

const DEMO_SESSION_TEMPLATE: UserCurrentSession = {
  stationId: 'st-14',
  stationName: 'Станція #14 «Lviv-Polytech»',
  portLabel: 'Порт B · CCS2',
  progressPct: 64,
  kwhSoFar: 12.4,
  costSoFar: 93.0,
  startedAt: new Date().toISOString().slice(0, 19),
  elapsedLabel: '00:24:15',
};

export function UserPortalProvider({ children }: { children: ReactNode }) {
  const sessionRef = useRef<UserCurrentSession | null>(null);
  const [cars, setCars] = useState<UserCar[]>(() => INITIAL_USER_CARS.map((c) => ({ ...c })));
  const [sessions] = useState<UserSessionRecord[]>(() =>
    INITIAL_USER_SESSIONS.map((s) => ({ ...s }))
  );
  const [bookings, setBookings] = useState<UserBooking[]>(() =>
    INITIAL_USER_BOOKINGS.map((b) => ({ ...b }))
  );
  const [currentSession, setCurrentSessionState] = useState<UserCurrentSession | null>(() => {
    const s = INITIAL_CURRENT_SESSION ? { ...INITIAL_CURRENT_SESSION } : null;
    sessionRef.current = s;
    return s;
  });

  const setCurrentSession = useCallback((next: UserCurrentSession | null | ((prev: UserCurrentSession | null) => UserCurrentSession | null)) => {
    setCurrentSessionState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      sessionRef.current = resolved;
      return resolved;
    });
  }, []);
  const [payments] = useState<UserPaymentRow[]>(() => INITIAL_USER_PAYMENTS.map((p) => ({ ...p })));

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

  const addBooking = useCallback(
    (input: {
      stationId: string;
      stationName: string;
      slotLabel: string;
      start: string;
      end: string;
      durationMin: number;
      pricingModel: UserBookingPricingModel;
      payNowAmount: number;
    }) => {
      const id = `ub-${Date.now().toString(36)}`;
      const row: UserBooking = {
        id,
        stationId: input.stationId,
        stationName: input.stationName,
        slotLabel: input.slotLabel,
        start: input.start,
        end: input.end,
        status: 'upcoming',
        durationMin: input.durationMin,
        pricingModel: input.pricingModel,
        payNowAmount: input.payNowAmount,
      };
      setBookings((prev) => [row, ...prev]);
    },
    []
  );

  const cancelBooking = useCallback((id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' as UserBookingStatus } : b))
    );
  }, []);

  const endCurrentSession = useCallback(() => {
    setCurrentSession(null);
  }, [setCurrentSession]);

  const startDemoSession = useCallback(() => {
    setCurrentSession({ ...DEMO_SESSION_TEMPLATE });
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
      addCar,
      updateCar,
      removeCar,
      sessions,
      bookings,
      addBooking,
      cancelBooking,
      currentSession,
      endCurrentSession,
      startDemoSession,
      startSessionAtPort,
      payments,
    }),
    [
      cars,
      addCar,
      updateCar,
      removeCar,
      sessions,
      bookings,
      addBooking,
      cancelBooking,
      currentSession,
      endCurrentSession,
      startDemoSession,
      startSessionAtPort,
      payments,
    ]
  );

  return <UserPortalContext.Provider value={value}>{children}</UserPortalContext.Provider>;
}

export function useUserPortal() {
  const ctx = useContext(UserPortalContext);
  if (!ctx) throw new Error('useUserPortal must be used within UserPortalProvider');
  return ctx;
}
