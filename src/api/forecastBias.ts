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

export type ForecastPredictionPointDto = {
  date: string;
  dayUah: number | null;
  nightUah: number | null;
};

export type ForecastPredictionsDto = {
  from: string;
  to: string;
  days: number;
  points: ForecastPredictionPointDto[];
};

/** Серія прогнозів з `tariff_prediction` (Python SARIMA) + bias; за замовчуванням 21 день уперед. */
export function fetchForecastPredictions(days = 21): Promise<ForecastPredictionsDto> {
  const q = new URLSearchParams();
  q.set("days", String(days));
  return getJson<ForecastPredictionsDto>(`/api/admin/forecast/predictions?${q.toString()}`, {
    cache: "no-store",
  });
}
