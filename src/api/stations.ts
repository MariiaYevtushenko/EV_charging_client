import type {
  AvailableBookingSlotsResponse,
  PaginatedStationsResponse,
  StationDashboardDto,
  StationEnergyAnalyticsDto,
  StationEnergyPeriod,
  StationUpcomingBookingsResponse,
  StationsMapResponse,
} from "../types/stationApi";
import type { StationStatus } from "../types/station";
import { DEFAULT_STATION_PAGE_SIZE } from "../constants/adminUi";
import { deleteJson, getJson, patchJson, postJson, putJson } from "./http";

export function fetchStationsPage(
  page: number,
  pageSize: number = DEFAULT_STATION_PAGE_SIZE,
  sort: string = "name:asc",
  status?: StationStatus | null,
  search?: string | null
): Promise<PaginatedStationsResponse> {
  const params = new URLSearchParams({
    page: String(Math.max(1, page)),
    pageSize: String(pageSize),
    sort,
  });
  if (status != null) {
    params.set("status", status);
  }
  const s = search?.trim();
  if (s) {
    params.set("q", s);
  }
  return getJson<PaginatedStationsResponse>(`/api/stations?${params.toString()}`);
}

export type MapBoundsQuery = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  limit?: number;
};

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

export function fetchStationUpcomingBookings(
  stationId: number
): Promise<StationUpcomingBookingsResponse> {
  return getJson<StationUpcomingBookingsResponse>(
    `/api/stations/${stationId}/upcoming-bookings`
  );
}

/** Вільні інтервали на порту за днем (функція БД GetAvailableBookingSlots). */
export function fetchStationAvailableBookingSlots(
  stationId: number,
  query: { portNumber: number; date: string; slotMinutes: number; durationMinutes: number }
): Promise<AvailableBookingSlotsResponse> {
  const params = new URLSearchParams({
    portNumber: String(query.portNumber),
    date: query.date,
    slotMinutes: String(query.slotMinutes),
    durationMinutes: String(query.durationMinutes),
  });
  return getJson<AvailableBookingSlotsResponse>(
    `/api/stations/${stationId}/available-booking-slots?${params.toString()}`
  );
}

export function fetchStationEnergyAnalytics(
  stationId: number,
  period: StationEnergyPeriod
): Promise<StationEnergyAnalyticsDto> {
  const params = new URLSearchParams({ period });
  return getJson<StationEnergyAnalyticsDto>(
    `/api/stations/${stationId}/analytics-energy?${params.toString()}`
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
