import type { Station, StationStatus } from "../types/station";

/** Розбиття одного рядка адреси на вулицю та номер будинку для API. */
export function splitStreetHouse(address: string): { street: string; houseNumber: string } {
  const t = address.trim();
  const m = t.match(/^(.+?)\s+(\d+[a-zA-Zа-яА-ЯіІїЇєЄ/\-]*)$/u);
  if (m) return { street: m[1].trim(), houseNumber: m[2] };
  return { street: t || "—", houseNumber: "1" };
}

/**
 * Збирання вулиці та номера в один рядок для `Station.address`
 * (далі `splitStreetHouse` у `stationToCreateBody` / `stationToUpdateBody`).
 * Якщо номер порожній — підставляється `1`, як у fallback `splitStreetHouse`.
 */
export function joinStreetHouse(street: string, houseNumber: string): string {
  const s = street.trim();
  const h = houseNumber.trim();
  if (!s && !h) return "—";
  if (!s) return h || "—";
  if (!h) return `${s} 1`;
  return `${s} ${h}`;
}

function statusForApi(s: StationStatus): string {
  switch (s) {
    case "working":
      return "working";
    case "offline":
      return "offline";
    case "maintenance":
      return "maintenance";
    case "archived":
      return "archived";
    default:
      return "working";
  }
}

export function stationPortsToApi(ports: Station["ports"]) {
  return ports.map((p, idx) => ({
    portNumber: p.portNumber ?? idx + 1,
    maxPower: p.powerKw,
    connectorCategory: p.connector,
  }));
}

export function stationToCreateBody(input: Omit<Station, "id">) {
  const { street, houseNumber } = splitStreetHouse(input.address);
  return {
    name: input.name,
    country: input.country,
    city: input.city,
    street,
    houseNumber,
    lat: input.lat,
    lng: input.lng,
    status: statusForApi(input.status),
    ports: stationPortsToApi(input.ports),
  };
}

export function stationToUpdateBody(merged: Station) {
  const { street, houseNumber } = splitStreetHouse(merged.address);
  return {
    name: merged.name,
    country: merged.country,
    city: merged.city,
    street,
    houseNumber,
    lat: merged.lat,
    lng: merged.lng,
    status: statusForApi(merged.status),
    ports: stationPortsToApi(merged.ports),
  };
}
