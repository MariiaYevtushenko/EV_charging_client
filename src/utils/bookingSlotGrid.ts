import type { UserBooking } from '../types/userPortal';

export const SLOT_MINUTES = 30;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Початки 30-хв слотів [windowStartHour, windowEndHour) від півночі обраного дня. */
export function buildHalfHourStarts(
  day: Date,
  windowStartHour = 7,
  windowEndHour = 22
): number[] {
  const out: number[] = [];
  const base = startOfDay(day);
  const start = new Date(base);
  start.setHours(windowStartHour, 0, 0, 0);
  const end = new Date(base);
  end.setHours(windowEndHour, 0, 0, 0);
  const step = SLOT_MINUTES * 60 * 1000;
  for (let t = start.getTime(); t < end.getTime(); t += step) {
    out.push(t);
  }
  return out;
}

export function occupiedFromBookings(stationId: string, bookings: UserBooking[]): [number, number][] {
  return bookings
    .filter(
      (b) =>
        b.stationId === stationId && (b.status === 'upcoming' || b.status === 'active')
    )
    .map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime()]);
}

function rangeOverlapsOccupied(startMs: number, endMs: number, occupied: [number, number][]): boolean {
  return occupied.some(([os, oe]) => startMs < oe && endMs > os);
}

/** Псевдо-зайнятість «інших» клієнтів для демо. */
export function demoSlotBusy(stationId: string, slotStartMs: number): boolean {
  const h = new Date(slotStartMs).getHours();
  const seed = stationId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const idx = Math.floor(slotStartMs / (SLOT_MINUTES * 60 * 1000));
  return h >= 11 && h <= 19 && (idx + seed) % 7 === 0;
}

export function canBookDuration(
  startMs: number,
  durationMin: number,
  occupied: [number, number][],
  stationId: string
): boolean {
  if (durationMin % SLOT_MINUTES !== 0) return false;
  const step = SLOT_MINUTES * 60 * 1000;
  const n = durationMin / SLOT_MINUTES;
  for (let i = 0; i < n; i++) {
    const s = startMs + i * step;
    const e = s + step;
    if (rangeOverlapsOccupied(s, e, occupied)) return false;
    if (demoSlotBusy(stationId, s)) return false;
  }
  return true;
}
