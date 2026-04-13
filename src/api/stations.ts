import type {
  PaginatedStationsResponse,
  StationDashboardDto,
  StationsMapResponse,
} from "../types/stationApi";
import type { StationStatus } from "../types/station";
import { deleteJson, getJson, patchJson, postJson, putJson } from "./http";

const DEFAULT_STATION_PAGE_SIZE = 50;

/** `sort` як у контексті: `name:asc`, `city:desc`, … — сортування на сервері по всій таблиці. */
export function fetchStationsPage(
  page: number,
  pageSize: number = DEFAULT_STATION_PAGE_SIZE,
  sort: string = "name:asc",
  /** Фільтр списку за статусом (узгоджено з `parseStationStatus` на сервері). */
  status?: StationStatus | null
): Promise<PaginatedStationsResponse> {
  const params = new URLSearchParams({
    page: String(Math.max(1, page)),
    pageSize: String(pageSize),
    sort,
  });
  if (status != null) {
    params.set("status", status);
  }
  return getJson<PaginatedStationsResponse>(`/api/stations?${params.toString()}`);
}

export type MapBoundsQuery = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  /** Якщо не передано — сервер за замовчуванням 2500, макс. 5000. Клієнт карти передає 1000. */
  limit?: number;
};

/** Станції лише у межах видимої області карти (не вся БД). */
export function fetchStationsMapBounds(q: MapBoundsQuery): Promise<StationsMapResponse> {
  const params = new URLSearchParams({
    minLat: String(q.minLat),
    maxLat: String(q.maxLat),
    minLng: String(q.minLng),
    maxLng: String(q.maxLng),
  });
  if (q.limit != null) params.set("limit", String(q.limit));
  return getJson<StationsMapResponse>(`/api/stations/map?${params.toString()}`);
}

export function fetchStationDashboard(
  stationId: number
): Promise<StationDashboardDto> {
  return getJson<StationDashboardDto>(
    `/api/stations/${stationId}/dashboard`
  );
}

export function createStationApi(
  body: Record<string, unknown>
): Promise<StationDashboardDto> {
  return postJson<StationDashboardDto>("/api/stations", body);
}

export function updateStationApi(
  stationId: number,
  body: Record<string, unknown>
): Promise<StationDashboardDto> {
  return putJson<StationDashboardDto>(`/api/stations/${stationId}`, body);
}

export function archiveStationApi(stationId: number): Promise<StationDashboardDto> {
  return postJson<StationDashboardDto>(`/api/stations/${stationId}/archive`, {});
}

export function unarchiveStationApi(stationId: number): Promise<StationDashboardDto> {
  return postJson<StationDashboardDto>(`/api/stations/${stationId}/unarchive`, {});
}

export function deleteStationApi(stationId: number): Promise<void> {
  return deleteJson(`/api/stations/${stationId}`);
}

function statusToApiPayload(status: StationStatus): string {
  switch (status) {
    case "working":
      return "working";
    case "offline":
      return "offline";
    case "maintenance":
      return "maintenance";
    case "archived":
      return "archived";
    default:
      return "working";
  }
}

export function patchStationStatusApi(
  stationId: number,
  status: StationStatus
): Promise<StationDashboardDto> {
  return patchJson<StationDashboardDto>(`/api/stations/${stationId}/status`, {
    status: statusToApiPayload(status),
  });
}
