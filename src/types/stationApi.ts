/** Відповідь GET /api/stations (масив StationDashboardDto з бекенду) */

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
  city: string;
  addressLine: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  updatedAt: string;
  ports: StationPortDashboardDto[];
};
