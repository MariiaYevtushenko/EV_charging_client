import { getJson, postJson, putJson } from "./http";

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

export type SyncMissingTariffsDto = {
  filledDays: number;
  dates: string[];
  bootstrappedTodayOnly: boolean;
};

export function fetchTariffsList(): Promise<TariffListItemDto[]> {
  return getJson<TariffListItemDto[]>("/api/admin/tariffs");
}

export function fetchTariffsToday(): Promise<TodayTariffsDto> {
  return getJson<TodayTariffsDto>("/api/admin/tariffs/today", { cache: "no-store" });
}

/** Оновити з API лише денний або лише нічний тариф на сьогодні. */
export function postTariffsTodayRefresh(period: "day" | "night"): Promise<TodayTariffsDto> {
  return postJson<TodayTariffsDto>("/api/admin/tariffs/today/refresh", { period });
}

/** Доповнює пропущені календарні дні від останнього запису до сьогодні (ціни з API, як ingest). */
export function postTariffsSyncMissing(): Promise<SyncMissingTariffsDto> {
  return postJson<SyncMissingTariffsDto>("/api/admin/tariffs/sync-missing", {});
}

export function putTariffsToday(payload: {
  dayPrice: number;
  nightPrice: number;
}): Promise<TodayTariffsDto> {
  return putJson<TodayTariffsDto>("/api/admin/tariffs/today", payload);
}
