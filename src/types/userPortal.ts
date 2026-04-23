export interface UserCar {
  id: string;
  plate: string;
  /** Бренд (як у БД). */
  brand: string;
  /** Модель без бренду. */
  vehicleModel: string;
  /** Повна назва для відображення та підбору зображення. */
  model: string;
  /** Ємність акумулятора (кВт·год), з API. */
  batteryCapacity?: number;
  connector: string;
  imageUrl?: string;
}

/** Статус сесії зарядки (з БД session.status). */
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
  /** Авто з гаража, якщо сесію прив’язано до vehicle */
  vehicleId?: string;
  /** Якщо сесію запущено з бронювання */
  bookingId?: string;
  /** ID рахунку (bill) — для переходу до картки платежу */
  billId?: string;
}

export type UserBookingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled' | 'missed';

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

export interface UserPaymentRow {
  id: string;
  createdAt: string;
  /** Успішна оплата — ISO; при PENDING зазвичай null */
  paidAt: string | null;
  amount: number;
  method: string;
  description: string;
  status: 'success' | 'pending' | 'failed';
  /** Кількість кВт·год з сесії, якщо є */
  energyKwh?: number;
  /** Ціна кВт·год з рахунку (bill), якщо збережено */
  pricePerKwhAtTime?: number;
  /** Назва станції з сесії */
  stationName?: string;
  /** Для посилання на історію сесій */
  sessionId?: string;
  /** Бренд + модель з сесії (vehicle), якщо є */
  vehicleLabel?: string;
  /** Держномер, якщо є */
  vehiclePlate?: string;
  /** Якщо сесію зарядки було прив’язано до бронювання */
  bookingId?: string;
  bookingType?: 'CALC' | 'DEPOSIT';
  /** Сума передплати з бронювання (грн), для DEPOSIT */
  prepaymentAmount?: number;
}
