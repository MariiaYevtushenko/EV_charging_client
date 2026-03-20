import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStations } from '../../context/StationsContext';
import StationFiltersBar from '../../components/station-admin/StationFiltersBar';
import StationMap from '../../components/station-admin/StationMap';
import { AppCard, OutlineButton, PrimaryButton, StatusPill } from '../../components/station-admin/Primitives';
import { stationStatusLabel, stationStatusTone } from '../../utils/stationLabels';

export default function StationAdminHome() {
  const navigate = useNavigate();
  const { stations, filteredStations, getStation } = useStations();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mapStations = useMemo(
    () => filteredStations.filter((s) => !s.archived),
    [filteredStations]
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

  const selected = selectedId ? getStation(selectedId) : undefined;

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
              <span className="text-sm font-semibold text-gray-900">OpenStreetMap · CARTO Light</span>
              <p className="text-xs text-gray-500">
                На карті: {mapStations.length} активних
                {stations.length !== mapStations.length ? ` · усього в базі ${stations.length}` : ''}
              </p>
            </div>
          </div>
          <div className="min-h-[400px] flex-1 p-3">
            {mapStations.length === 0 ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-200/70 bg-emerald-50/30 px-6 text-center text-sm text-gray-500">
                <p>Немає активних станцій (усі в архіві або фільтр міста порожній).</p>
                <p className="text-xs">Оберіть «Усі міста», відкрийте список або додайте станцію.</p>
              </div>
            ) : (
              <StationMap
                stations={mapStations}
                selectedId={selectedId ?? mapStations[0].id}
                onSelect={setSelectedId}
              />
            )}
          </div>
        </AppCard>

        <div className="space-y-4 lg:col-span-2">
          {selected ? (
            <AppCard className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {selected.city}
                  </p>
                  <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-gray-500">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {selected.address}
                  </p>
                </div>
                <StatusPill tone={stationStatusTone(selected.status)}>
                  {stationStatusLabel(selected.status)}
                </StatusPill>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Дохід сьогодні</p>
                  <p className="text-lg font-bold text-gray-900">
                    {selected.todayRevenue.toLocaleString('uk-UA')} грн
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Сесії сьогодні</p>
                  <p className="text-lg font-bold text-gray-900">{selected.todaySessions}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                <PrimaryButton
                  type="button"
                  onClick={() => navigate(`/station-dashboard/stations/${selected.id}`)}
                >
                  Переглянути детально
                </PrimaryButton>
                <OutlineButton
                  type="button"
                  onClick={() => navigate(`/station-dashboard/stations/${selected.id}/edit`)}
                >
                  Редагувати
                </OutlineButton>
              </div>
            </AppCard>
          ) : (
            <AppCard className="py-10 text-center text-sm text-gray-500">
              Немає станції для перегляду.
            </AppCard>
          )}
        </div>
      </div>
    </div>
  );
}
