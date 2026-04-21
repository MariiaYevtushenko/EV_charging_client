/** Період для агрегатів на картці авто: сьогодні / 7 / 30 днів / увесь час. */
export type CarDetailPeriod = 'today' | '7d' | '30d' | 'all';

type SessionForCarStats = {
  vehicleId?: string;
  kwh: number;
  cost: number;
  startedAt: string;
};

function sessionStartedInPeriod(startedAt: string, period: CarDetailPeriod): boolean {
  if (period === 'all') return true;
  const t = new Date(startedAt).getTime();
  if (!Number.isFinite(t)) return false;
  if (period === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return t >= start.getTime() && t < end.getTime();
  }
  const days = period === '7d' ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return t >= cutoff;
}

/** Агрегати зарядних сесій для авто з фільтром за датою початку сесії. */
export function carStatsForIdInPeriod(
  carId: string,
  sessions: SessionForCarStats[],
  period: CarDetailPeriod
): { sessionCount: number; kwhTotal: number; costTotal: number } {
  let sessionCount = 0;
  let kwhTotal = 0;
  let costTotal = 0;
  for (const s of sessions) {
    if (s.vehicleId !== carId) continue;
    if (!sessionStartedInPeriod(s.startedAt, period)) continue;
    sessionCount += 1;
    kwhTotal += s.kwh;
    costTotal += Number.isFinite(s.cost) ? s.cost : 0;
  }
  return {
    sessionCount,
    kwhTotal: Math.round(kwhTotal * 1000) / 1000,
    costTotal: Math.round(costTotal * 100) / 100,
  };
}

/** Усі сесії авто (без фільтру дати). */
export function carStatsForId(
  carId: string,
  sessions: { vehicleId?: string; kwh: number; cost: number; startedAt?: string }[]
): { sessionCount: number; kwhTotal: number; costTotal: number } {
  return carStatsForIdInPeriod(
    carId,
    sessions.map((s) => ({
      ...s,
      startedAt: s.startedAt ?? '',
    })),
    'all'
  );
}
