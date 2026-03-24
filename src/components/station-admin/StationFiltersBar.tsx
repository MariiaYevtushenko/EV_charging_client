import type { ReactNode } from "react";
import type { StationSortKey } from "../../context/StationsContext";
import { useStations } from "../../context/StationsContext";
import StationFiltersBarCore from "./StationFiltersBarCore";

const sortLabels: Record<StationSortKey, string> = {
  name: "Назва",
  city: "Місто",
  status: "Статус",
  todayRevenue: "Дохід (сьогодні)",
  todaySessions: "Сесії (сьогодні)",
};

export default function StationFiltersBar({
  showAddButton = false,
  drawerExtra,
}: {
  showAddButton?: boolean;
  drawerExtra?: ReactNode;
}) {
  const {
    uniqueCities,
    cityFilter,
    setCityFilter,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    toggleSortDir,
  } = useStations();

  const sortKeyOptions = (Object.keys(sortLabels) as StationSortKey[]).map((key) => ({
    key,
    label: sortLabels[key],
  }));

  return (
    <StationFiltersBarCore
      uniqueCities={uniqueCities}
      cityFilter={cityFilter}
      setCityFilter={setCityFilter}
      sortKeyOptions={sortKeyOptions}
      sortKey={sortKey}
      setSortKey={setSortKey}
      sortDir={sortDir}
      setSortDir={setSortDir}
      toggleSortDir={toggleSortDir}
      showAddButton={showAddButton}
      drawerExtra={drawerExtra}
    />
  );
}
