import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStations } from '../../context/StationsContext';
import { useStationAdminNetwork } from '../../context/StationAdminNetworkContext';
import AdminListPagination from '../../components/admin/AdminListPagination';
import StationFiltersBar from '../../components/station-admin/StationFiltersBar';
import StationMap from '../../components/station-admin/StationMap';
import { AppCard } from '../../components/station-admin/Primitives';
import StationsTableList from '../../components/station-admin/StationsTableList';

export default function StationAdminHome() {
  const { bookings, sessions, loading: networkLoading } = useStationAdminNetwork();
  const {
    mapStations: mapStationsAll,
    mapLoading,
    mapFetchLimit,
    registerMapViewportBounds,
    getStation,
    stationsPage,
    stationsTotal,
    stationsPageSize,
    setStationsPage,
  } = useStations();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId ? getStation(selectedId) : undefined;

  const mapStations = useMemo(
    () => mapStationsAll.filter((s) => !s.archived),
    [mapStationsAll]
  );

  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status === 'active').length,
    [sessions]
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
        <p className="mt-1 text-sm text-gray-500">
          Огляд мережі, бронювання та сесії в одному кабінеті.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Бронювання</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {networkLoading ? '…' : bookings.length}
          </p>
          <Link
            to="/station-dashboard/bookings"
            className="mt-2 inline-block text-sm font-semibold text-green-700 hover:text-green-800"
          >
            Переглянути список
          </Link>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сесії (усі)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {networkLoading ? '…' : sessions.length}
          </p>
          <p className="mt-1 text-xs text-gray-500">Активних зараз: {networkLoading ? '…' : activeSessions}</p>
          <Link
            to="/station-dashboard/sessions"
            className="mt-2 inline-block text-sm font-semibold text-green-700 hover:text-green-800"
          >
            Переглянути список
          </Link>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Аналітика</p>
          <p className="mt-1 text-sm text-gray-600">Дохід і сесії по станціях, графіки.</p>
          <Link
            to="/station-dashboard/analytics"
            className="mt-3 inline-block text-sm font-semibold text-green-700 hover:text-green-800"
          >
            Відкрити аналітику
          </Link>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Станції в БД</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stationsTotal}</p>
          <Link
            to="/station-dashboard/stations"
            className="mt-2 inline-block text-sm font-semibold text-green-700 hover:text-green-800"
          >
            Список станцій
          </Link>
        </AppCard>
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

      <AdminListPagination
        page={stationsPage}
        pageSize={stationsPageSize}
        total={stationsTotal}
        onPageChange={setStationsPage}
      />
    </div>
  );
}
