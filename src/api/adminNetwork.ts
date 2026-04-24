import { getJson, postJson } from "./http";

// Період для списків глобальної адмінки
export type NetworkListPeriod = "today" | "7d" | "30d" | "all";

export type AdminNetworkBookingRow = {
  id: string;
  userId: string | null;
  userName: string;
  stationId: string;
  stationName: string;
  stationCity: string;
  stationCountry: string;
  portNumber: number;
  slotLabel: string;
  bookingType: "CALC" | "DEPOSIT";
  prepaymentAmount: number;
  status: "pending" | "confirmed" | "cancelled" | "paid" | "missed";
  start: string;
  end: string;
};

// Відповідь GET /api/admin/network/bookings 
export type AdminNetworkBookingsListResponse = {
  items: AdminNetworkBookingRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminNetworkBookingStatusCounts = Record<AdminNetworkBookingRow["status"], number>;

// Без аргументів 
export type FetchAdminNetworkBookingsParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: AdminNetworkBookingRow["status"];
  sort?: "start" | "userName" | "stationName" | "slot" | "status";
  order?: "asc" | "desc";
  period?: NetworkListPeriod;
};

function readPositivePageSize(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const ADMIN_NETWORK_BOOKINGS_BULK_PAGE_SIZE = readPositivePageSize(
  import.meta.env.VITE_ADMIN_NETWORK_BOOKINGS_BULK_PAGE_SIZE,
  2000
);

export type AdminBookingSessionSnippet = {
  id: string;
  status: "active" | "completed" | "failed";
  startedAt: string;
  endedAt: string | null;
  kwh: number;
  cost: number | null;
  portLabel: string;
  paymentMethod: string | null;
  paymentStatus: "success" | "pending" | "failed" | null;
};

export type AdminBookingDetailDto = {
  id: string;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  stationId: string;
  stationName: string;
  portNumber: number;
  slotLabel: string;
  status: AdminNetworkBookingRow["status"];
  start: string;
  end: string;
  bookingType: "CALC" | "DEPOSIT";
  prepaymentAmount: number;
  createdAt: string;
  vehicle: { id: string; plate: string; model: string } | null;
  sessions: AdminBookingSessionSnippet[];
};

export type AdminNetworkSessionRow = {
  id: string;
  userId: string | null;
  userName: string;
  stationId: string;
  stationName: string;
  stationCity: string;
  stationCountry: string;
  portLabel: string;
  status: "active" | "completed" | "failed";
  startedAt: string;
  endedAt: string | null;
  kwh: number;
  cost: number | null;
};

/** Відповідь GET /api/admin/network/sessions (пагінований список). */
export type AdminNetworkSessionsListResponse = {
  items: AdminNetworkSessionRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminNetworkSessionStatusCounts = Record<AdminNetworkSessionRow["status"], number>;

export type FetchAdminNetworkSessionsParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: AdminNetworkSessionRow["status"];
  sort?: "startedAt" | "userName" | "stationName" | "portLabel" | "kwh" | "status" | "cost";
  order?: "asc" | "desc";
  period?: NetworkListPeriod;
};

const ADMIN_NETWORK_SESSIONS_BULK_PAGE_SIZE = readPositivePageSize(
  import.meta.env.VITE_ADMIN_NETWORK_SESSIONS_BULK_PAGE_SIZE,
  5000
);

export function fetchAdminNetworkBookings(
  params?: FetchAdminNetworkBookingsParams
): Promise<AdminNetworkBookingsListResponse> {
  const sp = new URLSearchParams();
  if (params == null) {
    sp.set("page", "1");
    sp.set("pageSize", String(ADMIN_NETWORK_BOOKINGS_BULK_PAGE_SIZE));
  } else {
    if (params.page != null) sp.set("page", String(params.page));
    if (params.pageSize != null) sp.set("pageSize", String(params.pageSize));
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.sort) sp.set("sort", params.sort);
    if (params.order) sp.set("order", params.order);
    if (params.period) sp.set("period", params.period);
  }
  const qs = sp.toString();
  return getJson<AdminNetworkBookingsListResponse>(`/api/admin/network/bookings?${qs}`);
}

export function fetchAdminNetworkBookingStatusCounts(
  q?: string,
  period?: NetworkListPeriod
): Promise<AdminNetworkBookingStatusCounts> {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (period) sp.set("period", period);
  const qs = sp.toString();
  return getJson<AdminNetworkBookingStatusCounts>(
    `/api/admin/network/bookings/status-counts${qs ? `?${qs}` : ""}`
  );
}

export function fetchAdminNetworkBookingDetail(bookingId: string): Promise<AdminBookingDetailDto> {
  return getJson<AdminBookingDetailDto>(`/api/admin/network/bookings/${encodeURIComponent(bookingId)}`);
}

/** Скасувати бронювання (мережевий адмін API). */
export function postAdminNetworkBookingCancel(bookingId: string): Promise<AdminBookingDetailDto> {
  return postJson<AdminBookingDetailDto>(
    `/api/admin/network/bookings/${encodeURIComponent(bookingId)}/cancel`,
    {}
  );
}

