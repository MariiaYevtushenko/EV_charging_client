import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { StationPort } from '../../types/station';
import { useAuth } from '../../context/AuthContext';
import { useStations } from '../../context/StationsContext';
import {
  ACTIVE_SESSION_START_BLOCK_UK,
  useUserPortal,
} from '../../context/UserPortalContext';
import { completeUserSession } from '../../api/userSessions';
import { userFacingApiErrorMessage } from '../../api/http';
import { prefetchSessionCompleteNotificationPermission } from '../../utils/sessionCompleteNotifications';
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
import { useTodayGridTariffsFromDb } from '../../hooks/useTodayGridTariffsFromDb';
import { portStatusLabel, portStatusTone, stationStatusLabel, stationStatusTone } from '../../utils/stationLabels';
import { stationAllowsUserBookingAndCharge, stationVisibleOnUserHomeMap } from '../../utils/stationUserEligibility';
import { liveKwhSoFarAt } from '../../utils/liveSessionKwh';

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

function formatElapsedMs(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function UserHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mapStations: mapStationsAll, registerMapViewportBounds, getStation, reload: reloadStations } =
    useStations();
  const { cars, sessions, reloadSessionsAndPayments, startSessionAtPort } = useUserPortal();
  const { data: todayTariffs, loading: todayTariffsLoading, error: todayTariffsError } =
    useTodayGridTariffsFromDb();

  const mapStations = useMemo(
    () => mapStationsAll.filter(stationVisibleOnUserHomeMap),
    [mapStationsAll]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chargeConnector, setChargeConnector] = useState('all');
  const [chargePortId, setChargePortId] = useState<string | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeVehicleId, setChargeVehicleId] = useState<string | null>(null);
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [endSessionError, setEndSessionError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const activeSession = useMemo(
    () => sessions.find((s) => s.status === 'active') ?? null,
    [sessions]
  );

  useEffect(() => {
    if (!activeSession) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession) return;
    const t = setInterval(() => {
      void reloadSessionsAndPayments();
    }, 30000);
    return () => clearInterval(t);
  }, [activeSession, reloadSessionsAndPayments]);

  useEffect(() => {
    if (activeSession && chargeOpen) {
      setChargeOpen(false);
      setChargePortId(null);
      setChargeError(null);
    }
  }, [activeSession, chargeOpen]);

  const liveSessionDisplay = useMemo(() => {
    if (!activeSession) return null;
    const started = new Date(activeSession.startedAt).getTime();
    const elapsedMs = Number.isFinite(started) ? Math.max(0, nowTick - started) : 0;
    const progressPct = Math.min(99, Math.max(3, (elapsedMs / (4 * 3600 * 1000)) * 100));
    const kwhSoFar = liveKwhSoFarAt(activeSession, nowTick, getStation);
    return {
      stationName: activeSession.stationName,
      portLabel: activeSession.portLabel,
      progressPct,
      kwhSoFar,
      elapsedLabel: formatElapsedMs(elapsedMs),
    };
  }, [activeSession, nowTick, getStation]);

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
    setSelectedId((prev) => {
      if (activeSession && mapStations.some((s) => s.id === activeSession.stationId)) {
        return activeSession.stationId;
      }
      if (prev && mapStations.some((s) => s.id === prev)) return prev;
      return mapStations[0]!.id;
    });
  }, [mapStations, activeSession]);

  useEffect(() => {
    setChargeOpen(false);
    setChargePortId(null);
    setChargeVehicleId(null);
    setChargeError(null);
  }, [selectedId]);

  useEffect(() => {
    if (!chargeOpen) return;
    if (cars.length === 0) {
      setChargeVehicleId(null);
      return;
    }
    if (cars.length === 1) {
      setChargeVehicleId(cars[0]!.id);
      return;
    }
    setChargeVehicleId((prev) => (prev && cars.some((c) => c.id === prev) ? prev : null));
  }, [chargeOpen, cars]);

  const selected = selectedId ? mapStations.find((s) => s.id === selectedId) : undefined;
  const canBookOrChargeHere = selected ? stationAllowsUserBookingAndCharge(selected) : false;

  const portsForCharge = useMemo(() => {
    if (!selected) return [];
    if (chargeConnector === 'all') return selected.ports;
    return selected.ports.filter((p) => p.connector === chargeConnector);
  }, [selected, chargeConnector]);

  const effectiveChargePortId = useMemo(() => {
    if (portsForCharge.length === 0) return null;
    if (chargePortId) {
      const chosen = portsForCharge.find((p) => p.id === chargePortId);
      if (chosen && portSelectable(chosen)) return chargePortId;
    }
    const free = portsForCharge.find(portSelectable);
    return free?.id ?? null;
  }, [portsForCharge, chargePortId]);

  const selectedChargePort = effectiveChargePortId
    ? portsForCharge.find((p) => p.id === effectiveChargePortId)
    : undefined;

  const resolvedChargeVehicleId = useMemo(() => {
    if (cars.length === 0) return null;
    if (cars.length === 1) return cars[0]!.id;
    return chargeVehicleId && cars.some((c) => c.id === chargeVehicleId) ? chargeVehicleId : null;
  }, [cars, chargeVehicleId]);

  const handleStartCharge = async () => {
    setChargeError(null);
    if (!selected || !selectedChargePort) {
      if (selected && portsForCharge.length > 0 && !portsForCharge.some(portSelectable)) {
        setChargeError('Усі порти обраного типу зайняті або недоступні — оберіть інший тип конектора чи станцію');
      }
      return;
    }
    if (!canBookOrChargeHere) {
      setChargeError('Ця станція наразі не приймає бронювання та зарядку (обслуговування або недоступність)');
      return;
    }
    if (!portSelectable(selectedChargePort)) {
      setChargeError('Оберіть вільний порт');
      return;
    }
    if (activeSession) {
      setChargeError(ACTIVE_SESSION_START_BLOCK_UK);
      return;
    }
    if (cars.length === 0) {
      setChargeError('Додайте авто в розділі «Мої авто», щоб почати зарядку');
      return;
    }
    if (!resolvedChargeVehicleId) {
      setChargeError('Оберіть автомобіль, який заряджаєте');
      return;
    }
    const portNumber = selectedChargePort.portNumber;
    if (!Number.isFinite(portNumber) || (portNumber as number) <= 0) {
      setChargeError('Не вдалося визначити номер порту. Оновіть сторінку або оберіть іншу станцію');
      return;
    }
    try {
      await startSessionAtPort({
        stationId: selected.id,
        portNumber: portNumber as number,
        stationName: selected.name,
        portLabel: `${selectedChargePort.label} · ${selectedChargePort.connector}`,
        vehicleId: resolvedChargeVehicleId,
      });
      setChargeOpen(false);
      setChargePortId(null);
      setChargeVehicleId(null);
    } catch (e) {
      setChargeError(userFacingApiErrorMessage(e, 'Не вдалося стартувати сесію'));
    }
  };

  const handleConfirmEndSession = async () => {
    if (!activeSession) return;
    const uid = Number(user?.id);
    if (!Number.isFinite(uid)) return;
    const completedSessionId = String(activeSession.id);
    setEndSessionError(null);
    setEndingSession(true);
    try {
      await completeUserSession(uid, Number(activeSession.id), {
        kwhConsumed: Math.max(0, liveKwhSoFarAt(activeSession, nowTick, getStation)),
      });
      setConfirmEndOpen(false);
      await reloadSessionsAndPayments();
      window.setTimeout(() => {
        void navigate(`/dashboard/sessions/${completedSessionId}`, {
          replace: false,
          state: { showSessionCompleteHints: true },
        });
      }, 80);
    } catch (e) {
      setEndSessionError(userFacingApiErrorMessage(e, 'Не вдалося завершити сесію'));
    } finally {
      setEndingSession(false);
    }
  };

  const selectClass = appSelectClass;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={userPortalPageTitle}>Карта станцій</h1>
       
      </div>

      <div className="grid gap-6 lg:gap-8 xl:grid-cols-5 xl:items-stretch">
        <AppCard
          className="flex min-h-[min(560px,78dvh)] flex-col overflow-hidden shadow-md shadow-slate-900/[0.04] xl:sticky xl:top-6 xl:col-span-3 xl:min-h-0 xl:h-[calc(100dvh-11rem)] xl:max-h-[calc(100dvh-11rem)]"
          padding={false}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3">
            <StationMapLegend variant="inline" />
            <div className="relative min-h-[min(400px,55vh)] flex-1 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/80 xl:min-h-0">
              <StationMap
                stations={mapStations}
                selectedId={selectedId ?? mapStations[0]?.id ?? ''}
                onSelect={setSelectedId}
                onViewportChange={registerMapViewportBounds}
                emphasizeSelected
                mapPinContext="userPortal"
                userActiveChargingStationId={activeSession?.stationId ?? null}
              />
            </div>
          </div>
        </AppCard>

        <div className="flex min-h-0 flex-col gap-5 xl:col-span-2 xl:h-[calc(100dvh-11rem)] xl:max-h-[calc(100dvh-11rem)] xl:overflow-y-auto xl:overflow-x-hidden xl:overscroll-y-contain xl:pr-1">
          {selected ? (
            <AppCard className="border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/40 px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Тарифи на сьогодні (БД)
                </p>
                {todayTariffs?.date ? (
                  <p className="text-[10px] tabular-nums text-slate-400">{todayTariffs.date}</p>
                ) : null}
              </div>
              {todayTariffsError ? (
                <p className="mt-2 text-xs text-amber-800">{todayTariffsError}</p>
              ) : null}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-amber-100/80 bg-amber-50/50 px-3 py-2 sm:flex-col sm:items-start sm:justify-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900/70">День</p>
                  <p className="text-sm font-bold tabular-nums text-slate-900 sm:mt-0.5">
                    {todayTariffsLoading
                      ? '…'
                      : (todayTariffs?.dayPriceUah ?? 0).toLocaleString('uk-UA', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                    <span className="font-semibold text-slate-600">грн/кВт·год</span>
                  </p>
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-sky-100/80 bg-sky-50/50 px-3 py-2 sm:flex-col sm:items-start sm:justify-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-900/70">Ніч</p>
                  <p className="text-sm font-bold tabular-nums text-slate-900 sm:mt-0.5">
                    {todayTariffsLoading
                      ? '…'
                      : (todayTariffs?.nightPriceUah ?? 0).toLocaleString('uk-UA', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                    <span className="font-semibold text-slate-600">грн/кВт·год</span>
                  </p>
                </div>
              </div>
            </AppCard>
          ) : null}

          {liveSessionDisplay ? (
            <AppCard className="space-y-4 border-emerald-200/60 bg-gradient-to-b from-emerald-50/40 to-white ring-emerald-500/10">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Поточна зарядка</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">{liveSessionDisplay.stationName}</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                      <MapPinIcon className="h-3.5 w-3.5" />
                    </span>
                    {liveSessionDisplay.portLabel}
                  </p>
                </div>
              </div>
              <SessionRing pct={liveSessionDisplay.progressPct} />
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl border border-slate-100 bg-white/80 py-2.5 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Енергія</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
                    {liveSessionDisplay.kwhSoFar.toLocaleString('uk-UA', { maximumFractionDigits: 3 })} кВт·год
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white/80 py-2.5 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Час</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{liveSessionDisplay.elapsedLabel}</p>
                </div>
              </div>
              <DangerButton
                type="button"
                className="w-full"
                onClick={() => {
                  setEndSessionError(null);
                  prefetchSessionCompleteNotificationPermission();
                  setConfirmEndOpen(true);
                }}
              >
                Завершити сесію
              </DangerButton>
            </AppCard>
          ) : (
            <AppCard className="border-dashed border-slate-200/90 bg-slate-50/30 py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200/80">
                <MapPinIcon className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">Немає активної зарядки</p>
              <p className="mx-auto mt-1.5 max-w-[260px] text-xs leading-relaxed text-slate-500">
                Оберіть станцію на карті — «Забронювати слот» або «Почати зарядку»
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
                  іншу точку на карті
                </p>
              ) : null}

              {activeSession ? (
                <p
                  className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-sm leading-relaxed text-amber-950"
                  role="status"
                >
                  <span className="font-semibold">Уже триває зарядка</span> на «{activeSession.stationName}». Почати ще
                  одну сесію на цій або іншій станції неможливо, доки не завершите поточну — скористайтеся блоком
                  «Поточна зарядка» вище та кнопкою «Завершити сесію»
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
                  disabled={!canBookOrChargeHere || !!activeSession}
                  title={
                    !canBookOrChargeHere
                      ? 'Недоступно для цієї станції'
                      : activeSession
                        ? 'Неможливо почати нову сесію, поки триває поточна зарядка'
                        : undefined
                  }
                  onClick={() => {
                    void (async () => {
                      if (!canBookOrChargeHere) return;
                      const fresh = await reloadSessionsAndPayments();
                      if (fresh.some((s) => s.status === 'active')) {
                        setChargeOpen(false);
                        setChargeError(ACTIVE_SESSION_START_BLOCK_UK);
                        return;
                      }
                      await reloadStations();
                      setChargeOpen((o) => !o);
                      setChargeError(null);
                    })();
                  }}
                >
                  {chargeOpen ? 'Згорнути' : 'Почати зарядку'}
                </OutlineButton>
              </div>

              {chargeOpen ? (
                <div className="space-y-3 border-t border-emerald-100/80 pt-4">
                  <div>
                    <label
                      htmlFor="home-charge-vehicle"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Яке авто заряджаєте?
                    </label>
                    {cars.length === 0 ? (
                      <p className="mt-2 text-sm text-amber-800">
                        У гаражі немає авто.{' '}
                        <Link
                          to="/dashboard/cars"
                          className="font-semibold text-emerald-800 underline hover:text-emerald-950"
                        >
                          Додайте авто
                        </Link>
                        , щоб почати зарядку
                      </p>
                    ) : (
                      <select
                        id="home-charge-vehicle"
                        value={chargeVehicleId ?? (cars.length === 1 ? cars[0]!.id : '')}
                        onChange={(e) => {
                          const v = e.target.value;
                          setChargeVehicleId(v || null);
                          setChargeError(null);
                        }}
                        className={`mt-1.5 ${selectClass}`}
                      >
                        {cars.length > 1 ? <option value="">— Оберіть авто —</option> : null}
                        {cars.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.plate} · {c.model}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

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
                      <p className="mt-2 text-xs text-amber-800">Немає портів обраного типу</p>
                    ) : null}
                    {portsForCharge.length > 0 && !portsForCharge.some(portSelectable) ? (
                      <p className="mt-2 text-xs text-amber-900">
                        Усі порти цього типу зайняті або недоступні (статус «Зайнятий» / «Недоступний») — оберіть інший
                        конектор або станцію.
                      </p>
                    ) : null}
                  </div>

                  {chargeError ? <p className="text-sm text-red-700">{chargeError}</p> : null}

                  <PrimaryButton
                    type="button"
                    className="w-full"
                    disabled={
                      !selectedChargePort ||
                      !portSelectable(selectedChargePort) ||
                      !!activeSession ||
                      cars.length === 0 ||
                      !resolvedChargeVehicleId
                    }
                    onClick={() => {
                      void handleStartCharge();
                    }}
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

      {confirmEndOpen && activeSession ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => !endingSession && setConfirmEndOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-end-session-title"
            className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-end-session-title" className="text-lg font-bold text-slate-900">
              Завершити зарядку?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Ви точно хочете завершити сесію на станції «{activeSession.stationName}»? Буде створено рахунок за
              спожиту енергію
            </p>
            {endSessionError ? <p className="mt-3 text-sm text-red-700">{endSessionError}</p> : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <OutlineButton
                type="button"
                className="sm:min-w-[120px]"
                disabled={endingSession}
                onClick={() => setConfirmEndOpen(false)}
              >
                Скасувати
              </OutlineButton>
              <DangerButton
                type="button"
                className="sm:min-w-[160px]"
                disabled={endingSession}
                onClick={() => void handleConfirmEndSession()}
              >
                {endingSession ? 'Завершення…' : 'Так, завершити'}
              </DangerButton>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
