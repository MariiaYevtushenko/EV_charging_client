import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AdminNetworkBookingRow, AdminNetworkSessionRow } from "../api/adminNetwork";
import { fetchAdminNetworkBookings, fetchAdminNetworkSessions } from "../api/adminNetwork";

type StationAdminNetworkContextValue = {
  bookings: AdminNetworkBookingRow[];
  /** Усього бронювань у мережі (для KPI), незалежно від розміру завантаженого слайсу. */
  bookingsTotal: number;
  sessions: AdminNetworkSessionRow[];
  /** Усього сесій у мережі (для KPI). */
  sessionsTotal: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const StationAdminNetworkContext = createContext<StationAdminNetworkContextValue | undefined>(
  undefined
);

export function StationAdminNetworkProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<AdminNetworkBookingRow[]>([]);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [sessions, setSessions] = useState<AdminNetworkSessionRow[]>([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, s] = await Promise.all([
        fetchAdminNetworkBookings(),
        fetchAdminNetworkSessions(),
      ]);
      setBookings(b.items);
      setBookingsTotal(b.total);
      setSessions(s.items);
      setSessionsTotal(s.total);
    } catch (e) {
      setBookings([]);
      setBookingsTotal(0);
      setSessions([]);
      setSessionsTotal(0);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(
    () => ({
      bookings,
      bookingsTotal,
      sessions,
      sessionsTotal,
      loading,
      error,
      reload,
    }),
    [bookings, bookingsTotal, sessions, sessionsTotal, loading, error, reload]
  );

  return (
    <StationAdminNetworkContext.Provider value={value}>
      {children}
    </StationAdminNetworkContext.Provider>
  );
}

export function useStationAdminNetwork() {
  const ctx = useContext(StationAdminNetworkContext);
  if (!ctx) {
    throw new Error("useStationAdminNetwork must be used within StationAdminNetworkProvider");
  }
  return ctx;
}
