import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Station } from '../types/station';
import { INITIAL_STATIONS } from '../data/stationsMock';

export type StationSortKey = 'name' | 'city' | 'status' | 'todayRevenue' | 'todaySessions';
export type StationSortDir = 'asc' | 'desc';

type StationsContextValue = {
  stations: Station[];
  filteredStations: Station[];
  uniqueCities: string[];
  cityFilter: string;
  setCityFilter: (city: string) => void;
  sortKey: StationSortKey;
  setSortKey: (key: StationSortKey) => void;
  sortDir: StationSortDir;
  setSortDir: (dir: StationSortDir) => void;
  toggleSortDir: () => void;
  addStation: (station: Omit<Station, 'id'>) => Station;
  updateStation: (id: string, patch: Partial<Station>) => void;
  archiveStation: (id: string) => void;
  unarchiveStation: (id: string) => void;
  getStation: (id: string) => Station | undefined;
};

const StationsContext = createContext<StationsContextValue | undefined>(undefined);

function sortStations(list: Station[], sortKey: StationSortKey, sortDir: StationSortDir): Station[] {
  const next = [...list];
  const mul = sortDir === 'asc' ? 1 : -1;
  const statusOrder: Record<Station['status'], number> = {
    working: 0,
    maintenance: 1,
    offline: 2,
  };
  next.sort((a, b) => {
    switch (sortKey) {
      case 'name':
        return mul * a.name.localeCompare(b.name, 'uk');
      case 'city':
        return mul * a.city.localeCompare(b.city, 'uk');
      case 'status':
        return mul * (statusOrder[a.status] - statusOrder[b.status]);
      case 'todayRevenue':
        return mul * (a.todayRevenue - b.todayRevenue);
      case 'todaySessions':
        return mul * (a.todaySessions - b.todaySessions);
      default:
        return 0;
    }
  });
  return next;
}

export function StationsProvider({ children }: { children: ReactNode }) {
  const [stations, setStations] = useState<Station[]>(() => [...INITIAL_STATIONS]);
  const [cityFilter, setCityFilter] = useState('');
  const [sortKey, setSortKey] = useState<StationSortKey>('name');
  const [sortDir, setSortDir] = useState<StationSortDir>('asc');

  const uniqueCities = useMemo(() => {
    const set = new Set(stations.map((s) => s.city));
    return [...set].sort((a, b) => a.localeCompare(b, 'uk'));
  }, [stations]);

  const filteredStations = useMemo(() => {
    const base = cityFilter ? stations.filter((s) => s.city === cityFilter) : [...stations];
    return sortStations(base, sortKey, sortDir);
  }, [stations, cityFilter, sortKey, sortDir]);

  const addStation = useCallback((input: Omit<Station, 'id'>) => {
    const id = `st-${Date.now().toString(36)}`;
    const station: Station = { ...input, id };
    setStations((prev) => [...prev, station]);
    return station;
  }, []);

  const updateStation = useCallback((id: string, patch: Partial<Station>) => {
    setStations((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const archiveStation = useCallback((id: string) => {
    updateStation(id, { archived: true });
  }, [updateStation]);

  const unarchiveStation = useCallback((id: string) => {
    updateStation(id, { archived: false });
  }, [updateStation]);

  const getStation = useCallback(
    (id: string) => stations.find((s) => s.id === id),
    [stations]
  );

  const toggleSortDir = useCallback(() => {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  }, []);

  const value = useMemo(
    () => ({
      stations,
      filteredStations,
      uniqueCities,
      cityFilter,
      setCityFilter,
      sortKey,
      setSortKey,
      sortDir,
      setSortDir,
      toggleSortDir,
      addStation,
      updateStation,
      archiveStation,
      unarchiveStation,
      getStation,
    }),
    [
      stations,
      filteredStations,
      uniqueCities,
      cityFilter,
      sortKey,
      sortDir,
      toggleSortDir,
      addStation,
      updateStation,
      archiveStation,
      unarchiveStation,
      getStation,
    ]
  );

  return <StationsContext.Provider value={value}>{children}</StationsContext.Provider>;
}

export function useStations() {
  const ctx = useContext(StationsContext);
  if (!ctx) throw new Error('useStations must be used within StationsProvider');
  return ctx;
}
