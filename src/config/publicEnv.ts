/** Публічні змінні Vite (`VITE_*`). Див. `client/.env.example`. */

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Резерв за бронь (грн) для моделі «фіксована ціна на момент бронювання». */
export const RESERVATION_FEE_UAH = num(import.meta.env.VITE_RESERVATION_FEE_UAH, 200);

/** Орієнтовна потужність зарядки (кВт) для оцінки кВт·год за час броні. */
export const ASSUMED_CHARGE_KW = num(import.meta.env.VITE_ASSUMED_CHARGE_KW, 7);

/**
 * Курс EUR → UAH для тарифів у кабінеті користувача (`dayTariff` / `nightTariff` / порт — у EUR за кВт·год).
 */
export const EUR_TO_UAH_RATE = num(import.meta.env.VITE_EUR_TO_UAH, 45);
