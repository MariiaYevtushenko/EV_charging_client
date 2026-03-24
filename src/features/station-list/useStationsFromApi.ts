import { useCallback, useEffect, useState } from "react";
import { fetchStationsList } from "../../api/stations";
import type { StationDashboardDto } from "../../types/stationApi";

export function useStationsFromApi() {
  const [stations, setStations] = useState<StationDashboardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStationsList();
      setStations(data);
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

  return { stations, loading, error, reload };
}
