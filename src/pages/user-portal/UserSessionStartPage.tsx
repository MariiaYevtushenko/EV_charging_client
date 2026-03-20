import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Station, StationPort } from '../../types/station';
import { useStations } from '../../context/StationsContext';
import { useUserPortal } from '../../context/UserPortalContext';
import StationMap from '../../components/station-admin/StationMap';
import { AppCard, PrimaryButton, StatusPill } from '../../components/station-admin/Primitives';
import { appSelectClass } from '../../components/station-admin/formStyles';
import { portStatusLabel, portStatusTone } from '../../utils/stationLabels';

function stationMatchesConnector(station: Station, connector: string): boolean {
  if (connector === 'all') return true;
  return station.ports.some((p) => p.connector === connector);
}

function portSelectable(p: StationPort): boolean {
  return p.status === 'available';
}

export default function UserSessionStartPage() {
  const navigate = useNavigate();
  const { stations: allStations } = useStations();
  const { cars, currentSession, startSessionAtPort } = useUserPortal();

  const connectorOptions = useMemo(() => {
    const fromCars = [...new Set(cars.map((c) => c.connector))];
    const list: { value: string; label: string }[] = [{ value: 'all', label: 'Усі типи портів' }];
    for (const c of fromCars) list.push({ value: c, label: `${c} (мої авто)` });
    for (const c of ['Type 2', 'CCS2', 'CHAdeMO']) {
      if (!fromCars.includes(c)) list.push({ value: c, label: c });
    }
    return list;
  }, [cars]);

  const [connector, setConnector] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [portId, setPortId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mapStations = useMemo(
    () =>
      allStations.filter(
        (s) => !s.archived && s.status === 'working' && stationMatchesConnector(s, connector)
      ),
    [allStations, connector]
  );

  const effectiveStationId = useMemo(() => {
    if (mapStations.length === 0) return null;
    if (selectedId && mapStations.some((s) => s.id === selectedId)) return selectedId;
    return mapStations[0].id;
  }, [mapStations, selectedId]);

  const selected = effectiveStationId
    ? mapStations.find((s) => s.id === effectiveStationId)
    : undefined;

  const portsForStation = useMemo(() => {
    if (!selected) return [];
    if (connector === 'all') return selected.ports;
    return selected.ports.filter((p) => p.connector === connector);
  }, [selected, connector]);

  const effectivePortId = useMemo(() => {
    if (portsForStation.length === 0) return null;
    if (portId && portsForStation.some((p) => p.id === portId)) return portId;
    const free = portsForStation.find(portSelectable);
    return free?.id ?? portsForStation[0].id;
  }, [portsForStation, portId]);

  const selectedPort = effectivePortId
    ? portsForStation.find((p) => p.id === effectivePortId)
    : undefined;

  const handleStart = () => {
    setError(null);
    if (!selected || !selectedPort) return;
    if (!portSelectable(selectedPort)) {
      setError('Оберіть вільний порт.');
      return;
    }
    if (currentSession) {
      setError('Спочатку завершіть поточну сесію на головній або натисніть «Зупинити зарядку».');
      return;
    }
    const ok = startSessionAtPort({
      stationId: selected.id,
      stationName: selected.name,
      portLabel: `${selectedPort.label} · ${selectedPort.connector}`,
      dayTariff: selected.dayTariff,
    });
    if (ok) navigate('/dashboard');
    else setError('Не вдалося стартувати сесію (можливо, вже є активна зарядка).');
  };

  const selectClass = appSelectClass;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard" className="text-sm font-medium text-green-600 hover:text-green-700">
          ← На головну
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Почати зарядку</h1>
        <p className="mt-1 text-sm text-gray-500">
          Оберіть станцію на карті та порт. Зарядка стартує в демо-режимі (стан поточної сесії на головній).
        </p>
      </div>

      {currentSession ? (
        <AppCard className="border-amber-200 bg-amber-50 !p-4 text-sm text-amber-950">
          Зараз активна сесія на «{currentSession.stationName}». Перейдіть на{' '}
          <Link to="/dashboard" className="font-semibold underline">
            головну
          </Link>
          , щоб зупинити її, або продовжуйте там.
        </AppCard>
      ) : null}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch">
        <aside className="w-full shrink-0 xl:order-2 xl:sticky xl:top-0 xl:w-[400px] xl:self-start">
          <AppCard className="space-y-5 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Параметри зарядки</h2>
              <p className="mt-0.5 text-xs text-gray-500">Порт під ваше авто та вибір конектора на станції</p>
            </div>

            <div>
              <label htmlFor="sess-conn" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Тип порту
              </label>
              <select
                id="sess-conn"
                value={connector}
                onChange={(e) => {
                  setConnector(e.target.value);
                  setSelectedId(null);
                  setPortId(null);
                  setError(null);
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

            {selected ? (
              <>
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-400">Станція</p>
                  <p className="mt-1 font-bold text-gray-900">{selected.name}</p>
                  <p className="text-xs text-gray-600">{selected.address}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    Тариф: {selected.dayTariff} грн/кВт·год (день)
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Порт</p>
                  <ul className="mt-2 space-y-2">
                    {portsForStation.map((p) => {
                      const ok = portSelectable(p);
                      const active = effectivePortId === p.id;
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            disabled={!ok}
                            onClick={() => {
                              if (ok) {
                                setPortId(p.id);
                                setError(null);
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
                  {portsForStation.length === 0 ? (
                    <p className="mt-2 text-xs text-amber-800">Немає портів обраного типу.</p>
                  ) : null}
                </div>

                {error ? <p className="text-sm text-red-700">{error}</p> : null}

                <PrimaryButton
                  type="button"
                  className="w-full"
                  disabled={!selectedPort || !portSelectable(selectedPort) || !!currentSession}
                  onClick={handleStart}
                >
                  Почати заряджати
                </PrimaryButton>
              </>
            ) : (
              <p className="text-sm text-gray-500">Оберіть станцію на карті.</p>
            )}
          </AppCard>
        </aside>

        <div className="min-w-0 flex-1 xl:order-1">
          <AppCard className="min-h-[420px]" padding={false}>
            <div className="border-b border-gray-100 px-5 py-3">
              <p className="text-sm font-semibold text-gray-900">Карта</p>
              <p className="text-xs text-gray-500">Торкніться маркера, щоб обрати станцію</p>
            </div>
            <div className="p-3">
              {mapStations.length === 0 ? (
                <div className="flex h-[360px] items-center justify-center text-sm text-gray-500">
                  Немає станцій з обраним типом порту.
                </div>
              ) : (
                <StationMap
                  stations={mapStations}
                  selectedId={effectiveStationId ?? mapStations[0].id}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setPortId(null);
                    setError(null);
                  }}
                />
              )}
            </div>
          </AppCard>
        </div>
      </div>
    </div>
  );
}
