export interface UserCar {
  id: string;
  plate: string;
  brand: string;
  vehicleModel: string;
  model: string;
  batteryCapacity?: number;
  connector: string;
  imageUrl?: string;
}


export type UserSessionUiStatus = 'active' | 'completed' | 'failed';

export interface UserSessionRecord {
  id: string;
  stationId: string;
  stationName: string;
  portLabel: string;
  startedAt: string;
  endedAt: string;
  durationMin: number;
  kwh: number;
  cost: number;
  status: UserSessionUiStatus;
  vehicleId?: string;
  bookingId?: string;
  billId?: string;
}

export type UserBookingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled' | 'missed';

export type UserBookingPricingModel = 'reservation_fee' | 'dynamic_prepay';

export interface UserBooking {
  id: string;
  stationId: string;
  stationName: string;
  slotLabel: string;
  start: string;
  end: string;
  status: UserBookingStatus;
  durationMin?: number;
  pricingModel?: UserBookingPricingModel;
  payNowAmount?: number;
}

export interface UserPaymentRow {
  id: string;
  createdAt: string;
  paidAt: string | null;
  /** Початок зарядки (сесія) — для відображення та фільтра періоду замість однакового `createdAt` рахунку. */
  sessionStartedAt?: string;
  /** Кінець сесії, якщо вже завершена. */
  sessionEndedAt?: string | null;
  amount: number;
  method: string;
  description: string;
  status: 'success' | 'pending' | 'failed';
  energyKwh?: number;
  pricePerKwhAtTime?: number;
  stationName?: string;
  sessionId?: string;
  vehicleLabel?: string;
  vehiclePlate?: string;
   bookingId?: string;
  bookingType?: 'CALC' | 'DEPOSIT';
  prepaymentAmount?: number;
}
