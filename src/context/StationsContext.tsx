import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { StationDashboardDto } from '../types/stationApi';
import type { Station } from '../types/station';
import { parseStationSortValue } from '../features/station-list/stationSortOptions';
import {
  archiveStationApi,
  createStationApi,
  fetchStationsMapBounds,
  fetchStationsPage,
  patchStationStatusApi,
  unarchiveStationApi,
  updateStationApi,
} from '../api/stations';
import { stationFromDashboardDto } from '../utils/stationFromDashboardDto';
import { stationToCreateBody, stationToUpdateBody } from '../utils/stationApiPayload';

export type StationSortKey = 'name' | 'city' | 'status' | 'todayRevenue' | 'todaySessions';
export type StationSortDir = 'asc' | 'desc';

const STATIONS_PAGE_SIZE = 50;
/** Запит bbox-карти: 1000 станцій за раз (сервер без параметра — 2500, макс. 5000). */
const MAP_VIEWPORT_FETCH_LIMIT = 1000;

type StationsContextValue = {
  stations: Station[];
  /** Станції у поточній видимій області карти (bbox-запит, не вся БД). */
  mapStations: Station[];
  mapLoading: boolean;
  /** Останній ліміт від сервера для карти (обрізання при сильному віддаленні). */
  mapFetchLimit: number | null;
  /** Викликати з Leaflet при зміні видимої області (debounce всередині контексту). */
  registerMapViewportBounds: (bounds: {
    south: number;
    north: number;
    west: number;
    east: number;
  }) => void;
  /** Сирі DTO поточної сторінки (сортування у списку station-dashboard). */
  stationDtos: StationDashboardDto[];
  /** DTO для маркерів у поточному bbox. */
  mapStationDtos: StationDashboardDto[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  stationsPage: number;
  stationsTotal: number;
  stationsPageSize: number;
  setStationsPage: (page: number) => void;
  filteredStations: Station[];
  /** Міста з усіх станцій у БД (для фільтра), не лише поточна сторінка. */
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
  const [stationDtos, setStationDtos] = useState<StationDashboardDto[]>([]);
  const [mapStationDtos, setMapStationDtos] = useState<StationDashboardDto[]>([]);
  const [mapFetchLimit, setMapFetchLimit] = useState<number | null>(null);
  const [stationsPage, setStationsPageState] = useState(1);
  const [stationsTotal, setStationsTotal] = useState(0);
  const [filterCities, setFilterCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastBoundsRef = useRef<{
    south: number;
    north: number;
    west: number;
    east: number;
  } | null>(null);
  const mapBoundsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [sortValue, setSortValue] = useState('name:asc');

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStationsPage(stationsPage, STATIONS_PAGE_SIZE);
      setStationsTotal(res.total);
      setFilterCities(res.cities);
      const maxPage = Math.max(1, Math.ceil(res.total / res.pageSize) || 1);
      if (stationsPage > maxPage) {
        setStationsPageState(maxPage);
        return;
      }
      setStationDtos(res.items);
    } catch (e) {
      setStationDtos([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [stationsPage]);

  const loadMapBounds = useCallback(
    async (bounds: { south: number; north: number; west: number; east: number }) => {
      setMapLoading(true);
      try {
        const res = await fetchStationsMapBounds({
          minLat: bounds.south,
          maxLat: bounds.north,
          minLng: bounds.west,
          maxLng: bounds.east,
          limit: MAP_VIEWPORT_FETCH_LIMIT,
        });
        setMapStationDtos(res.items);
        setMapFetchLimit(typeof res.limit === 'number' ? res.limit : null);
      } catch {
        setMapStationDtos([]);
        setMapFetchLimit(null);
      } finally {
        setMapLoading(false);
      }
    },
    []
  );

  const registerMapViewportBounds = useCallback(
    (bounds: { south: number; north: number; west: number; east: number }) => {
      lastBoundsRef.current = bounds;
      if (mapBoundsDebounceRef.current) clearTimeout(mapBoundsDebounceRef.current);
      mapBoundsDebounceRef.current = setTimeout(() => {
        void loadMapBounds(bounds);
      }, 400);
    },
    [loadMapBounds]
  );

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const setStationsPage = useCallback((page: number) => {
    setStationsPageState(Math.max(1, page));
  }, []);

  const reload = useCallback(async () => {
    await loadPage();
    if (lastBoundsRef.current) {
      await loadMapBounds(lastBoundsRef.current);
    }
  }, [loadPage, loadMapBounds]);

  const stations = useMemo(
    () => stationDtos.map(stationFromDashboardDto),
    [stationDtos]
  );

  const mapStations = useMemo(
    () => mapStationDtos.map(stationFromDashboardDto),
    [mapStationDtos]
  );

  const uniqueCities = filterCities;

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
      await reload();
      return station;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    }
  }, [reload]);

  const updateStation = useCallback(
    async (id: string, patch: Partial<Station>) => {
      const cur = stations.find((s) => s.id === id) ?? mapStations.find((s) => s.id === id);
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
          await patchStationStatusApi(numericId, patch.status!);
        } else {
          await updateStationApi(numericId, stationToUpdateBody(merged));
        }
        await reload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      }
    },
    [stations, mapStations, reload]
  );

  const archiveStation = useCallback(
    async (id: string) => {
      const numericId = Number(id);
      if (!Number.isFinite(numericId)) return;
      setError(null);
      try {
        await archiveStationApi(numericId);
        await reload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      }
    },
    [reload]
  );

  const unarchiveStation = useCallback(
    async (id: string) => {
      const numericId = Number(id);
      if (!Number.isFinite(numericId)) return;
      setError(null);
      try {
        await unarchiveStationApi(numericId);
        await reload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      }
    },
    [reload]
  );

  const getStation = useCallback(
    (id: string) =>
      stations.find((s) => s.id === id) ?? mapStations.find((s) => s.id === id),
    [stations, mapStations]
  );

  const value = useMemo(
    () => ({
      stations,
      mapStations,
      mapLoading,
      mapFetchLimit,
      registerMapViewportBounds,
      stationDtos,
      mapStationDtos,
      loading,
      error,
      reload,
      stationsPage,
      stationsTotal,
      stationsPageSize: STATIONS_PAGE_SIZE,
      setStationsPage,
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
      mapStations,
      mapLoading,
      mapFetchLimit,
      registerMapViewportBounds,
      stationDtos,
      mapStationDtos,
      loading,
      error,
      reload,
      stationsPage,
      stationsTotal,
      setStationsPage,
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
