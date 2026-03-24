import type { StationDashboardDto } from "../types/stationApi";
import { getJson } from "./http";

export function fetchStationsList(): Promise<StationDashboardDto[]> {
  return getJson<StationDashboardDto[]>("/api/stations");
}
