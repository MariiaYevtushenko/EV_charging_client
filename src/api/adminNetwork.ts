import { getJson } from "./http";

export type AdminNetworkBookingRow = {
  id: string;
  userId: string | null;
  userName: string;
  stationId: string;
  stationName: string;
  slotLabel: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  start: string;
  end: string;
};

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
  portLabel: string;
  status: "active" | "completed" | "failed";
  startedAt: string;
  endedAt: string | null;
  kwh: number;
  cost: number | null;
};

export function fetchAdminNetworkBookings(): Promise<AdminNetworkBookingRow[]> {
  return getJson<AdminNetworkBookingRow[]>("/api/admin/network/bookings");
}

export function fetchAdminNetworkBookingDetail(bookingId: string): Promise<AdminBookingDetailDto> {
  return getJson<AdminBookingDetailDto>(`/api/admin/network/bookings/${encodeURIComponent(bookingId)}`);
}

export function fetchAdminNetworkSessions(): Promise<AdminNetworkSessionRow[]> {
  return getJson<AdminNetworkSessionRow[]>("/api/admin/network/sessions");
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
    start: string;
    end: string;
  } | null;
  bill: AdminSessionDetailBillDto | null;
};

export function fetchAdminNetworkSessionDetail(sessionId: string): Promise<AdminSessionDetailDto> {
  return getJson<AdminSessionDetailDto>(`/api/admin/network/sessions/${encodeURIComponent(sessionId)}`);
}
