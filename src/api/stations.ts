import type { StationDashboardDto } from "../types/stationApi";
import type { StationStatus } from "../types/station";
import { getJson, patchJson, postJson, putJson } from "./http";

export function fetchStationsList(): Promise<StationDashboardDto[]> {
  return getJson<StationDashboardDto[]>("/api/stations");
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
