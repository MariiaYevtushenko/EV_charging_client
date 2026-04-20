import type { NetworkListPeriod } from '../api/adminNetwork';

/** Як на сервері: `startTime` / `createdAt` ≥ (зараз − N днів). */
export function isOnOrAfterNetworkPeriodCutoff(isoDate: string, period: NetworkListPeriod): boolean {
  if (period === 'all') return true;
  const days = period === '7d' ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const t = new Date(isoDate).getTime();
  return Number.isFinite(t) && t >= cutoff;
}
