import { getJson } from "./http";

/** Відповідь GET /api/admin/analytics/views — дані з SQL VIEW (View.sql). */
export type AdminAnalyticsViewsResponse = {
  globalDashboard: Record<string, unknown> | null;
  stationPerformance: Record<string, unknown>[];
  userAnalyticsComparison: Record<string, unknown>[];
  userVehicleStats: Record<string, unknown>[];
  userStationLoyalty: Record<string, unknown>[];
  cityPerformance: Record<string, unknown>[];
  userSegments: Record<string, unknown>[];
  activeSessions: Record<string, unknown>[];
  upcomingBookings: Record<string, unknown>[];
  partial: boolean;
};

export function fetchAdminAnalyticsViews(): Promise<AdminAnalyticsViewsResponse> {
  return getJson<AdminAnalyticsViewsResponse>("/api/admin/analytics/views");
}

export function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function str(v: unknown): string {
  return v == null ? "" : String(v);
}
