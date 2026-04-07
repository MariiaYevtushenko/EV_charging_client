import type { StationSortDir, StationSortKey } from "../../context/StationsContext";

/** Ті самі підписи, що й у списку станцій / на карті. */
export const STATION_SORT_OPTIONS: {
  value: `${StationSortKey}:${StationSortDir}`;
  label: string;
}[] = [
  { value: "name:asc", label: "Назва (А → Я)" },
  { value: "name:desc", label: "Назва (Я → А)" },
  { value: "city:asc", label: "Місто (А → Я)" },
  { value: "city:desc", label: "Місто (Я → А)" },
  { value: "status:asc", label: "Статус (спочатку активні)" },
  { value: "status:desc", label: "Статус (зворотний порядок)" },
  { value: "todayRevenue:asc", label: "Дохід сьогодні (зростання)" },
  { value: "todayRevenue:desc", label: "Дохід сьогодні (спадання)" },
  { value: "todaySessions:asc", label: "Сесії сьогодні (зростання)" },
  { value: "todaySessions:desc", label: "Сесії сьогодні (спадання)" },
];

export function parseStationSortValue(v: string): { key: StationSortKey; dir: StationSortDir } {
  const i = v.lastIndexOf(":");
  if (i <= 0) return { key: "name", dir: "asc" };
  const key = v.slice(0, i) as StationSortKey;
  const dir = v.slice(i + 1) as StationSortDir;
  return { key, dir };
}
