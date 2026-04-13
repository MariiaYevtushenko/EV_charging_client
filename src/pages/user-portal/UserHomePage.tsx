import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStations } from '../../context/StationsContext';
import { useUserPortal } from '../../context/UserPortalContext';
import StationMap from '../../components/station-admin/StationMap';
import {
  AppCard,
  DangerButton,
  OutlineButton,
  PrimaryButton,
  StatusPill,
} from '../../components/station-admin/Primitives';
import { appPrimaryCtaClass } from '../../components/station-admin/formStyles';
import { stationStatusLabel, stationStatusTone } from '../../utils/stationLabels';

function SessionRing({ pct }: { pct: number }) {
  const r = 48;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#22c55e"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{pct}%</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">SOC</span>
      </div>
    </div>
  );
}

export default function UserHomePage() {
  const {
    mapStations: mapStationsAll,
    mapLoading,
    mapFetchLimit,
    registerMapViewportBounds,
    stationsTotal,
  } = useStations();
  const { currentSession, endCurrentSession } = useUserPortal();

  const mapStations = useMemo(() => mapStationsAll.filter((s) => !s.archived), [mapStationsAll]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (mapStations.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) =>
      prev && mapStations.some((s) => s.id === prev) ? prev : mapStations[0].id
    );
  }, [mapStations]);

  const selected = selectedId ? mapStations.find((s) => s.id === selectedId) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Карта станцій</h1>
         
        </div>
        <Link to="/dashboard/session" className={`${appPrimaryCtaClass} shrink-0`}>
          Почати зарядку
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <AppCard className="flex min-h-[420px] flex-col overflow-hidden xl:col-span-3" padding={false}>
          <div className="border-b border-gray-100 px-5 py-3">
            <p className="text-sm font-semibold text-gray-900">Станції поруч</p>
            <p className="text-xs text-gray-500">
              {mapLoading
                ? 'Завантаження видимої області…'
                : mapFetchLimit != null && mapStations.length >= mapFetchLimit
                  ? `У видимій області до ${mapFetchLimit} станцій · усього в БД: ${stationsTotal}`
                  : `У видимій області: ${mapStations.length} · усього в БД: ${stationsTotal}`}
            </p>
          </div>
          <div className="min-h-[360px] flex-1 p-3">
            <StationMap
              stations={mapStations}
              selectedId={selectedId ?? mapStations[0]?.id ?? ''}
              onSelect={setSelectedId}
              onViewportChange={registerMapViewportBounds}
            />
          </div>
        </AppCard>

        <div className="space-y-4 xl:col-span-2">
          {currentSession ? (
            <AppCard className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                    Поточна сесія
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-gray-900">{currentSession.stationName}</h2>
                  <p className="text-sm text-gray-500">{currentSession.portLabel}</p>
                </div>
              </div>
              <SessionRing pct={currentSession.progressPct} />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-gray-50 py-2">
                  <p className="text-[10px] font-medium uppercase text-gray-400">Енергія</p>
                  <p className="text-sm font-bold text-gray-900">{currentSession.kwhSoFar} кВт·год</p>
                </div>
                <div className="rounded-xl bg-gray-50 py-2">
                  <p className="text-[10px] font-medium uppercase text-gray-400">Час</p>
                  <p className="text-sm font-bold text-gray-900">{currentSession.elapsedLabel}</p>
                </div>
                <div className="rounded-xl bg-gray-50 py-2">
                  <p className="text-[10px] font-medium uppercase text-gray-400">Вартість</p>
                  <p className="text-sm font-bold text-green-700">
                    {currentSession.costSoFar.toLocaleString('uk-UA')} грн
                  </p>
                </div>
              </div>
              <DangerButton type="button" className="w-full" onClick={endCurrentSession}>
                Зупинити зарядку  
              </DangerButton>
            </AppCard>
          ) : (
            <AppCard className="space-y-3 py-8 text-center">
              <p className="text-sm font-medium text-gray-700">Немає активної зарядки</p>
              <p className="text-xs text-gray-500">Почніть зарядку з розділу нижче або через «Почати зарядку».</p>
              <Link to="/dashboard/session" className="inline-block">
                <PrimaryButton type="button" className="mx-auto">
                  До вибору станції
                </PrimaryButton>
              </Link>
            </AppCard>
          )}

          {selected ? (
            <AppCard className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-900">{selected.name}</h2>
                <StatusPill tone={stationStatusTone(selected.status)}>
                  {stationStatusLabel(selected.status)}
                </StatusPill>
              </div>
              <p className="text-sm text-gray-600">{selected.address}</p>
              <p className="text-xs text-gray-500">
                ☀ {selected.dayTariff} / 🌙 {selected.nightTariff} грн/кВт·год
              </p>
              <Link to={`/dashboard/stations/${selected.id}`}>
                <OutlineButton type="button" className="w-full">
                  Деталі станції
                </OutlineButton>
              </Link>
            </AppCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
