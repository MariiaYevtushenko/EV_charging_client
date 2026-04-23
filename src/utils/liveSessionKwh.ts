import type { Station } from '../types/station';

/** Мінімальні поля сесії для наочного лічильника кВт·год (узгоджено з UserSessionRecord). */
export type LiveKwhSessionFields = {
  stationId: string;
  portLabel: string;
  startedAt: string;
  kwh: number;
};

/**
 * Середня «демо»-потужність (кВт) за даними станції / порту.
 * Реальне `session.kwh` з API оновлюється окремо (polling); це лише для відображення та узгодженого complete.
 */
export function demoAverageChargeKwForLiveDisplay(
  session: Pick<LiveKwhSessionFields, 'stationId' | 'portLabel'>,
  getStation: (id: string) => Station | undefined
): number {
  const station = getStation(session.stationId);
  if (!station?.ports?.length) return 11;
  const want = session.portLabel.trim().toLowerCase();
  const byLabel =
    station.ports.find((p) => p.label.trim().toLowerCase() === want) ??
    station.ports.find((p) => want.includes(p.label.trim().toLowerCase()));
  const pick = byLabel ?? station.ports.reduce((a, b) => (a.powerKw >= b.powerKw ? a : b));
  const nominal = pick.powerKw > 0 ? pick.powerKw : 11;
  return Math.min(nominal, Math.max(3.7, nominal * 0.88));
}

/**
 * КВт·год для UI / завершення: не менше за значення з БД, плюс демо-наростання за часом від `startedAt`.
 * Ніде в localStorage не зберігається — лише вирахунок у памʼяті за `nowMs`.
 */
export function liveKwhSoFarAt(
  session: LiveKwhSessionFields,
  nowMs: number,
  getStation: (id: string) => Station | undefined
): number {
  const started = new Date(session.startedAt).getTime();
  const elapsedMs = Number.isFinite(started) ? Math.max(0, nowMs - started) : 0;
  const avgKw = demoAverageChargeKwForLiveDisplay(session, getStation);
  const simulatedKwh = (elapsedMs / 3_600_000) * avgKw;
  return Math.round(Math.max(session.kwh, simulatedKwh) * 1000) / 1000;
}
