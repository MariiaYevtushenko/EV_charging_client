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
import type { StationDashboardDto, StationStatusCounts } from '../types/stationApi';
import type { Station, StationStatus } from '../types/station';
import {
  archiveStationApi,
  createStationApi,
  deleteStationApi,
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
const MAP_VIEWPORT_FETCH_LIMIT = 1000;

type StationsContextValue = {
  stations: Station[];
  mapStations: Station[];
  mapLoading: boolean;
  mapFetchLimit: number | null;
  registerMapViewportBounds: (bounds: {
    south: number;
    north: number;
    west: number;
    east: number;
  }) => void;
  
  stationDtos: StationDashboardDto[];
  mapStationDtos: StationDashboardDto[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  stationsPage: number;
  stationsTotal: number;
  stationsPageSize: number;

  stationStatusCounts: StationStatusCounts | null;
  setStationsPage: (page: number) => void;
  filteredStations: Station[];
  uniqueCities: string[];
  selectedCities: string[];
  setSelectedCities: Dispatch<SetStateAction<string[]>>;
  sortValue: string;
  setSortValue: (v: string) => void;
  /** Фільтр списку станцій за статусом (null — усі; пагінація на сервері). */
  stationListStatusFilter: StationStatus | null;
  setStationListStatusFilter: (status: StationStatus | null) => void;
  addStation: (station: Omit<Station, 'id'>) => Promise<Station>;
  updateStation: (id: string, patch: Partial<Station>) => Promise<void>;
  archiveStation: (id: string) => Promise<void>;
  unarchiveStation: (id: string) => Promise<void>;
  deleteStation: (id: string) => Promise<void>;
  getStation: (id: string) => Station | undefined;
};

const StationsContext = createContext<StationsContextValue | undefined>(undefined);

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
  const [sortValue, setSortValueState] = useState('name:asc');
  const [stationStatusCounts, setStationStatusCounts] = useState<StationStatusCounts | null>(null);
  const [stationListStatusFilter, setStationListStatusFilterState] = useState<StationStatus | null>(
    null
  );

  const setSortValue = useCallback((v: string) => {
    setSortValueState(v);
    setStationsPageState(1);
  }, []);

  const setStationListStatusFilter = useCallback((status: StationStatus | null) => {
    setStationListStatusFilterState(status);
    setStationsPageState(1);
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStationsPage(
        stationsPage,
        STATIONS_PAGE_SIZE,
        sortValue,
        stationListStatusFilter
      );
      setStationsTotal(res.total);
      setFilterCities(res.cities);
      setStationStatusCounts(res.statusCounts);
      const maxPage = Math.max(1, Math.ceil(res.total / res.pageSize) || 1);
      if (stationsPage > maxPage) {
        setStationsPageState(maxPage);
        return;
      }
      setStationDtos(res.items);
    } catch (e) {
      setStationDtos([]);
      setStationStatusCounts(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [stationsPage, sortValue, stationListStatusFilter]);

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
  
  const filteredStations = useMemo(() => {
    if (selectedCities.length === 0) return stations;
    return stations.filter((s) => selectedCities.includes(s.city));
  }, [stations, selectedCities]);

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

  const deleteStation = useCallback(
    async (id: string) => {
      const numericId = Number(id);
      if (!Number.isFinite(numericId)) return;
      setError(null);
      try {
        await deleteStationApi(numericId);
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
      stationStatusCounts,
      setStationsPage,
      filteredStations,
      uniqueCities,
      selectedCities,
      setSelectedCities,
      sortValue,
      setSortValue,
      stationListStatusFilter,
      setStationListStatusFilter,
      addStation,
      updateStation,
      archiveStation,
      unarchiveStation,
      deleteStation,
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
      stationStatusCounts,
      setStationsPage,
      filteredStations,
      uniqueCities,
      selectedCities,
      sortValue,
      stationListStatusFilter,
      setStationListStatusFilter,
      addStation,
      updateStation,
      archiveStation,
      unarchiveStation,
      deleteStation,
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
