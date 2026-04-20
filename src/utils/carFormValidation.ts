/** Валідація полів форми авто (кабінет користувача). */

export type CarFormFieldKey = 'brand' | 'vehicleModel' | 'plate' | 'batteryCapacity';

export type CarFormErrors = Partial<Record<CarFormFieldKey, string>>;

const MAX_BRAND = 60;
const MAX_MODEL = 80;
const MIN_PLATE_COMPACT = 4;
const MAX_PLATE_LEN = 15;
const MIN_BATTERY_KWH = 1;
const MAX_BATTERY_KWH = 500;

function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export function validateCarBrand(brand: string): string | undefined {
  const t = normalizeSpaces(brand);
  if (t.length < 2) return 'Бренд — щонайменше 2 символи.';
  if (t.length > MAX_BRAND) return `Не більше ${MAX_BRAND} символів.`;
  if (!/^[\p{L}\p{N}\s\-&.]+$/u.test(t)) return 'Допустимі літери, цифри, пробіли та символи - & .';
  return undefined;
}

/** Поле «Модель» на формі додавання (без бренду). */
export function validateCarVehicleModel(vehicleModel: string): string | undefined {
  const t = normalizeSpaces(vehicleModel);
  if (t.length < 1) return 'Вкажіть модель.';
  if (t.length > MAX_MODEL) return `Не більше ${MAX_MODEL} символів.`;
  if (!/^[\p{L}\p{N}\s\-&.]+$/u.test(t)) return 'Допустимі літери, цифри, пробіли та символи - & .';
  return undefined;
}

/** Державний номер (UA: латиниця + цифри, з пробілами). */
export function validateCarPlate(plate: string): string | undefined {
  const t = normalizeSpaces(plate);
  const compact = t.replace(/\s|-/g, '');
  if (compact.length < MIN_PLATE_COMPACT) return `Номер занадто короткий (мінімум ${MIN_PLATE_COMPACT} знаки без пробілів).`;
  if (t.length > MAX_PLATE_LEN) return `Не більше ${MAX_PLATE_LEN} символів з пробілами.`;
  if (!/^[\p{L}0-9\s-]+$/u.test(t)) return 'Лише літери латиниці або кирилиці, цифри, пробіли та дефіс.';
  return undefined;
}

export function validateBatteryKwh(raw: string): string | undefined {
  const n = Number(String(raw).replace(',', '.').trim());
  if (!Number.isFinite(n)) return 'Введіть коректне число.';
  if (n < MIN_BATTERY_KWH) return `Ємність від ${MIN_BATTERY_KWH} кВт·год.`;
  if (n > MAX_BATTERY_KWH) return `Не більше ${MAX_BATTERY_KWH} кВт·год.`;
  return undefined;
}

export type NewCarFormValues = {
  brand: string;
  vehicleModel: string;
  plate: string;
  batteryCapacity: string;
};

export function validateNewCarForm(v: NewCarFormValues): CarFormErrors {
  const errors: CarFormErrors = {};
  const eb = validateCarBrand(v.brand);
  if (eb) errors.brand = eb;
  const em = validateCarVehicleModel(v.vehicleModel);
  if (em) errors.vehicleModel = em;
  const ep = validateCarPlate(v.plate);
  if (ep) errors.plate = ep;
  const ebk = validateBatteryKwh(v.batteryCapacity);
  if (ebk) errors.batteryCapacity = ebk;
  return errors;
}

export type EditCarFormValues = {
  brand: string;
  vehicleModel: string;
  plate: string;
};

export function validateEditCarForm(v: EditCarFormValues): CarFormErrors {
  const errors: CarFormErrors = {};
  const eb = validateCarBrand(v.brand);
  if (eb) errors.brand = eb;
  const em = validateCarVehicleModel(v.vehicleModel);
  if (em) errors.vehicleModel = em;
  const ep = validateCarPlate(v.plate);
  if (ep) errors.plate = ep;
  return errors;
}

export function hasCarFormErrors(errors: CarFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}
