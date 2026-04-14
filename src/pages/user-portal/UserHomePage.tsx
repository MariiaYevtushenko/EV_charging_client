import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { StationPort } from '../../types/station';
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
import { appPrimaryCtaClass, appSelectClass } from '../../components/station-admin/formStyles';
import { portStatusLabel, portStatusTone, stationStatusLabel, stationStatusTone } from '../../utils/stationLabels';

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

function portSelectable(p: StationPort): boolean {
  return p.status === 'available';
}

export default function UserHomePage() {
  const {
    mapStations: mapStationsAll,
    mapLoading,
    mapFetchLimit,
    registerMapViewportBounds,
    stationsTotal,
  } = useStations();
  const { cars, currentSession, endCurrentSession, startSessionAtPort } = useUserPortal();

  const mapStations = useMemo(() => mapStationsAll.filter((s) => !s.archived), [mapStationsAll]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chargeConnector, setChargeConnector] = useState('all');
  const [chargePortId, setChargePortId] = useState<string | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeError, setChargeError] = useState<string | null>(null);

  const connectorOptions = useMemo(() => {
    const fromCars = [...new Set(cars.map((c) => c.connector))];
    const list: { value: string; label: string }[] = [{ value: 'all', label: 'Усі типи портів' }];
    for (const c of fromCars) list.push({ value: c, label: `${c} (мої авто)` });
    for (const c of ['Type 2', 'CCS2', 'CHAdeMO']) {
      if (!fromCars.includes(c)) list.push({ value: c, label: c });
    }
    return list;
  }, [cars]);

  useEffect(() => {
    if (mapStations.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) =>
      prev && mapStations.some((s) => s.id === prev) ? prev : mapStations[0].id
    );
  }, [mapStations]);

  useEffect(() => {
    setChargeOpen(false);
    setChargePortId(null);
    setChargeError(null);
  }, [selectedId]);

  const selected = selectedId ? mapStations.find((s) => s.id === selectedId) : undefined;

  const portsForCharge = useMemo(() => {
    if (!selected) return [];
    if (chargeConnector === 'all') return selected.ports;
    return selected.ports.filter((p) => p.connector === chargeConnector);
  }, [selected, chargeConnector]);

  const effectiveChargePortId = useMemo(() => {
    if (portsForCharge.length === 0) return null;
    if (chargePortId && portsForCharge.some((p) => p.id === chargePortId)) return chargePortId;
    const free = portsForCharge.find(portSelectable);
    return free?.id ?? portsForCharge[0].id;
  }, [portsForCharge, chargePortId]);

  const selectedChargePort = effectiveChargePortId
    ? portsForCharge.find((p) => p.id === effectiveChargePortId)
    : undefined;

  const handleStartCharge = () => {
    setChargeError(null);
    if (!selected || !selectedChargePort) return;
    if (!portSelectable(selectedChargePort)) {
      setChargeError('Оберіть вільний порт.');
      return;
    }
    if (currentSession) {
      setChargeError('Спочатку завершіть поточну сесію кнопкою «Зупинити зарядку».');
      return;
    }
    const ok = startSessionAtPort({
      stationId: selected.id,
      stationName: selected.name,
      portLabel: `${selectedChargePort.label} · ${selectedChargePort.connector}`,
      dayTariff: selected.dayTariff,
    });
    if (ok) {
      setChargeOpen(false);
      setChargePortId(null);
    } else {
      setChargeError('Не вдалося стартувати сесію (можливо, вже є активна зарядка).');
    }
  };

  const selectClass = appSelectClass;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Карта станцій</h1>
        <p className="mt-1 text-sm text-gray-500">
          Оберіть маркер на карті — далі можна забронювати слот або почати зарядку на цій станції.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <AppCard className="flex min-h-[min(520px,72dvh)] flex-col overflow-hidden xl:col-span-3" padding={false}>
          <div className="border-b border-gray-100 px-5 py-3">
            <p className="text-sm font-semibold text-gray-900">Карта</p>
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
            <AppCard className="space-y-3 py-6 text-center">
              <p className="text-sm font-medium text-gray-700">Немає активної зарядки</p>
              <p className="text-xs text-gray-500">
                Оберіть станцію на карті та натисніть «Почати зарядку» або «Забронювати слот».
              </p>
            </AppCard>
          )}

          {selected ? (
            <AppCard className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold text-gray-900">{selected.name}</h2>
                <StatusPill tone={stationStatusTone(selected.status)}>
                  {stationStatusLabel(selected.status)}
                </StatusPill>
              </div>
              <p className="text-sm text-gray-600">{selected.address}</p>
              <p className="text-xs text-gray-500">
                ☀ {selected.dayTariff} / 🌙 {selected.nightTariff} грн/кВт·год
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  to={`/dashboard/bookings/new?stationId=${encodeURIComponent(selected.id)}`}
                  className={`${appPrimaryCtaClass} flex-1 text-center`}
                >
                  Забронювати слот
                </Link>
                <OutlineButton
                  type="button"
                  className="flex-1"
                  onClick={() => {
                    setChargeOpen((o) => !o);
                    setChargeError(null);
                  }}
                >
                  {chargeOpen ? 'Згорнути' : 'Почати зарядку'}
                </OutlineButton>
              </div>

              {chargeOpen ? (
                <div className="space-y-3 border-t border-emerald-100/80 pt-4">
                  <div>
                    <label htmlFor="home-charge-conn" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Тип порту
                    </label>
                    <select
                      id="home-charge-conn"
                      value={chargeConnector}
                      onChange={(e) => {
                        setChargeConnector(e.target.value);
                        setChargePortId(null);
                        setChargeError(null);
                      }}
                      className={`mt-1.5 ${selectClass}`}
                    >
                      {connectorOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Порт</p>
                    <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                      {portsForCharge.map((p) => {
                        const ok = portSelectable(p);
                        const active = effectiveChargePortId === p.id;
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              disabled={!ok}
                              onClick={() => {
                                if (ok) {
                                  setChargePortId(p.id);
                                  setChargeError(null);
                                }
                              }}
                              className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                                active
                                  ? 'border-green-500 bg-emerald-50/60 ring-1 ring-green-500/30'
                                  : ok
                                    ? 'border-gray-200 bg-white hover:border-green-200'
                                    : 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-60'
                              }`}
                            >
                              <span className="font-medium text-gray-900">
                                {p.label} · {p.connector} · {p.powerKw} кВт
                              </span>
                              <StatusPill tone={portStatusTone(p.status)}>{portStatusLabel(p.status)}</StatusPill>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {portsForCharge.length === 0 ? (
                      <p className="mt-2 text-xs text-amber-800">Немає портів обраного типу.</p>
                    ) : null}
                  </div>

                  {chargeError ? <p className="text-sm text-red-700">{chargeError}</p> : null}

                  <PrimaryButton
                    type="button"
                    className="w-full"
                    disabled={
                      !selectedChargePort ||
                      !portSelectable(selectedChargePort) ||
                      !!currentSession
                    }
                    onClick={handleStartCharge}
                  >
                    Почати заряджати
                  </PrimaryButton>
                </div>
              ) : null}

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
