/** DTO станції з бекенду (GET /api/stations/..., dashboard). */

export type StationPortDashboardDto = {
  id: number;
  portNumber: number;
  maxPower: number;
  connectorCategory: string | null;
  status: string;
};

export type StationDashboardDto = {
  id: number;
  name: string;
  status: string;
  locationId: number;
  country: string;
  city: string;
  addressLine: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  updatedAt: string;
  ports: StationPortDashboardDto[];
};

/** Кількості станцій по статусу (усі записи в БД), разом із пагінованим списком. */
export type StationStatusCounts = {
  working: number;
  offline: number;
  maintenance: number;
  archived: number;
};

/** GET /api/stations: пагінований список + cities для фільтрів. */
export type PaginatedStationsResponse = {
  items: StationDashboardDto[];
  total: number;
  page: number;
  pageSize: number;
  cities: string[];
  statusCounts: StationStatusCounts;
};

/** GET /api/stations/map?minLat&maxLat&minLng&maxLng — станції у видимому прямокутнику. */
export type StationsMapResponse = {
  items: StationDashboardDto[];
  /** Верхня межа кількості точок за один запит (сервер обрізає при великому zoom-out). */
  limit?: number;
};

/** GET /api/stations/:stationId/upcoming-bookings — майбутні BOOKED, від найближчого слоту. */
export type StationUpcomingBookingDto = {
  id: string;
  portNumber: number;
  connectorName: string | null;
  start: string;
  end: string;
  userDisplayName: string | null;
  userEmail: string | null;
  vehicleLicensePlate: string | null;
};

export type StationUpcomingBookingsResponse = {
  items: StationUpcomingBookingDto[];
};

/** GET /api/stations/:stationId/available-booking-slots — GetAvailableBookingSlots (SQL). */
export type AvailableBookingSlotDto = {
  start: string;
  end: string;
};

export type AvailableBookingSlotsResponse = {
  slots: AvailableBookingSlotDto[];
};

/** GET /api/stations/:stationId/analytics-energy?period=1d|7d|30d */
export type StationEnergyPeriod = '1d' | '7d' | '30d';

export type StationEnergyAnalyticsPointDto = {
  bucketStart: string;
  kwh: number;
};

export type StationEnergyAnalyticsDto = {
  period: StationEnergyPeriod;
  bucket: 'hour' | 'day';
  points: StationEnergyAnalyticsPointDto[];
  totalKwh: number;
  sessionCount: number;
};
