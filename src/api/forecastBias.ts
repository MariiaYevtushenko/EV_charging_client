import { getJson } from "./http";

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

/** Серія прогнозів з `tariff_prediction` (Python SARIMA); за замовчуванням 21 день уперед. */
export function fetchForecastPredictions(days = 21): Promise<ForecastPredictionsDto> {
  const q = new URLSearchParams();
  q.set("days", String(days));
  return getJson<ForecastPredictionsDto>(`/api/admin/forecast/predictions?${q.toString()}`, {
    cache: "no-store",
  });
}
