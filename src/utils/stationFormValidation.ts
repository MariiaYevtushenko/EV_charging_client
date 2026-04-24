/** Клієнтська валідація форм створення / редагування станції (узгоджено з parseCreateStationBody / parseUpdateStationBody на сервері). */

import {
  STATION_FORM_CITY_LEN_MAX,
  STATION_FORM_CITY_LEN_MIN,
  STATION_FORM_COUNTRY_LEN_MAX,
  STATION_FORM_HOUSE_NUMBER_LEN_MAX,
  STATION_FORM_NAME_LEN_MAX,
  STATION_FORM_NAME_LEN_MIN,
  STATION_FORM_PORT_POWER_KW_MAX,
  STATION_FORM_PORT_POWER_KW_MIN,
  STATION_FORM_STREET_LEN_MAX,
  STATION_FORM_STREET_LEN_MIN,
} from '../constants/stationFormValidationConstants';
import type { StationPort } from '../types/station';

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
  if (t.length < STATION_FORM_NAME_LEN_MIN) return `Назва — щонайменше ${STATION_FORM_NAME_LEN_MIN} символи.`;
  if (t.length > STATION_FORM_NAME_LEN_MAX) return `Не більше ${STATION_FORM_NAME_LEN_MAX} символів.`;
  return undefined;
}

export function validateStationCity(city: string): string | undefined {
  const t = trimInner(city);
  if (t.length < STATION_FORM_CITY_LEN_MIN) return `Місто — щонайменше ${STATION_FORM_CITY_LEN_MIN} символи.`;
  if (t.length > STATION_FORM_CITY_LEN_MAX) return `Не більше ${STATION_FORM_CITY_LEN_MAX} символів.`;
  return undefined;
}

export function validateStationStreet(street: string): string | undefined {
  const t = trimInner(street);
  if (t.length < STATION_FORM_STREET_LEN_MIN) return `Вулиця — щонайменше ${STATION_FORM_STREET_LEN_MIN} символи.`;
  if (t.length > STATION_FORM_STREET_LEN_MAX) return `Не більше ${STATION_FORM_STREET_LEN_MAX} символів.`;
  return undefined;
}

export function validateStationHouseNumber(houseNumber: string): string | undefined {
  const t = houseNumber.trim();
  if (t.length > STATION_FORM_HOUSE_NUMBER_LEN_MAX) return `Не більше ${STATION_FORM_HOUSE_NUMBER_LEN_MAX} символів.`;
  return undefined;
}

/** Країна (код ISO або коротка назва) — як у полі `location.country` у БД. */
export function validateStationCountry(country: string): string | undefined {
  const t = trimInner(country);
  if (t.length < 2) return 'Вкажіть країну (наприклад, код UA).';
  if (t.length > STATION_FORM_COUNTRY_LEN_MAX) return `Не більше ${STATION_FORM_COUNTRY_LEN_MAX} символів.`;
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
    if (!Number.isFinite(kw) || kw < STATION_FORM_PORT_POWER_KW_MIN || kw > STATION_FORM_PORT_POWER_KW_MAX) {
      return `Порт ${i + 1}: вкажіть потужність від ${STATION_FORM_PORT_POWER_KW_MIN} до ${STATION_FORM_PORT_POWER_KW_MAX} кВт.`;
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
