import { getJson } from "./http";

export type StationAdminAnalyticsPeriod = "today" | "7d" | "30d" | "all";

/** Деталізація з `Station_admin_analytics.sql` для однієї станції (якщо передано `stationId` у запит). */
export type StationAdminStationDetail = {
  sessionStats: Record<string, unknown> | null;
  bookingStats: Record<string, unknown> | null;
  utilization: Record<string, unknown> | null;
  ports: Record<string, unknown>[];
  connectors: Record<string, unknown>[];
  peakHours: Record<string, unknown>[];
};

export type StationAdminSnapshot = {
  period: StationAdminAnalyticsPeriod;
  periodDays: number | null;
  periodFrom: string;
  periodTo: string;
  partial: boolean;
  networkBookingKpis: Record<string, unknown> | null;
  networkTopStations: Record<string, unknown>[];
  networkBottomStations: Record<string, unknown>[];
  stationId: number | null;
  stationDetail: StationAdminStationDetail | null;
};

/** Зріз з `Global_admin_analytics.sql` (мережа за останні 30 днів). */
export type GlobalAdminSnapshot = {
  periodDays: number;
  periodFrom: string;
  periodTo: string;
  partial: boolean;
  networkSessionStats: Record<string, unknown> | null;
  networkRevenueByStation: Record<string, unknown>[];
  networkRevenueByPort: Record<string, unknown>[];
  networkPeakHours: Record<string, unknown>[];
  networkRevenueTrendDaily: Record<string, unknown>[];
  networkDayNightRevenue: Record<string, unknown>[];
  networkCityHotspots: Record<string, unknown>[];
  networkBookingSessionMetrics: Record<string, unknown> | null;
};

/** Відповідь GET /api/admin/analytics/views — дані з SQL VIEW (View.sql) + зріз адміна станцій. */
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
  stationAdminSnapshot: StationAdminSnapshot;
  globalAdminSnapshot: GlobalAdminSnapshot;
  partial: boolean;
};

/** `stationId` — опційно; додається деталізація по станції (функції з Station_admin_analytics.sql). `period` — як у кабінеті користувача. */
export function fetchAdminAnalyticsViews(
  stationId?: number,
  period?: StationAdminAnalyticsPeriod
): Promise<AdminAnalyticsViewsResponse> {
  const params = new URLSearchParams();
  if (stationId != null && Number.isFinite(stationId) && stationId > 0) {
    params.set("stationId", String(Math.floor(stationId)));
  }
  if (period === "today" || period === "7d" || period === "30d" || period === "all") {
    params.set("period", period);
  }
  const q = params.toString();
  return getJson<AdminAnalyticsViewsResponse>(`/api/admin/analytics/views${q ? `?${q}` : ""}`);
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
