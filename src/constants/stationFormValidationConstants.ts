/** Ліміти клієнтської валідації форми станції (узгоджено з parseCreateStationBody / parseUpdateStationBody на сервері). */
export const STATION_FORM_NAME_LEN_MIN = 2;
export const STATION_FORM_NAME_LEN_MAX = 200;
export const STATION_FORM_CITY_LEN_MIN = 2;
export const STATION_FORM_CITY_LEN_MAX = 120;
export const STATION_FORM_STREET_LEN_MIN = 2;
export const STATION_FORM_STREET_LEN_MAX = 300;
export const STATION_FORM_HOUSE_NUMBER_LEN_MAX = 40;
export const STATION_FORM_COUNTRY_LEN_MAX = 100;

export const STATION_FORM_PORT_POWER_KW_MIN = 0.01;
export const STATION_FORM_PORT_POWER_KW_MAX = 1000;
