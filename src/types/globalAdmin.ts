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
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  start: string;
  end: string;
}

export interface EndUserPayment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
  description: string;
}

export interface ChargeRecord {
  id: string;
  stationId: string;
  stationName: string;
  kwh: number;
  cost: number;
  startedAt: string;
  durationMin: number;
  portLabel: string;
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
  charges: ChargeRecord[];
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
