import { getJson } from "./http";

export type UserAnalyticsPeriod = "7d" | "30d" | "all";

export type UserAnalyticsViewsResponse = {
  period: UserAnalyticsPeriod;
  comparison: Record<string, unknown> | null;
  vehicleStats: Record<string, unknown>[];
  stationLoyalty: Record<string, unknown>[];
  activeSessions: Record<string, unknown>[];
  upcomingBookings: Record<string, unknown>[];
  periodSummary: { sessionCount: number; totalKwh: number; totalSpent: number };
  previousPeriodSummary: { sessionCount: number; totalKwh: number; totalSpent: number } | null;
  trend: { bucket: string; label: string; kwh: number; spend: number }[];
  stationsInPeriod: { stationId: number; stationName: string; kwh: number; spent: number }[];
  partial: boolean;
};

/** GET /api/user/:userId/analytics/views?period=7d|30d|all */
export function fetchUserAnalyticsViews(userId: number, period: UserAnalyticsPeriod) {
  const p = new URLSearchParams({ period });
  return getJson<UserAnalyticsViewsResponse>(`/api/user/${userId}/analytics/views?${p.toString()}`);
}
