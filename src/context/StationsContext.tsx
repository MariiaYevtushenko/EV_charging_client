import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { Station } from '../types/station';
import { parseStationSortValue } from '../features/station-list/stationSortOptions';
import {
  archiveStationApi,
  createStationApi,
  patchStationStatusApi,
  fetchStationsList,
  unarchiveStationApi,
  updateStationApi,
} from '../api/stations';
import { stationFromDashboardDto } from '../utils/stationFromDashboardDto';
import { stationToCreateBody, stationToUpdateBody } from '../utils/stationApiPayload';

export type StationSortKey = 'name' | 'city' | 'status' | 'todayRevenue' | 'todaySessions';
export type StationSortDir = 'asc' | 'desc';

type StationsContextValue = {
  stations: Station[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  filteredStations: Station[];
  uniqueCities: string[];
  /** Порожній масив — показати всі міста. */
  selectedCities: string[];
  setSelectedCities: Dispatch<SetStateAction<string[]>>;
  /** Одне поле: критерій і напрямок, напр. `name:asc`. */
  sortValue: string;
  setSortValue: (v: string) => void;
  addStation: (station: Omit<Station, 'id'>) => Promise<Station>;
  updateStation: (id: string, patch: Partial<Station>) => Promise<void>;
  archiveStation: (id: string) => Promise<void>;
  unarchiveStation: (id: string) => Promise<void>;
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
    archived: 3,
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
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [sortValue, setSortValue] = useState('name:asc');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchStationsList();
      setStations(rows.map(stationFromDashboardDto));
    } catch (e) {
      setStations([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const uniqueCities = useMemo(() => {
    const set = new Set(stations.map((s) => s.city));
    return [...set].sort((a, b) => a.localeCompare(b, 'uk'));
  }, [stations]);

  const { key: sortKey, dir: sortDir } = useMemo(() => parseStationSortValue(sortValue), [sortValue]);

  const filteredStations = useMemo(() => {
    const base =
      selectedCities.length === 0
        ? [...stations]
        : stations.filter((s) => selectedCities.includes(s.city));
    return sortStations(base, sortKey, sortDir);
  }, [stations, selectedCities, sortKey, sortDir]);

  const addStation = useCallback(async (input: Omit<Station, 'id'>): Promise<Station> => {
    setError(null);
    try {
      const dto = await createStationApi(stationToCreateBody(input));
      const station = stationFromDashboardDto(dto);
      setStations((prev) => [...prev, station]);
      return station;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    }
  }, []);

  const updateStation = useCallback(
    async (id: string, patch: Partial<Station>) => {
      const cur = stations.find((s) => s.id === id);
      if (!cur) return;
      setError(null);
      try {
        const merged: Station = { ...cur, ...patch };
        const numericId = Number(id);
        if (!Number.isFinite(numericId)) {
          setError('Некоректний ідентифікатор станції');
          return;
        }

        const keys = Object.keys(patch);
        const onlyStatus =
          keys.length === 1 &&
          keys[0] === 'status' &&
          patch.status !== undefined &&
          !merged.archived;

        if (onlyStatus) {
          const dto = await patchStationStatusApi(numericId, patch.status!);
          const updated = stationFromDashboardDto(dto);
          setStations((prev) => prev.map((s) => (s.id === id ? updated : s)));
          return;
        }

        const dto = await updateStationApi(numericId, stationToUpdateBody(merged));
        const updated = stationFromDashboardDto(dto);
        setStations((prev) => prev.map((s) => (s.id === id ? updated : s)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      }
    },
    [stations]
  );

  const archiveStation = useCallback(async (id: string) => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return;
    setError(null);
    try {
      const dto = await archiveStationApi(numericId);
      const updated = stationFromDashboardDto(dto);
      setStations((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    }
  }, []);

  const unarchiveStation = useCallback(async (id: string) => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return;
    setError(null);
    try {
      const dto = await unarchiveStationApi(numericId);
      const updated = stationFromDashboardDto(dto);
      setStations((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    }
  }, []);

  const getStation = useCallback(
    (id: string) => stations.find((s) => s.id === id),
    [stations]
  );

  const value = useMemo(
    () => ({
      stations,
      loading,
      error,
      reload,
      filteredStations,
      uniqueCities,
      selectedCities,
      setSelectedCities,
      sortValue,
      setSortValue,
      addStation,
      updateStation,
      archiveStation,
      unarchiveStation,
      getStation,
    }),
    [
      stations,
      loading,
      error,
      reload,
      filteredStations,
      uniqueCities,
      selectedCities,
      sortValue,
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
