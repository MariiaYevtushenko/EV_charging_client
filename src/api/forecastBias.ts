import { getJson, postJson } from "./http";

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

export function fetchForecastPredictions(days = 21): Promise<ForecastPredictionsDto> {
  const q = new URLSearchParams();
  q.set("days", String(days));
  return getJson<ForecastPredictionsDto>(`/api/admin/forecast/predictions?${q.toString()}`, {
    cache: "no-store",
  });
}

/** POST /api/admin/forecast/run-model — успіх (помилка Python → 500 і виняток у `postJson`). */
export type ForecastRunModelOk = { ok: true; stdout?: string; stderr?: string };

/** POST /api/admin/forecast/run-model — `forecast/ai_engine.py` → `tariff_prediction`. */
export function postForecastRunModel(): Promise<ForecastRunModelOk> {
  return postJson<ForecastRunModelOk>("/api/admin/forecast/run-model", {});
}
