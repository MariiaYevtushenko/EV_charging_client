export interface UserCar {
  id: string;
  plate: string;
  model: string;
  connector: string;
  /** URL фото (ручний або підібраний за моделлю) */
  imageUrl?: string;
}

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
}

export type UserBookingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

/** Попереднє бронювання: фіксований збір. Динамічне: оплата «за все» зараз (демо-оцінка). */
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
  /** Сума до сплати зараз (50 грн або повна демо-оцінка). */
  payNowAmount?: number;
}

export interface UserCurrentSession {
  stationId: string;
  stationName: string;
  portLabel: string;
  progressPct: number;
  kwhSoFar: number;
  costSoFar: number;
  startedAt: string;
  elapsedLabel: string;
}

export interface UserPaymentRow {
  id: string;
  createdAt: string;
  amount: number;
  method: string;
  description: string;
  status: 'success' | 'pending' | 'failed';
  /** Кількість кВт·год з сесії, якщо є */
  energyKwh?: number;
  /** Назва станції з сесії */
  stationName?: string;
  /** Для посилання на історію сесій */
  sessionId?: string;
}
