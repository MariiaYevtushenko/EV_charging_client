import { getJson, putJson } from "./http";

export type ForecastBiasDto = {
  day: number;
  night: number;
  updatedAtDay: string | null;
  updatedAtNight: string | null;
};

export function fetchForecastBias(): Promise<ForecastBiasDto> {
  return getJson<ForecastBiasDto>("/api/admin/forecast/bias");
}

export function saveForecastBias(patch: {
  day: number;
  night: number;
}): Promise<ForecastBiasDto> {
  return putJson<ForecastBiasDto>("/api/admin/forecast/bias", patch);
}
