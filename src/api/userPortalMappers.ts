import type {
  UserBooking,
  UserBookingPricingModel,
  UserBookingStatus,
  UserPaymentRow,
  UserSessionRecord,
} from '../types/userPortal';

/** Відповідь GET /api/user/:userId/sessions (Prisma session + port.station + bill). */
export type UserSessionApiRow = {
  id: number;
  stationId: number;
  portNumber: number;
  vehicleId?: number | null;
  bookingId?: number | null;
  startTime: string;
  endTime: string | null;
  kwhConsumed: number | string | { toString(): string };
  bill?: {
    id: number;
    calculatedAmount: number | string | { toString(): string };
  } | null;
  port?: {
    station?: {
      name?: string;
    };
  };
};

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (v != null && typeof v === 'object' && 'toString' in v) {
    const n = Number(String((v as { toString(): string }).toString()));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function mapUserSessionApiToRecord(row: UserSessionApiRow): UserSessionRecord {
  const start = new Date(row.startTime);
  const end = row.endTime ? new Date(row.endTime) : null;
  const durationMs = end && !Number.isNaN(end.getTime()) ? end.getTime() - start.getTime() : 0;
  const durationMin = Math.max(0, Math.round(durationMs / 60000));
  const stationName = row.port?.station?.name?.trim() || `Станція #${row.stationId}`;
  const kwh = num(row.kwhConsumed);
  const cost = num(row.bill?.calculatedAmount);
  const startedAt = Number.isNaN(start.getTime()) ? row.startTime : start.toISOString();
  const endedAt =
    end && !Number.isNaN(end.getTime()) ? end.toISOString() : row.endTime ? String(row.endTime) : '';

  const bookingId =
    row.bookingId != null && Number.isFinite(Number(row.bookingId)) ? String(row.bookingId) : undefined;
  const billId =
    row.bill != null && row.bill.id != null ? String(row.bill.id) : undefined;
  const vehicleId =
    row.vehicleId != null && Number.isFinite(Number(row.vehicleId)) ? String(row.vehicleId) : undefined;

  return {
    id: String(row.id),
    stationId: String(row.stationId),
    stationName,
    portLabel: `Порт ${row.portNumber}`,
    startedAt,
    endedAt,
    durationMin,
    kwh: Math.round(kwh * 1000) / 1000,
    cost: Math.round(cost * 100) / 100,
    vehicleId,
    bookingId,
    billId,
  };
}

/** Відповідь GET /api/user/:userId/payments (bill + session.station). */
export type UserBillApiRow = {
  id: number;
  sessionId: number;
  calculatedAmount: number | string | { toString(): string };
  pricePerKwhAtTime?: number | string | { toString(): string } | null;
  paymentMethod?: string | null;
  paymentStatus: string;
  createdAt: string;
  paidAt?: string | Date | null;
  session?: {
    id: number;
    stationId: number;
    kwhConsumed?: number | string | { toString(): string };
    booking?: {
      id: number;
      bookingType?: string;
      prepaymentAmount?: number | string | { toString(): string };
    } | null;
    vehicle?: {
      brand?: string;
      vehicleModel?: string;
      licensePlate?: string;
    } | null;
    port?: {
      station?: {
        name?: string;
      };
    };
  } | null;
};

export function mapBillApiToPaymentRow(b: UserBillApiRow): UserPaymentRow {
  const st =
    b.paymentStatus === 'SUCCESS'
      ? 'success'
      : b.paymentStatus === 'FAILED'
        ? 'failed'
        : 'pending';
  const stationName = b.session?.port?.station?.name?.trim();
  const kwh = b.session != null ? num(b.session.kwhConsumed) : 0;
  const v = b.session?.vehicle;
  const brandModel =
    v != null ? `${v.brand?.trim() ?? ''} ${v.vehicleModel?.trim() ?? ''}`.trim() : '';
  const vehicleLabel = brandModel || (v?.licensePlate?.trim() ?? '') || undefined;
  const vehiclePlate = v?.licensePlate?.trim() || undefined;
  const desc =
    stationName != null && stationName !== ''
      ? `Зарядка · ${stationName}`
      : `Оплата за сесію #${b.sessionId}`;
  const booking = b.session?.booking;
  const pricePk = b.pricePerKwhAtTime != null ? num(b.pricePerKwhAtTime) : undefined;
  const prepay =
    booking != null && booking.prepaymentAmount != null ? num(booking.prepaymentAmount) : undefined;
  const bookingType =
    booking?.bookingType === 'DEPOSIT'
      ? ('DEPOSIT' as const)
      : booking?.bookingType === 'CALC'
        ? ('CALC' as const)
        : undefined;
  let paidAtIso: string | null = null;
  if (b.paidAt != null) {
    if (typeof b.paidAt === 'string') {
      paidAtIso = b.paidAt;
    } else if (b.paidAt instanceof Date) {
      paidAtIso = b.paidAt.toISOString();
    } else {
      paidAtIso = String(b.paidAt);
    }
  }
  return {
    id: String(b.id),
    createdAt: typeof b.createdAt === 'string' ? b.createdAt : String(b.createdAt),
    paidAt: paidAtIso,
    amount: num(b.calculatedAmount),
    method: b.paymentMethod != null && String(b.paymentMethod).trim() !== '' ? String(b.paymentMethod) : '',
    description: desc,
    status: st,
    stationName: stationName || undefined,
    energyKwh: kwh > 0 ? Math.round(kwh * 1000) / 1000 : undefined,
    pricePerKwhAtTime:
      pricePk != null && Number.isFinite(pricePk) && pricePk > 0 ? Math.round(pricePk * 10000) / 10000 : undefined,
    sessionId: b.session != null ? String(b.session.id) : String(b.sessionId),
    vehicleLabel,
    vehiclePlate,
    bookingId:
      booking != null && booking.id != null && Number.isFinite(Number(booking.id))
        ? String(booking.id)
        : undefined,
    bookingType,
    prepaymentAmount: prepay !== undefined && Number.isFinite(prepay) ? prepay : undefined,
  };
}

/** Відповідь GET /api/user/:userId/bookings (booking + port.station). */
export type UserBookingApiRow = {
  id: number;
  stationId: number;
  portNumber: number;
  startTime: string;
  endTime: string;
  status: string;
  bookingType: string;
  prepaymentAmount: number | string | { toString(): string };
  port?: {
    station?: { name?: string };
    connectorType?: { name?: string } | null;
  } | null;
};

function mapDbStatusToUi(dbStatus: string, startMs: number, endMs: number): UserBookingStatus {
  const now = Date.now();
  if (dbStatus === 'CANCELLED') return 'cancelled';
  if (dbStatus === 'MISSED' || dbStatus === 'NO_ACTION') return 'missed';
  if (dbStatus === 'COMPLETED') return 'completed';
  if (dbStatus === 'BOOKED') {
    if (endMs <= now) return 'completed';
    if (startMs <= now && endMs > now) return 'active';
    return 'upcoming';
  }
  if (endMs <= now) return 'completed';
  if (startMs <= now && endMs > now) return 'active';
  return 'upcoming';
}

export function mapBookingApiToUserBooking(row: UserBookingApiRow): UserBooking {
  const start = new Date(row.startTime);
  const end = new Date(row.endTime);
  const startMs = start.getTime();
  const endMs = end.getTime();
  const pricingModel: UserBookingPricingModel =
    row.bookingType === 'DEPOSIT' ? 'reservation_fee' : 'dynamic_prepay';
  const conn = row.port?.connectorType?.name?.trim();
  const slotLabel = conn ? `${conn} · порт ${row.portNumber}` : `Порт ${row.portNumber}`;
  const stationName = row.port?.station?.name?.trim() ?? `Станція #${row.stationId}`;

  return {
    id: String(row.id),
    stationId: String(row.stationId),
    stationName,
    slotLabel,
    start: Number.isNaN(startMs) ? String(row.startTime) : start.toISOString(),
    end: Number.isNaN(endMs) ? String(row.endTime) : end.toISOString(),
    status: mapDbStatusToUi(row.status, startMs, endMs),
    durationMin: Math.max(0, Math.round((endMs - startMs) / 60000)),
    pricingModel,
    payNowAmount: num(row.prepaymentAmount),
  };
}
