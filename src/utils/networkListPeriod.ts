import type { NetworkListPeriod } from '../api/adminNetwork';

function startOfLocalDayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfNextLocalDayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

/** Узгоджено з бекендом: календарна доба або ковзне N-денне вікно. */
export function isOnOrAfterNetworkPeriodCutoff(isoDate: string, period: NetworkListPeriod): boolean {
  if (period === 'all') return true;
  const t = new Date(isoDate).getTime();
  if (!Number.isFinite(t)) return false;
  if (period === 'today') {
    return t >= startOfLocalDayMs() && t < startOfNextLocalDayMs();
  }
  const days = period === '7d' ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return t >= cutoff;
}
