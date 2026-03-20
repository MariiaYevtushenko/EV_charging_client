export type StationStatus = 'working' | 'offline' | 'maintenance';

export type PortStatus = 'available' | 'busy' | 'offline';

export interface StationPort {
  id: string;
  label: string;
  connector: string;
  powerKw: number;
  pricePerKwh: number;
  status: PortStatus;
  /** Текст для зайнятого порту, напр. "~12 хв" */
  occupiedEta?: string;
}

export interface Station {
  id: string;
  name: string;
  /** Місто для фільтрації та сортування */
  city: string;
  address: string;
  status: StationStatus;
  /** Прихована з карти та зі списку «Усі»; лишається в «Архів» */
  archived?: boolean;
  /** WGS84 — для карти Leaflet */
  lat: number;
  lng: number;
  ports: StationPort[];
  todayRevenue: number;
  todaySessions: number;
  dayTariff: number;
  nightTariff: number;
  /** Споживання енергії по годинах (кВт·год), 24 точки */
  energyByHour: number[];
}
