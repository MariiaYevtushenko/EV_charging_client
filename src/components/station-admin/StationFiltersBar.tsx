import type { ReactNode } from "react";
import { useStations } from "../../context/StationsContext";
import StationFiltersBarCore from "./StationFiltersBarCore";

export default function StationFiltersBar({
  showAddButton = false,
  drawerExtra,
  dashboardBase = '/station-dashboard',
  /** На широких екранах показати сортування в панелі поруч із фільтром (менше кліків). */
  showInlineSort = false,
}: {
  showAddButton?: boolean;
  drawerExtra?: ReactNode;
  dashboardBase?: string;
  showInlineSort?: boolean;
}) {
  const {
    uniqueCities,
    selectedCities,
    setSelectedCities,
    sortValue,
    setSortValue,
  } = useStations();

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  return (
    <StationFiltersBarCore
      uniqueCities={uniqueCities}
      selectedCities={selectedCities}
      toggleCity={toggleCity}
      clearSelectedCities={() => setSelectedCities([])}
      sortValue={sortValue}
      setSortValue={setSortValue}
      showAddButton={showAddButton}
      showInlineSort={showInlineSort}
      drawerExtra={drawerExtra}
      dashboardBase={dashboardBase}
    />
  );
}
