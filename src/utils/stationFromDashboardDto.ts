import type { StationDashboardDto } from "../types/stationApi";
import type { PortStatus, Station, StationPort, StationStatus } from "../types/station";

function mapStationStatus(api: string): StationStatus {
  switch (api) {
    case "WORK":
      return "working";
    case "NO_CONNECTION":
      return "offline";
    case "FIX":
      return "maintenance";
    case "ARCHIVED":
      return "archived";
    default:
      return "offline";
  }
}

function mapPortStatus(api: string): PortStatus {
  switch (api) {
    case "FREE":
      return "available";
    case "BOOKED":
    case "USED":
      return "busy";
    case "REPAIRED":
    default:
      return "offline";
  }
}

/** Координати з БД поки не віддаються в DTO — розкладаємо маркери біля Львова, щоб карта не була порожньою. */
function fallbackLatLng(id: number): { lat: number; lng: number } {
  const lat0 = 49.8397;
  const lng0 = 24.0297;
  const step = 0.007;
  return {
    lat: lat0 + (id % 7) * step,
    lng: lng0 + ((id * 3) % 11) * step,
  };
}

export function stationFromDashboardDto(dto: StationDashboardDto): Station {
  const fallback = fallbackLatLng(dto.id);
  const lat =
    typeof dto.lat === "number" && Number.isFinite(dto.lat) ? dto.lat : fallback.lat;
  const lng =
    typeof dto.lng === "number" && Number.isFinite(dto.lng) ? dto.lng : fallback.lng;
  const ports: StationPort[] = dto.ports.map((p) => ({
    id: `port-${p.id}`,
    portNumber: p.portNumber,
    label: `Порт ${p.portNumber}`,
    connector: p.connectorCategory ?? "—",
    powerKw: p.maxPower,
    pricePerKwh: 0,
    status: mapPortStatus(p.status),
  }));

  return {
    id: String(dto.id),
    name: dto.name,
    city: dto.city,
    address: dto.addressLine,
    status: mapStationStatus(dto.status),
    archived: dto.status === "ARCHIVED",
    lat,
    lng,
    ports,
    todayRevenue: 0,
    todaySessions: 0,
    dayTariff: 0,
    nightTariff: 0,
    energyByHour: Array.from({ length: 24 }, () => 0),
  };
}
