import type { Station } from '../types/station';

/** Головна карта користувача: архів та офлайн не показуємо. */
export function stationVisibleOnUserHomeMap(s: Station): boolean {
  return !s.archived && s.status !== 'offline';
}

/** Бронювання та старт зарядки лише для працюючої станції (не ремонт / не офлайн / не архів). */
export function stationAllowsUserBookingAndCharge(s: Station): boolean {
  return !s.archived && s.status === 'working';
}
