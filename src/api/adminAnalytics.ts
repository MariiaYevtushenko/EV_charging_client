import { getJson } from "./http";

export type StationAdminAnalyticsPeriod = "today" | "7d" | "30d" | "all";

export type StationOverviewCounts = {
  total: number;
  work: number;
  notWorking: number;
  fix: number;
  archived: number;
};

export type PaginatedViewBlock = {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
};

export type StationAdminPeakBlock = {
  stationId: number;
  period: StationAdminAnalyticsPeriod;
  periodFrom: string;
  periodTo: string;
  buckets: Record<string, unknown>[];
};

/** Деталізація з `Station_admin_analytics.sql` для однієї станції (якщо передано `stationId` у запит). */
export type StationAdminStationDetail = {
  sessionStats: Record<string, unknown> | null;
  bookingStats: Record<string, unknown> | null;
  utilization: Record<string, unknown> | null;
  connectors: Record<string, unknown>[];
  peakHours: Record<string, unknown>[];
};

export type StationAdminSnapshot = {
  period: StationAdminAnalyticsPeriod;
  periodDays: number | null;
  periodFrom: string;
  periodTo: string;
  topPeriod: StationAdminAnalyticsPeriod;
  topPeriodFrom: string;
  topPeriodTo: string;
  fewestPeriod: StationAdminAnalyticsPeriod;
  fewestPeriodFrom: string;
  fewestPeriodTo: string;
  partial: boolean;
  overview: StationOverviewCounts | null;
  networkBookingKpis: Record<string, unknown> | null;
  networkMonthComparison: Record<string, unknown> | null;
  networkTopStations: Record<string, unknown>[];
  networkBottomStations: Record<string, unknown>[];
  sessionStatsViewPage: PaginatedViewBlock;
  portStatsViewPage: PaginatedViewBlock;
  peakForStation: StationAdminPeakBlock | null;
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
  networkRevenueTrendDaily: Record<string, unknown>[];
  networkSessionStatsByBookingKind: Record<string, unknown>[];
  networkPortTypeStats: Record<string, unknown>[];
  networkTopCountries: Record<string, unknown>[];
};

/** Відповідь GET /api/admin/analytics/views — дані з SQL VIEW (View.sql) + зріз адміна станцій. */
export type AdminAnalyticsViewsResponse = {
  globalDashboard: Record<string, unknown> | null;
  stationPerformance: Record<string, unknown>[];
  userAnalyticsComparison: Record<string, unknown>[];
  userStationLoyalty: Record<string, unknown>[];
  cityPerformance: Record<string, unknown>[];
  userSegments: Record<string, unknown>[];
  activeSessions: Record<string, unknown>[];
  upcomingBookings: Record<string, unknown>[];
  /** VIEW View_Admin_SessionStatisticByPortType_30 — сесії/kWh/грн по типу конектора, 30 днів, уся мережа. */
  sessionStatsByPortType30d: Record<string, unknown>[];
  stationAdminSnapshot: StationAdminSnapshot;
  globalAdminSnapshot: GlobalAdminSnapshot;
  partial: boolean;
};

export type FetchAdminAnalyticsViewsOptions = {
  stationId?: number;
  period?: StationAdminAnalyticsPeriod;
  topPeriod?: StationAdminAnalyticsPeriod;
  fewestPeriod?: StationAdminAnalyticsPeriod;
  sessionStatsPage?: number;
  sessionStatsPageSize?: number;
  portStatsPage?: number;
  portStatsPageSize?: number;
  peakStationId?: number;
  peakPeriod?: StationAdminAnalyticsPeriod;
  /** Днів для зрізу global admin (Global_admin_analytics.sql), 1–365. */
  globalPeriodDays?: number;
};

/** GET /api/admin/analytics/views — опційні query-параметри для зрізу адміна станцій. */
export function fetchAdminAnalyticsViews(opts?: FetchAdminAnalyticsViewsOptions): Promise<AdminAnalyticsViewsResponse> {
  const params = new URLSearchParams();
  if (opts?.stationId != null && Number.isFinite(opts.stationId) && opts.stationId > 0) {
    params.set("stationId", String(Math.floor(opts.stationId)));
  }
  const setPeriod = (key: string, v: StationAdminAnalyticsPeriod | undefined) => {
    if (v === "today" || v === "7d" || v === "30d" || v === "all") params.set(key, v);
  };
  setPeriod("period", opts?.period);
  setPeriod("topPeriod", opts?.topPeriod);
  setPeriod("fewestPeriod", opts?.fewestPeriod);
  setPeriod("peakPeriod", opts?.peakPeriod);
  if (opts?.sessionStatsPage != null && opts.sessionStatsPage > 0) {
    params.set("sessionStatsPage", String(Math.floor(opts.sessionStatsPage)));
  }
  if (opts?.sessionStatsPageSize != null && opts.sessionStatsPageSize > 0) {
    params.set("sessionStatsPageSize", String(Math.floor(opts.sessionStatsPageSize)));
  }
  if (opts?.portStatsPage != null && opts.portStatsPage > 0) {
    params.set("portStatsPage", String(Math.floor(opts.portStatsPage)));
  }
  if (opts?.portStatsPageSize != null && opts.portStatsPageSize > 0) {
    params.set("portStatsPageSize", String(Math.floor(opts.portStatsPageSize)));
  }
  if (opts?.peakStationId != null && Number.isFinite(opts.peakStationId) && opts.peakStationId > 0) {
    params.set("peakStationId", String(Math.floor(opts.peakStationId)));
  }
  if (opts?.globalPeriodDays != null && Number.isFinite(opts.globalPeriodDays) && opts.globalPeriodDays > 0) {
    params.set("globalPeriodDays", String(Math.min(365, Math.max(1, Math.floor(opts.globalPeriodDays)))));
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
