import { EUR_TO_UAH_RATE } from '../config/publicEnv';

/** Тарифи станцій у кабінеті користувача (day/night/port) приходять у EUR за кВт·год — переводимо в гривні. */
export function eurToUah(amountEur: number): number {
  if (!Number.isFinite(amountEur)) return 0;
  return Math.round(amountEur * EUR_TO_UAH_RATE * 10000) / 10000;
}
