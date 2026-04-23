import { getJson } from "./http";

export type UserAnalyticsPeriod = "today" | "7d" | "30d" | "all";

export type UserBookingPeriodPayload = {
  totalBookings: number;
  cntBooked: number;
  cntCompleted: number;
  cntMissed: number;
  cntCancelled: number;
  pctCompleted: number | null;
};

export type UserSmartInsights = {
  spendVsPrevMonthPct: number | null;
  currentMonthSpendUah: number;
  prevMonthSpendUah: number;
};

export type KpiVsPrevCalendarMonthPct = {
  sessionsPct: number | null;
  kwhPct: number | null;
  spentPct: number | null;
};

export type CalendarMonthKpisBlock = {
  current: { sessionCount: number; totalKwh: number; totalSpentUah: number };
  previous: { sessionCount: number; totalKwh: number; totalSpentUah: number };
};

export type PeriodSessionSummaryDetail = {
  avgKwhPerSession: number;
  avgRevenuePerSession: number;
  avgSessionDurationMinutes: number;
  topStation: { id: number; name: string; visitCount: number } | null;
};

export type VehicleSpendInPeriodRow = {
  vehicleId: number;
  licensePlate: string;
  carLabel: string;
  sessionCount: number;
  totalKwh: number;
  totalRevenue: number;
};

export type UserAnalyticsViewsResponse = {
  period: UserAnalyticsPeriod;
  /** `month` — SQL GetUserEnergySpendByMonth (період «Увесь час»); `day` — GetUserEnergySpendByDay (сьогодні / 7 / 30 днів). */
  trendGranularity?: "day" | "month";
  comparison: Record<string, unknown> | null;
  stationLoyalty: Record<string, unknown>[];
  activeSessions: Record<string, unknown>[];
  upcomingBookings: Record<string, unknown>[];
  periodSummary: { sessionCount: number; totalKwh: number; totalSpent: number };
  periodSessionDetail: PeriodSessionSummaryDetail;
  kpiVsPrevCalendarMonth: KpiVsPrevCalendarMonthPct;
  calendarMonthKpis: CalendarMonthKpisBlock;
  trend: { bucket: string; label: string; kwh: number; spend: number }[];
  stationsInPeriod: { stationId: number; stationName: string; sessionCount: number; kwh: number; spent: number }[];
  vehicleSpendInPeriod: VehicleSpendInPeriodRow[];
  bookingPeriod: UserBookingPeriodPayload | null;
  smartInsights: UserSmartInsights;
  partial: boolean;
};

/** GET /api/user/:userId/analytics/views?period=today|7d|30d|all */
export function fetchUserAnalyticsViews(userId: number, period: UserAnalyticsPeriod) {
  const p = new URLSearchParams({ period });
  return getJson<UserAnalyticsViewsResponse>(`/api/user/${userId}/analytics/views?${p.toString()}`);
}
