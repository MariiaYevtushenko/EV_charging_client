export interface EndUserCar {
  id: string;
  plate: string;
  model: string;
  connector: string;
}

export interface EndUserBooking {
  id: string;
  stationId: string;
  stationName: string;
  slotLabel: string;
  /** Номер порту та тип конектора (для картки; `slotLabel` лишається для сумісності). */
  portNumber?: string;
  connectorLabel?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'paid';
  start: string;
  end: string;
}

export interface EndUserPayment {
  id: string;
  /** Сесія зарядки, для якої виставлено bill. */
  sessionId: string;
  amount: number;
  currency: string;
  method: string;
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
  description: string;
}

export interface EndUserSession {
  id: string;
  stationId: string;
  stationName: string;
  portLabel: string;
  status: 'active' | 'completed' | 'failed';
  startedAt: string;
  endedAt: string | null;
  kwh: number;
  cost: number;
  bookingId: string | null;
}

/** Як у Prisma `ev_user.role` (ADMIN = глобальний адмін). */
export type EvUserRole = 'USER' | 'STATION_ADMIN' | 'ADMIN';

export interface EndUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role?: EvUserRole;
  balance: number;
  registeredAt: string;
  avatarUrl?: string;
  blocked?: boolean;
  cars: EndUserCar[];
  bookings: EndUserBooking[];
  payments: EndUserPayment[];
  sessions: EndUserSession[];
}

export interface TariffPlan {
  id: string;
  name: string;
  dayPrice: number;
  nightPrice: number;
  dayStart: string;
  dayEnd: string;
  description: string;
  /** Демо: скільки станцій прив’язано до плану */
  stationsCount: number;
}
