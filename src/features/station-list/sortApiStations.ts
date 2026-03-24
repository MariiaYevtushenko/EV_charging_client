import type { StationDashboardDto } from "../../types/stationApi";
import type { StationSortDir, StationSortKey } from "../../context/StationsContext";

const statusOrder: Record<string, number> = {
  WORK: 0,
  FIX: 1,
  NO_CONNECTION: 2,
};

/** Сортування списку з API (без полів todayRevenue / todaySessions). */
export function sortApiStations(
  list: StationDashboardDto[],
  sortKey: StationSortKey,
  sortDir: StationSortDir
): StationDashboardDto[] {
  const next = [...list];
  const mul = sortDir === "asc" ? 1 : -1;
  next.sort((a, b) => {
    switch (sortKey) {
      case "name":
        return mul * a.name.localeCompare(b.name, "uk");
      case "city":
        return mul * a.city.localeCompare(b.city, "uk");
      case "status":
        return (
          mul *
          ((statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99))
        );
      case "todayRevenue":
      case "todaySessions":
        return mul * (a.id - b.id);
      default:
        return 0;
    }
  });
  return next;
}
