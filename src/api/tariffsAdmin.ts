import { getJson, putJson } from "./http";

export type TariffListItemDto = {
  id: number;
  tariffType: "DAY" | "NIGHT";
  pricePerKwh: number;
  effectiveDate: string;
};

export type TodayTariffsDto = {
  date: string;
  dayPrice: number;
  nightPrice: number;
};

export function fetchTariffsList(): Promise<TariffListItemDto[]> {
  return getJson<TariffListItemDto[]>("/api/admin/tariffs");
}

export function fetchTariffsToday(): Promise<TodayTariffsDto> {
  return getJson<TodayTariffsDto>("/api/admin/tariffs/today");
}

export function putTariffsToday(payload: {
  dayPrice: number;
  nightPrice: number;
}): Promise<TodayTariffsDto> {
  return putJson<TodayTariffsDto>("/api/admin/tariffs/today", payload);
}
