import type {
  UserBooking,
  UserCar,
  UserCurrentSession,
  UserPaymentRow,
  UserSessionRecord,
} from '../types/userPortal';
import { suggestCarImageByModel } from '../utils/carImageSuggest';

export const INITIAL_USER_CARS: UserCar[] = [
  {
    id: 'uc-1',
    plate: 'KA 4821 AA',
    model: 'Nissan Leaf',
    connector: 'CHAdeMO',
    imageUrl: suggestCarImageByModel('Nissan Leaf'),
  },
  {
    id: 'uc-2',
    plate: 'KA 1024 BB',
    model: 'Hyundai Ioniq 5',
    connector: 'CCS2',
    imageUrl: suggestCarImageByModel('Hyundai Ioniq 5'),
  },
];

export const INITIAL_CURRENT_SESSION: UserCurrentSession | null = {
  stationId: 'st-14',
  stationName: 'Станція #14 «Lviv-Polytech»',
  portLabel: 'Порт B · CCS2',
  progressPct: 64,
  kwhSoFar: 12.4,
  costSoFar: 93.0,
  startedAt: '2026-03-20T14:12:00',
  elapsedLabel: '00:24:15',
};

export const INITIAL_USER_SESSIONS: UserSessionRecord[] = [
  {
    id: 'us-1',
    stationId: 'st-14',
    stationName: 'Станція #14 «Lviv-Polytech»',
    portLabel: 'Порт A',
    startedAt: '2026-03-18T10:12:00',
    endedAt: '2026-03-18T11:04:00',
    durationMin: 52,
    kwh: 24.8,
    cost: 186.4,
  },
  {
    id: 'us-2',
    stationId: 'st-02',
    stationName: 'Станція #02 «Сихівський»',
    portLabel: 'Порт A',
    startedAt: '2026-03-10T16:40:00',
    endedAt: '2026-03-10T17:18:00',
    durationMin: 38,
    kwh: 12.1,
    cost: 87.12,
  },
  {
    id: 'us-3',
    stationId: 'st-kr',
    stationName: 'Станція «Київ-Центр»',
    portLabel: 'Порт A',
    startedAt: '2026-02-22T09:00:00',
    endedAt: '2026-02-22T10:20:00',
    durationMin: 80,
    kwh: 31.5,
    cost: 258.3,
  },
];

export const INITIAL_USER_BOOKINGS: UserBooking[] = [
  {
    id: 'ub-1',
    stationId: 'st-14',
    stationName: 'Станція #14 «Lviv-Polytech»',
    slotLabel: 'Порт A · Type 2',
    start: '2026-03-21T09:00:00',
    end: '2026-03-21T10:30:00',
    status: 'upcoming',
    durationMin: 90,
    pricingModel: 'dynamic_prepay',
    payNowAmount: 198.5,
  },
  {
    id: 'ub-2',
    stationId: 'st-kr',
    stationName: 'Станція «Київ-Центр»',
    slotLabel: 'Порт A',
    start: '2026-03-17T14:00:00',
    end: '2026-03-17T15:00:00',
    status: 'completed',
    durationMin: 60,
    pricingModel: 'reservation_fee',
    payNowAmount: 50,
  },
  {
    id: 'ub-3',
    stationId: 'st-02',
    stationName: 'Станція #02 «Сихівський»',
    slotLabel: 'Порт B',
    start: '2026-03-05T08:00:00',
    end: '2026-03-05T09:00:00',
    status: 'cancelled',
    durationMin: 60,
    pricingModel: 'reservation_fee',
    payNowAmount: 50,
  },
];

export const INITIAL_USER_PAYMENTS: UserPaymentRow[] = [
  {
    id: 'up-1',
    createdAt: '2026-03-18T11:20:00',
    amount: 186.4,
    method: 'Картка Visa',
    description: 'Зарядка Lviv-Polytech',
    status: 'success',
    energyKwh: 24.8,
    stationName: 'Станція #14 «Lviv-Polytech»',
  },
  {
    id: 'up-2',
    createdAt: '2026-03-15T08:05:00',
    amount: 320,
    method: 'Apple Pay',
    description: 'Поповнення балансу',
    status: 'success',
  },
  {
    id: 'up-3',
    createdAt: '2026-03-10T17:20:00',
    amount: 87.12,
    method: 'Google Pay',
    description: 'Сесія Сихівський',
    status: 'success',
    energyKwh: 11.2,
    stationName: 'Станція #02 «Сихівський»',
  },
];
