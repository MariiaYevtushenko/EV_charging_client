import { useEffect, useMemo, useState } from 'react';
import { useStations } from '../../context/StationsContext';
import StationFiltersBar from '../../components/station-admin/StationFiltersBar';
import StationMap from '../../components/station-admin/StationMap';
import { AppCard } from '../../components/station-admin/Primitives';
import StationsTableList from '../../components/station-admin/StationsTableList';

export default function StationMapPage() {
  const {
    mapStations: mapStationsAll,
    mapLoading,
    mapFetchLimit,
    registerMapViewportBounds,
    getStation,
    stationsTotal,
  } = useStations();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId ? getStation(selectedId) : undefined;

  const mapStations = useMemo(
    () => mapStationsAll.filter((s) => !s.archived),
    [mapStationsAll]
  );

  useEffect(() => {
    if (mapStations.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) =>
      prev && mapStations.some((s) => s.id === prev) ? prev : mapStations[0].id
    );
  }, [mapStations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Карта станцій</h1>
      </div>

      <StationFiltersBar showAddButton />

      <div className="grid gap-6 lg:grid-cols-5">
        <AppCard className="flex min-h-[480px] flex-col overflow-hidden lg:col-span-3" padding={false}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3">
            <div>
              <span className="text-sm font-semibold text-gray-900">EV Charging Station</span>
              <p className="text-xs text-gray-500">
                {mapLoading
                  ? 'Завантаження видимої області…'
                  : mapFetchLimit != null && mapStations.length >= mapFetchLimit
                    ? `У видимій області показано до ${mapFetchLimit} станцій (обмеження) · усього в БД: ${stationsTotal}`
                    : `У видимій області: ${mapStations.length} активних · усього в БД: ${stationsTotal}`}
              </p>
            </div>
          </div>
          <div className="min-h-[400px] flex-1 p-3">
            <StationMap
              stations={mapStations}
              selectedId={selectedId ?? mapStations[0]?.id ?? ''}
              onSelect={setSelectedId}
              onViewportChange={registerMapViewportBounds}
            />
          </div>
        </AppCard>

        <StationsTableList selected={selected ?? mapStations[0]} />
      </div>
    </div>
  );
}