export function fetchAdminNetworkSessions(
  params?: FetchAdminNetworkSessionsParams
): Promise<AdminNetworkSessionsListResponse> {
  const sp = new URLSearchParams();
  if (params == null) {
    sp.set("page", "1");
    sp.set("pageSize", String(ADMIN_NETWORK_SESSIONS_BULK_PAGE_SIZE));
  } else {
    if (params.page != null) sp.set("page", String(params.page));
    if (params.pageSize != null) sp.set("pageSize", String(params.pageSize));
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.sort) sp.set("sort", params.sort);
    if (params.order) sp.set("order", params.order);
    if (params.period) sp.set("period", params.period);
  }
  const qs = sp.toString();
  return getJson<AdminNetworkSessionsListResponse>(`/api/admin/network/sessions?${qs}`);
}

export function fetchAdminNetworkSessionStatusCounts(
  q?: string,
  period?: NetworkListPeriod
): Promise<AdminNetworkSessionStatusCounts> {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (period) sp.set("period", period);
  const qs = sp.toString();
  return getJson<AdminNetworkSessionStatusCounts>(
    `/api/admin/network/sessions/status-counts${qs ? `?${qs}` : ""}`
  );
}

export type AdminNetworkPaymentRow = {
  id: string;
  sessionId: string;
  amount: number;
  currency: string;
  method: string;
  status: "success" | "pending" | "failed";
  createdAt: string;
  paidAt: string | null;
  description: string;
  userId: string | null;
  userName: string;
};

/** Відповідь GET /api/admin/network/payments (пагінований список). */
export type AdminNetworkPaymentsListResponse = {
  items: AdminNetworkPaymentRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminNetworkPaymentStatusCounts = Record<AdminNetworkPaymentRow["status"], number>;

export type FetchAdminNetworkPaymentsParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: AdminNetworkPaymentRow["status"];
  sort?: "paidAt" | "userName" | "sessionId" | "method" | "amount" | "status";
  order?: "asc" | "desc";
  period?: NetworkListPeriod;
};

const ADMIN_NETWORK_PAYMENTS_BULK_PAGE_SIZE = 2000;

export function fetchAdminNetworkPayments(
  params?: FetchAdminNetworkPaymentsParams
): Promise<AdminNetworkPaymentsListResponse> {
  const sp = new URLSearchParams();
  if (params == null) {
    sp.set("page", "1");
    sp.set("pageSize", String(ADMIN_NETWORK_PAYMENTS_BULK_PAGE_SIZE));
  } else {
    if (params.page != null) sp.set("page", String(params.page));
    if (params.pageSize != null) sp.set("pageSize", String(params.pageSize));
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.sort) sp.set("sort", params.sort);
    if (params.order) sp.set("order", params.order);
    if (params.period) sp.set("period", params.period);
  }
  const qs = sp.toString();
  return getJson<AdminNetworkPaymentsListResponse>(`/api/admin/network/payments?${qs}`);
}

export function fetchAdminNetworkPaymentStatusCounts(
  q?: string,
  period?: NetworkListPeriod
): Promise<AdminNetworkPaymentStatusCounts> {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (period) sp.set("period", period);
  const qs = sp.toString();
  return getJson<AdminNetworkPaymentStatusCounts>(
    `/api/admin/network/payments/status-counts${qs ? `?${qs}` : ""}`
  );
}

export type AdminSessionDetailBillDto = {
  id: string;
  calculatedAmount: number;
  pricePerKwhAtTime: number | null;
  paymentMethod: string;
  paymentStatus: "success" | "pending" | "failed";
  paidAt: string | null;
  createdAt: string;
};

export type AdminSessionDetailDto = {
  id: string;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  stationId: string;
  stationName: string;
  portNumber: number;
  portLabel: string;
  status: AdminNetworkSessionRow["status"];
  startedAt: string;
  endedAt: string | null;
  kwh: number;
  vehicle: { id: string; plate: string; model: string } | null;
  booking: {
    id: string;
    status: AdminNetworkBookingRow["status"];
    bookingType: AdminNetworkBookingRow["bookingType"];
    prepaymentAmount: number;
    start: string;
    end: string;
  } | null;
  bill: AdminSessionDetailBillDto | null;
};

export function fetchAdminNetworkSessionDetail(sessionId: string): Promise<AdminSessionDetailDto> {
  return getJson<AdminSessionDetailDto>(`/api/admin/network/sessions/${encodeURIComponent(sessionId)}`);
}

/** Завершити активну сесію (мережевий адмін): COMPLETED + bill. */
export type CompleteAdminSessionBody = {
  kwhConsumed?: number;
};

export function postAdminNetworkSessionComplete(
  sessionId: string,
  body?: CompleteAdminSessionBody
): Promise<AdminSessionDetailDto> {
  return postJson<AdminSessionDetailDto>(
    `/api/admin/network/sessions/${encodeURIComponent(sessionId)}/complete`,
    body ?? {}
  );
}
