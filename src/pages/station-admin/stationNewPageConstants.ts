/** Точка за замовчуванням на карті (Львів) — до геокодування / ручного зміщення маркера. */
export const DEFAULT_LAT = 49.8397;
export const DEFAULT_LNG = 24.0297;

export const MAP_HEIGHT_CLASS =
  'min-h-[380px] h-[min(600px,calc(100dvh-10rem))] w-full sm:min-h-[440px]';

/** Затримка перед зворотним геокодуванням після перетягування карти (менше запитів до Nominatim). */
export const REVERSE_DEBOUNCE_MS = 650;

/** Скільки мілісекунд показувати спливаюче повідомлення про помилку збереження. */
export const SUBMIT_ERROR_TOAST_MS = 7000;
