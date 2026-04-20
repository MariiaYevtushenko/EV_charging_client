/** Клієнтська валідація форм створення / редагування станції (узгоджено з parseCreateStationBody / parseUpdateStationBody на сервері). */

import type { StationPort } from '../types/station';

const MIN_NAME = 2;
const MAX_NAME = 200;
const MIN_CITY = 2;
const MAX_CITY = 120;
const MIN_STREET = 2;
const MAX_STREET = 300;
const MAX_HOUSE = 40;
const MAX_COUNTRY_LEN = 100;

const MIN_POWER_KW = 0.01;
const MAX_POWER_KW = 1000;

export type StationFormFieldKey =
  | 'name'
  | 'city'
  | 'street'
  | 'houseNumber'
  | 'country'
  | 'coordinates'
  | 'ports';

export type StationFormErrors = Partial<Record<StationFormFieldKey, string>>;

export type StationFormValidateInput = {
  name: string;
  city: string;
  street: string;
  houseNumber: string;
  /** Редагування: поле країни; для нової станції не передавати. */
  country?: string;
  lat: number;
  lng: number;
  ports: StationPort[];
};

function trimInner(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export function validateStationName(name: string): string | undefined {
  const t = trimInner(name);
  if (t.length < MIN_NAME) return `Назва — щонайменше ${MIN_NAME} символи.`;
  if (t.length > MAX_NAME) return `Не більше ${MAX_NAME} символів.`;
  return undefined;
}

export function validateStationCity(city: string): string | undefined {
  const t = trimInner(city);
  if (t.length < MIN_CITY) return `Місто — щонайменше ${MIN_CITY} символи.`;
  if (t.length > MAX_CITY) return `Не більше ${MAX_CITY} символів.`;
  return undefined;
}

export function validateStationStreet(street: string): string | undefined {
  const t = trimInner(street);
  if (t.length < MIN_STREET) return `Вулиця — щонайменше ${MIN_STREET} символи.`;
  if (t.length > MAX_STREET) return `Не більше ${MAX_STREET} символів.`;
  return undefined;
}

export function validateStationHouseNumber(houseNumber: string): string | undefined {
  const t = houseNumber.trim();
  if (t.length > MAX_HOUSE) return `Не більше ${MAX_HOUSE} символів.`;
  return undefined;
}

/** Країна (код ISO або коротка назва) — як у полі `location.country` у БД. */
export function validateStationCountry(country: string): string | undefined {
  const t = trimInner(country);
  if (t.length < 2) return 'Вкажіть країну (наприклад, код UA).';
  if (t.length > MAX_COUNTRY_LEN) return `Не більше ${MAX_COUNTRY_LEN} символів.`;
  if (!/^[\p{L}0-9\s\-&.]+$/u.test(t)) return 'Допустимі літери, цифри, пробіли та символи - & .';
  return undefined;
}

export function validateCoordinates(lat: number, lng: number): string | undefined {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Некоректні координати.';
  if (lat < -90 || lat > 90) return 'Широта має бути від −90° до 90°.';
  if (lng < -180 || lng > 180) return 'Довгота має бути від −180° до 180°.';
  return undefined;
}

export function validatePorts(ports: StationPort[]): string | undefined {
  if (!ports.length) return 'Додайте хоча б один порт.';
  for (let i = 0; i < ports.length; i++) {
    const p = ports[i];
    const kw = p.powerKw;
    if (!Number.isFinite(kw) || kw < MIN_POWER_KW || kw > MAX_POWER_KW) {
      return `Порт ${i + 1}: вкажіть потужність від ${MIN_POWER_KW} до ${MAX_POWER_KW} кВт.`;
    }
    if (!trimInner(p.connector)) return `Порт ${i + 1}: оберіть тип конектора.`;
  }
  return undefined;
}

/**
 * Повна перевірка перед відправкою на API.
 * `options.requireCountry` — true для сторінки редагування з полем країни.
 */
export function validateStationForm(
  input: StationFormValidateInput,
  options: { requireCountry: boolean }
): StationFormErrors {
  const errors: StationFormErrors = {};

  const en = validateStationName(input.name);
  if (en) errors.name = en;

  const ec = validateStationCity(input.city);
  if (ec) errors.city = ec;

  const es = validateStationStreet(input.street);
  if (es) errors.street = es;

  const eh = validateStationHouseNumber(input.houseNumber);
  if (eh) errors.houseNumber = eh;

  if (options.requireCountry && input.country !== undefined) {
    const eco = validateStationCountry(input.country);
    if (eco) errors.country = eco;
  }

  const coord = validateCoordinates(input.lat, input.lng);
  if (coord) errors.coordinates = coord;

  const ep = validatePorts(input.ports);
  if (ep) errors.ports = ep;

  return errors;
}

export function hasStationFormErrors(errors: StationFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}
