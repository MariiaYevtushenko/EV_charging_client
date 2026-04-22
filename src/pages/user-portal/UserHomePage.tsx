import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { StationPort } from '../../types/station';
import { useStations } from '../../context/StationsContext';
import { useUserPortal } from '../../context/UserPortalContext';
import StationMap from '../../components/station-admin/StationMap';
import StationMapLegend from '../../components/station-admin/StationMapLegend';
import {
  AppCard,
  DangerButton,
  OutlineButton,
  PrimaryButton,
  StatusPill,
} from '../../components/station-admin/Primitives';
import { appPrimaryCtaClass, appSelectClass } from '../../components/station-admin/formStyles';
import { userPortalPageTitle } from '../../styles/userPortalTheme';
import { eurToUah } from '../../utils/tariffCurrency';
import { portStatusLabel, portStatusTone, stationStatusLabel, stationStatusTone } from '../../utils/stationLabels';
import { stationAllowsUserBookingAndCharge, stationVisibleOnUserHomeMap } from '../../utils/stationUserEligibility';

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function SessionRing({ pct }: { pct: number }) {
  const r = 48;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#16a34a"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums text-slate-900">{pct}%</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">SOC</span>
      </div>
    </div>
  );
}

function portSelectable(p: StationPort): boolean {
  return p.status === 'available';
}

export default function UserHomePage() {
  const { mapStations: mapStationsAll, registerMapViewportBounds } = useStations();
  const { cars, currentSession, endCurrentSession, startSessionAtPort } = useUserPortal();

  const mapStations = useMemo(
    () => mapStationsAll.filter(stationVisibleOnUserHomeMap),
    [mapStationsAll]
  );

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
  const canBookOrChargeHere = selected ? stationAllowsUserBookingAndCharge(selected) : false;

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
    if (!canBookOrChargeHere) {
      setChargeError('Ця станція наразі не приймає бронювання та зарядку (обслуговування або недоступність).');
      return;
    }
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
      dayTariff: eurToUah(selected.dayTariff),
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
        <h1 className={userPortalPageTitle}>Карта станцій</h1>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
          Тарифи на сьогодні для обраної на карті станції — у картці справа над «Поточна зарядка» / «Немає активної зарядки».
        </p>
      </div>

      <div className="grid gap-6 lg:gap-8 xl:grid-cols-5">
        <AppCard
          className="flex min-h-[min(560px,78dvh)] flex-col overflow-hidden shadow-md shadow-slate-900/[0.04] xl:col-span-3"
          padding={false}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3">
            <StationMapLegend variant="inline" />
            <div className="relative min-h-[min(400px,55vh)] flex-1 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/80">
              <StationMap
                stations={mapStations}
                selectedId={selectedId ?? mapStations[0]?.id ?? ''}
                onSelect={setSelectedId}
                onViewportChange={registerMapViewportBounds}
                emphasizeSelected
              />
            </div>
          </div>
        </AppCard>

        <div className="flex flex-col gap-5 xl:col-span-2">
          {selected ? (
            <AppCard className="border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/40 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Тарифи на сьогодні
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                Для обраної станції: <span className="font-medium text-slate-800">{selected.name}</span>
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-amber-100/80 bg-amber-50/50 px-3 py-2 sm:flex-col sm:items-start sm:justify-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900/70">День</p>
                  <p className="text-sm font-bold tabular-nums text-slate-900 sm:mt-0.5">
                    {eurToUah(selected.dayTariff).toLocaleString('uk-UA', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    <span className="font-semibold text-slate-600">грн/кВт·год</span>
                  </p>
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-sky-100/80 bg-sky-50/50 px-3 py-2 sm:flex-col sm:items-start sm:justify-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-900/70">Ніч</p>
                  <p className="text-sm font-bold tabular-nums text-slate-900 sm:mt-0.5">
                    {eurToUah(selected.nightTariff).toLocaleString('uk-UA', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    <span className="font-semibold text-slate-600">грн/кВт·год</span>
                  </p>
                </div>
              </div>
            </AppCard>
          ) : null}

          {currentSession ? (
            <AppCard className="space-y-4 border-emerald-200/60 bg-gradient-to-b from-emerald-50/40 to-white ring-emerald-500/10">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Поточна зарядка</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">{currentSession.stationName}</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                      <MapPinIcon className="h-3.5 w-3.5" />
                    </span>
                    {currentSession.portLabel}
                  </p>
                </div>
              </div>
              <SessionRing pct={currentSession.progressPct} />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-slate-100 bg-white/80 py-2.5 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Енергія</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{currentSession.kwhSoFar} кВт·год</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white/80 py-2.5 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Час</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{currentSession.elapsedLabel}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 py-2.5 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700/80">Вартість</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-800">
                    {currentSession.costSoFar.toLocaleString('uk-UA')} грн
                  </p>
                </div>
              </div>
              <DangerButton type="button" className="w-full" onClick={endCurrentSession}>
                Зупинити зарядку
              </DangerButton>
            </AppCard>
          ) : (
            <AppCard className="border-dashed border-slate-200/90 bg-slate-50/30 py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200/80">
                <MapPinIcon className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">Немає активної зарядки</p>
              <p className="mx-auto mt-1.5 max-w-[260px] text-xs leading-relaxed text-slate-500">
                Оберіть станцію на карті — «Забронювати слот» або «Почати зарядку».
              </p>
            </AppCard>
          )}

          {selected ? (
            <AppCard className="space-y-4 shadow-md shadow-emerald-900/10 ring-2 ring-emerald-500/45 ring-offset-2 ring-offset-white transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 text-lg font-semibold leading-snug text-slate-900">{selected.name}</h2>
                <StatusPill tone={stationStatusTone(selected.status)}>
                  {stationStatusLabel(selected.status)}
                </StatusPill>
              </div>
              <p className="flex gap-2 text-sm leading-relaxed text-slate-600">
                <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>{selected.address}</span>
              </p>

              {!canBookOrChargeHere ? (
                <p className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
                  Станція на обслуговуванні (ремонт). Бронювання та зарядка на ній тимчасово недоступні — оберіть
                  іншу точку на карті.
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                {canBookOrChargeHere ? (
                  <Link
                    to={`/dashboard/bookings/new?stationId=${encodeURIComponent(selected.id)}`}
                    className={`${appPrimaryCtaClass} flex-1 text-center`}
                  >
                    Забронювати слот
                  </Link>
                ) : (
                  <span
                    className="flex-1 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-slate-400"
                    title="Недоступно для цієї станції"
                  >
                    Забронювати слот
                  </span>
                )}
                <OutlineButton
                  type="button"
                  className="flex-1"
                  disabled={!canBookOrChargeHere}
                  onClick={() => {
                    if (!canBookOrChargeHere) return;
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
                    <label htmlFor="home-charge-conn" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Порт</p>
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
