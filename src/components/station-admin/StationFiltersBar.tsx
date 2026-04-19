import type { ReactNode } from "react";
import { useStations } from "../../context/StationsContext";
import StationFiltersBarCore from "./StationFiltersBarCore";

export default function StationFiltersBar({
  showAddButton = false,
  drawerExtra,
  dashboardBase = '/station-dashboard',
}: {
  showAddButton?: boolean;
  drawerExtra?: ReactNode;
  dashboardBase?: string;
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
      drawerExtra={drawerExtra}
      dashboardBase={dashboardBase}
    />
  );
}
