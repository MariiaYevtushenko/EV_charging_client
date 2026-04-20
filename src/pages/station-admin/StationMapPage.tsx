import { useEffect, useMemo, useState } from 'react';
import { useStations } from '../../context/StationsContext';
import StationMap from '../../components/station-admin/StationMap';
import { AppCard } from '../../components/station-admin/Primitives';
import StationsTableList from '../../components/station-admin/StationsTableList';
import type { StationStatus } from '../../types/station';
import { stationStatusLabel } from '../../utils/stationLabels';
import { stationAdminPageTitle } from '../../styles/stationAdminTheme';

const MAP_LEGEND: { status: StationStatus; color: string }[] = [
  { status: 'working', color: '#16a34a' },
  { status: 'maintenance', color: '#f59e0b' },
  { status: 'offline', color: '#9ca3af' },
];

type StationMapPageProps = {
  /** Для глобального адміна: `/admin-dashboard`. */
  dashboardBase?: string;
};

export default function StationMapPage({ dashboardBase = '/station-dashboard' }: StationMapPageProps) {
  /** Карта для мережевого адміна — лише перегляд; додавання станцій з карти недоступне. */
  const isGlobalAdminMap = dashboardBase === '/admin-dashboard';
  const { mapStations: mapStationsAll, registerMapViewportBounds, getStation } = useStations();
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

  const stationDetailPath = (id: string) => `${dashboardBase}/stations/${id}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className={stationAdminPageTitle}>Карта станцій</h1>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-12 lg:items-stretch lg:gap-4">
        <AppCard
          className="flex min-h-[min(720px,85dvh)] flex-col overflow-hidden lg:col-span-8"
          padding={false}
        >
          <div className="flex flex-wrap items-center justify-end gap-3 border-b border-gray-100 px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-gray-600">
              <span className="font-medium text-gray-500">Легенда:</span>
              {MAP_LEGEND.map(({ status, color }) => (
                <span key={status} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ background: color }}
                    aria-hidden
                  />
                  {stationStatusLabel(status)}
                </span>
              ))}
            </div>
          </div>
          <div className="min-h-[400px] flex-1 p-3">
            <StationMap
              stations={mapStations}
              selectedId={selectedId ?? mapStations[0]?.id ?? ''}
              onSelect={setSelectedId}
              onViewportChange={registerMapViewportBounds}
              stationDetailPath={stationDetailPath}
            />
          </div>
        </AppCard>

        <div className="flex min-h-0 min-w-0 flex-col lg:col-span-4 lg:h-full">
          <StationsTableList
            fillHeight
            selected={selected ?? mapStations[0]}
            dashboardBase={dashboardBase}
            readOnly={isGlobalAdminMap}
          />
        </div>
      </div>
    </div>
  );
}
