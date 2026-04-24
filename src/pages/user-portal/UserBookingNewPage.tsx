import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { stationAllowsUserBookingAndCharge } from '../../utils/stationUserEligibility';
import type { Station, StationPort } from '../../types/station';
import { useAuth } from '../../context/AuthContext';
import { useStations } from '../../context/StationsContext';
import { useUserPortal } from '../../context/UserPortalContext';
import { ASSUMED_CHARGE_KW, RESERVATION_FEE_UAH } from '../../config/publicEnv';
import {
  fetchStationAvailableBookingSlots,
  fetchStationBookingDayLoad,
} from '../../api/stations';
import { createUserBooking, fetchUserBookings } from '../../api/userReads';
import { mapBookingApiToUserBooking } from '../../api/userPortalMappers';
import StationMap from '../../components/station-admin/StationMap';
import StationMapLegend from '../../components/station-admin/StationMapLegend';
import { AppCard, PrimaryButton } from '../../components/station-admin/Primitives';
import {
  appChipIdleClass,
  appChipSelectedClass,
  appChipSlotAvailableClass,
  appSecondaryCtaClass,
} from '../../components/station-admin/formStyles';
import type { UserBookingPricingModel } from '../../types/userPortal';
import { userPortalListPageShell, userPortalPageTitle } from '../../styles/userPortalTheme';
import {
  buildHalfHourStarts,
  localHmFromMs,
  localYmd,
  SLOT_MINUTES,
} from '../../utils/bookingSlotGrid';
import { eurToUah } from '../../utils/tariffCurrency';
import { useTodayGridTariffsFromDb } from '../../hooks/useTodayGridTariffsFromDb';

const CALENDAR_DAY_COUNT = 21;

const DURATIONS = [
  { min: 30, label: '30 хв' },
  { min: 60, label: '1 год' },
  { min: 90, label: '1,5 год' },
  { min: 120, label: '2 год' },
  { min: 180, label: '3 год' },
] as const;

function portNumberOf(station: Station, p: StationPort): number {
  const idx = station.ports.indexOf(p);
  return p.portNumber ?? (idx >= 0 ? idx + 1 : 1);
}

function portSelectable(p: StationPort): boolean {
  return p.status === 'available';
}

function estimatedKwhForBooking(
  durationMin: number,
  batteryKwh: number | undefined,
  chargeKw: number
): number {
  const hours = durationMin / 60;
  const raw = hours * chargeKw;
  if (batteryKwh != null && Number.isFinite(batteryKwh) && batteryKwh > 0) {
    return Math.min(raw, batteryKwh);
  }
  return raw;
}

/** Вікно нічного тарифу (узгоджено з `bookingPricingService` на сервері). */
function isNightHourLocal(hour: number): boolean {
  const start = 23;
  const endExclusive = 7;
  return hour >= start || hour < endExclusive;
}

/** Базовий тариф мережі з публічного API (день/ніч за часом слоту); одиниця — EUR або грн залежно від VITE_BOOKING_GRID_TARIFF_IN_EUR. */
function baseTariffFromGrid(
  tariffs: { dayPriceUah: number; nightPriceUah: number } | null,
  slotStartMs: number | null
): number {
  if (!tariffs) return 0;
  if (slotStartMs == null) {
    const d = tariffs.dayPriceUah;
    const n = tariffs.nightPriceUah;
    if (d > 0) return d;
    if (n > 0) return n;
    return 0;
  }
  const h = new Date(slotStartMs).getHours();
  return isNightHourLocal(h) ? tariffs.nightPriceUah : tariffs.dayPriceUah;
}

/**
 * Прогноз тарифу грн/кВт·год на дату бронювання (профіль energyByHour + базовий тариф).
 * Денний/нічний рядок з `/tariffs/today` на сторінці броні трактується як EUR/кВт·год → `eurToUah` (курс `VITE_EUR_TO_UAH`).
 * Якщо у вашій БД `tariff.price_per_kwh` уже в грн, не застосовуйте подвійну конвертацію (узгодьте модель з бекендом).
 * Без мережевого рядка — база з `station.dayTariff` (EUR) через `eurToUah`.
 */
function dataMiningTariffUahPerKwhForDay(
  station: Station,
  bookingDate: Date,
  baseEurPerKwhFromGrid: number
): number {
  const fromStationEur = eurToUah(station.dayTariff);
  const gridUah = baseEurPerKwhFromGrid > 0 ? eurToUah(baseEurPerKwhFromGrid) : 0;
  const baseUah = gridUah > 0 ? gridUah : Math.max(0.0001, fromStationEur);
  const hours = station.energyByHour;
  if (!hours?.length || hours.length !== 24) {
    return Math.max(0.01, Math.round(baseUah * 10000) / 10000);
  }
  const maxH = Math.max(...hours, 1e-9);
  const mean = hours.reduce((a, b) => a + b, 0) / 24;
  const loadShape = mean / maxH;
  const dow = bookingDate.getDay();
  const isWeekend = dow === 0 || dow === 6;
  const weekendAdj = isWeekend ? -0.03 : 0.04;
  const miningFactor = 0.9 + 0.18 * loadShape + weekendAdj;
  const raw = baseUah * miningFactor;
  return Math.max(0.01, Math.round(raw * 10000) / 10000);
}

function durationChipLabel(minutes: number): string {
  const hit = DURATIONS.find((d) => d.min === minutes);
  return hit ? hit.label : `${minutes} хв`;
}

/** Орієнтовна передплата за динамічною моделлю: кВт·год × прогнозований тариф на дату. */
function estimateDynamicPrepayUah(
  durationMin: number,
  car: { batteryCapacity?: number } | undefined,
  chargeKw: number,
  tariffUahPerKwh: number
): number {
  const kwh = estimatedKwhForBooking(durationMin, car?.batteryCapacity, chargeKw);
  return Math.round(kwh * tariffUahPerKwh * 100) / 100;
}

function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

/** День 0..CALENDAR_DAY_COUNT-1 від сьогодні (північ локально). */
function dateAtOffset(dayOffset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d;
}

export default function UserBookingNewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialStationFromUrl] = useState(() => searchParams.get('stationId'));
  const { user } = useAuth();
  const { mapStations: allStations, registerMapViewportBounds } = useStations();
  const { replaceBookings, cars } = useUserPortal();
  const { data: gridTariffs, loading: gridTariffsLoading, error: gridTariffsError } =
    useTodayGridTariffsFromDb();

  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('stationId'));
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [durationMin, setDurationMin] = useState<number>(60);
  const [slotStartMs, setSlotStartMs] = useState<number | null>(null);
  const [pricingModel, setPricingModel] = useState<UserBookingPricingModel>('reservation_fee');
  const [allowedHm, setAllowedHm] = useState<Set<string>>(() => new Set());
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pricingInfoOpen, setPricingInfoOpen] = useState(false);
  /** Для dynamic_prepay — id авто з гаража (обовʼязково для броні). */
  const [bookingVehicleId, setBookingVehicleId] = useState<string | null>(null);
  /** Завантаженість дня + надбавка (API) для динамічної ціни. */
  const [bookingDayLoad, setBookingDayLoad] = useState<{
    loadPct: number;
    surchargeUahPerKwh: number;
  } | null>(null);
  const [bookingDayLoadLoading, setBookingDayLoadLoading] = useState(false);
  const [bookingDayLoadError, setBookingDayLoadError] = useState<string | null>(null);

  const stationIdFromUrl = searchParams.get('stationId');

  const mapStations = useMemo(
    () => allStations.filter((s) => stationAllowsUserBookingAndCharge(s)),
    [allStations]
  );

  const effectiveStationId = useMemo(() => {
    if (mapStations.length === 0) return null;
    if (selectedId && mapStations.some((s) => s.id === selectedId)) return selectedId;
    return mapStations[0].id;
  }, [mapStations, selectedId]);

  useEffect(() => {
    if (!stationIdFromUrl) return;
    if (
      allStations.some((s) => s.id === stationIdFromUrl && stationAllowsUserBookingAndCharge(s))
    ) {
      setSelectedId(stationIdFromUrl);
    }
  }, [stationIdFromUrl, allStations]);

  const selected = effectiveStationId
    ? mapStations.find((s) => s.id === effectiveStationId)
    : undefined;

  const selectedPort = useMemo(() => {
    if (!selected?.ports.length) return undefined;
    if (selectedPortId) {
      const p = selected.ports.find((x) => x.id === selectedPortId);
      if (p) return p;
    }
    return selected.ports.find(portSelectable) ?? selected.ports[0];
  }, [selected, selectedPortId]);

  useEffect(() => {
    if (!selected?.ports.length) {
      setSelectedPortId(null);
      return;
    }
    const preferred = selected.ports.find(portSelectable) ?? selected.ports[0];
    setSelectedPortId(preferred.id);
  }, [selected?.id]);

  const selectedDay = useMemo(() => dateAtOffset(dayOffset), [dayOffset]);

  const calendarDays = useMemo(
    () => Array.from({ length: CALENDAR_DAY_COUNT }, (_, i) => i),
    []
  );

  const slotStarts = useMemo(() => buildHalfHourStarts(selectedDay, 7, 22), [selectedDay]);

  const visibleSlots = useMemo(() => {
    const nowMs = Date.now();
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    return slotStarts.filter((t) => {
      if (selectedDay.getTime() === today0.getTime() && t < nowMs + 5 * 60 * 1000) return false;
      return true;
    });
  }, [slotStarts, selectedDay]);

  /** Чи є хоча б один доступний початок слоту у сітці (після відповіді API). */
  const hasAvailableTimeSlot = useMemo(
    () => visibleSlots.some((t) => allowedHm.has(localHmFromMs(t))),
    [visibleSlots, allowedHm]
  );

  const portNumberForApi = selected && selectedPort ? portNumberOf(selected, selectedPort) : 1;

  useEffect(() => {
    if (!selected || !selectedPort) return;
    const portNumber = portNumberForApi;
    const dateStr = localYmd(selectedDay);
    const ac = new AbortController();
    setSlotsLoading(true);
    setSlotsError(null);
    void fetchStationAvailableBookingSlots(Number(selected.id), {
      portNumber,
      date: dateStr,
      slotMinutes: SLOT_MINUTES,
      durationMinutes: durationMin,
    })
      .then((res) => {
        if (ac.signal.aborted) return;
        const hm = new Set<string>();
        for (const s of res.slots) {
          const st = new Date(s.start);
          if (Number.isNaN(st.getTime())) continue;
          /* День уже заданий запитом до API; не фільтруємо localYmd — уникнення втрати слотів через TZ БД/браузера */
          hm.add(localHmFromMs(st.getTime()));
        }
        setAllowedHm(hm);
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setAllowedHm(new Set());
        setSlotsError('Не вдалося завантажити вільні слоти. Перевірте зʼєднання або спробуйте пізніше');
      })
      .finally(() => {
        if (!ac.signal.aborted) setSlotsLoading(false);
      });
    return () => ac.abort();
  }, [selected?.id, selectedPort?.id, portNumberForApi, selectedDay, durationMin]);

  useEffect(() => {
    if (slotStartMs === null) return;
    if (!allowedHm.has(localHmFromMs(slotStartMs))) setSlotStartMs(null);
  }, [allowedHm, slotStartMs]);

  useEffect(() => {
    if (pricingModel !== 'dynamic_prepay') return;
    if (cars.length === 0) {
      setBookingVehicleId(null);
      return;
    }
    setBookingVehicleId((prev) => {
      if (prev && cars.some((c) => c.id === prev)) return prev;
      return cars[0].id;
    });
  }, [pricingModel, cars]);

  useEffect(() => {
    if (pricingModel !== 'dynamic_prepay' || !selected) {
      setBookingDayLoad(null);
      setBookingDayLoadLoading(false);
      setBookingDayLoadError(null);
      return;
    }
    const ac = new AbortController();
    const dateStr = localYmd(selectedDay);
    setBookingDayLoad(null);
    setBookingDayLoadLoading(true);
    setBookingDayLoadError(null);
    void fetchStationBookingDayLoad(Number(selected.id), dateStr)
      .then((res) => {
        if (ac.signal.aborted) return;
        setBookingDayLoad({
          loadPct: res.loadPct,
          surchargeUahPerKwh: res.surchargeUahPerKwh,
        });
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setBookingDayLoad({ loadPct: 0, surchargeUahPerKwh: 0 });
        setBookingDayLoadError('Не вдалося завантажити заповненість дня; надбавка не врахована в оцінці (сервер перерахує)');
      })
      .finally(() => {
        if (!ac.signal.aborted) setBookingDayLoadLoading(false);
      });
    return () => ac.abort();
  }, [pricingModel, selected?.id, selectedDay]);

  const selectedBookingCar = useMemo(() => {
    if (!bookingVehicleId) return undefined;
    return cars.find((c) => c.id === bookingVehicleId);
  }, [cars, bookingVehicleId]);

  /** Для динамічної ціни — потужність обраного порту (інакше резерв з env). */
  const effectiveChargeKw = useMemo(() => {
    if (!selectedPort || !Number.isFinite(selectedPort.powerKw) || selectedPort.powerKw <= 0) {
      return ASSUMED_CHARGE_KW;
    }
    return selectedPort.powerKw;
  }, [selectedPort]);

  const baseGridTariffPerKwh = useMemo(
    () => baseTariffFromGrid(gridTariffs, slotStartMs),
    [gridTariffs, slotStartMs]
  );

  /** Прогноз грн/кВт·год на обраний календарний день бронювання (орієнтовно). */
  const dynamicTariffUahPerKwh = useMemo(() => {
    if (!selected) return 0;
    return dataMiningTariffUahPerKwhForDay(selected, selectedDay, baseGridTariffPerKwh);
  }, [selected, selectedDay, baseGridTariffPerKwh]);

  const loadSurchargeUahPerKwh = bookingDayLoad?.surchargeUahPerKwh ?? 0;

  const dynamicDayLoadReady = pricingModel !== 'dynamic_prepay' || bookingDayLoad !== null;

  /** Базовий прогноз + надбавка за заповненістю дня (як на сервері для CALC). */
  const effectiveDynamicTariffUahPerKwh = useMemo(
    () => Math.max(0.01, dynamicTariffUahPerKwh + loadSurchargeUahPerKwh),
    [dynamicTariffUahPerKwh, loadSurchargeUahPerKwh]
  );

  const payNow = useMemo(() => {
    if (!selected) return 0;
    if (pricingModel === 'reservation_fee') return RESERVATION_FEE_UAH;
    return estimateDynamicPrepayUah(
      durationMin,
      selectedBookingCar,
      effectiveChargeKw,
      effectiveDynamicTariffUahPerKwh
    );
  }, [
    selected,
    pricingModel,
    durationMin,
    selectedBookingCar,
    effectiveChargeKw,
    effectiveDynamicTariffUahPerKwh,
  ]);

  /** Орієнтовні кВт·год за слот (CALC / динамічна передплата). */
  const approxSessionKwhForCalc = useMemo(() => {
    if (pricingModel !== 'dynamic_prepay') return null;
    return estimatedKwhForBooking(
      durationMin,
      selectedBookingCar?.batteryCapacity,
      effectiveChargeKw
    );
  }, [pricingModel, durationMin, selectedBookingCar, effectiveChargeKw]);

  const dynamicVehicleOk =
    pricingModel !== 'dynamic_prepay' ||
    (bookingVehicleId != null &&
      selectedBookingCar != null &&
      selectedBookingCar.batteryCapacity != null &&
      selectedBookingCar.batteryCapacity > 0);

  const canConfirm =
    selected &&
    selectedPort &&
    portSelectable(selectedPort) &&
    slotStartMs !== null &&
    !slotsLoading &&
    allowedHm.has(localHmFromMs(slotStartMs)) &&
    dynamicVehicleOk &&
    dynamicDayLoadReady;

  const handleConfirm = () => {
    if (!selected || !selectedPort || slotStartMs === null || !canConfirm) return;
    const uid = Number(user?.id);
    if (!Number.isFinite(uid)) return;
    const endMs = slotStartMs + durationMin * 60 * 1000;
    const portNumber = portNumberOf(selected, selectedPort);
    setSubmitError(null);
    void (async () => {
      try {
        const payload: Record<string, unknown> = {
          stationId: Number(selected.id),
          portNumber,
          startTime: new Date(slotStartMs).toISOString(),
          endTime: new Date(endMs).toISOString(),
          bookingType: pricingModel === 'reservation_fee' ? 'DEPOSIT' : 'CALC',
          prepaymentAmount: payNow,
        };
        if (pricingModel === 'dynamic_prepay' && bookingVehicleId != null) {
          payload.vehicleId = Number(bookingVehicleId);
        }
        await createUserBooking(uid, payload);
        const rows = await fetchUserBookings(uid);
        replaceBookings(rows.map((r) => mapBookingApiToUserBooking(r)));
        navigate('/dashboard/bookings');
      } catch {
        setSubmitError(
          'Не вдалося створити бронювання. Час міг бути зайнятий іншим користувачем — оберіть інший слот'
        );
      }
    })();
  };

  return (
    <div className={`space-y-6 ${userPortalListPageShell}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/dashboard/bookings"
          className="text-sm font-medium text-slate-600 transition hover:text-green-700"
        >
          ← 
        </Link>
        <h1 className={userPortalPageTitle}>Нове бронювання</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start xl:gap-8">
        <aside className="min-w-0 xl:order-2 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-5rem)] xl:self-start xl:overflow-y-auto">
          <AppCard className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Параметри бронювання</h2>
            </div>

            {selected ? (
              <>
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Станція</h3>
                  <div
                    className={`rounded-2xl border bg-slate-50/80 p-4 shadow-sm ring-1 ring-slate-950/[0.04] ${
                      initialStationFromUrl && selected.id === initialStationFromUrl
                        ? 'border-green-600 ring-2 ring-green-600/20 ring-offset-2 ring-offset-white'
                        : 'border-slate-200/90'
                    }`}
                  >
                    <p className="text-base font-semibold leading-snug text-slate-900">{selected.name}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{selected.address}</p>
                   
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Порт станції</h3>
                   <ul className="space-y-2">
                    {selected.ports.map((p) => {
                      const num = portNumberOf(selected, p);
                      const ok = portSelectable(p);
                      const active = selectedPort?.id === p.id;
                      return (
                        <li key={p.id}>
                          <label
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition ${
                              !ok
                                ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-70'
                                : active
                                  ? 'border-green-600 bg-white shadow-sm ring-1 ring-green-600/15'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="booking-port"
                              className="h-4 w-4 shrink-0 border-slate-300 text-green-600 focus:ring-green-500/30"
                              checked={active}
                              disabled={!ok}
                              onChange={() => {
                                if (ok) {
                                  setSelectedPortId(p.id);
                                  setSlotStartMs(null);
                                }
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">
                                Порт {num}
                                <span className="font-normal text-slate-500"> · {p.connector}</span>
                              </p>
                              <p className="text-xs text-slate-500">
                                {p.powerKw} кВт
                                {!ok ? ` · ${p.status === 'busy' ? 'зайнятий' : 'недоступний'}` : ''}
                              </p>
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Дата</h3>
                  <div className="-mx-1 flex max-w-full gap-1.5 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin]">
                    {calendarDays.map((off) => {
                      const d = dateAtOffset(off);
                      const active = dayOffset === off;
                      const w = d.toLocaleDateString('uk-UA', { weekday: 'short' });
                      const mo = d.toLocaleDateString('uk-UA', { month: 'short' });
                      return (
                        <button
                          key={off}
                          type="button"
                          onClick={() => {
                            setDayOffset(off);
                            setSlotStartMs(null);
                          }}
                          className={`flex min-w-[3.5rem] shrink-0 flex-col items-center rounded-xl border px-1.5 py-2 text-center transition ${
                            active
                              ? 'border-green-600 bg-white text-slate-900 shadow-sm ring-1 ring-green-600/20'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-medium capitalize ${active ? 'text-green-700' : 'text-slate-500'}`}
                          >
                            {w}
                          </span>
                          <span className="text-lg font-bold tabular-nums leading-tight">{d.getDate()}</span>
                          <span className={`text-[10px] capitalize ${active ? 'text-slate-600' : 'text-slate-500'}`}>
                            {mo}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Тривалість сесії</h3>
                  <div className="flex flex-wrap gap-2">
                    {DURATIONS.map((d) => (
                      <button
                        key={d.min}
                        type="button"
                        onClick={() => {
                          setDurationMin(d.min);
                          setSlotStartMs(null);
                        }}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                          durationMin === d.min ? appChipSelectedClass : appChipIdleClass
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Вільні години (оберіть час початку)</h3>
                  {slotsError ? <p className="text-xs text-red-600">{slotsError}</p> : null}
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200/90 bg-slate-50/50 p-2">
                    {slotsLoading ? (
                      <p className="py-8 text-center text-xs text-slate-500">Завантаження вільних інтервалів…</p>
                    ) : slotsError ? null : !hasAvailableTimeSlot ? (
                      <p className="px-2 py-8 text-center text-sm font-medium leading-snug text-amber-900/95">
                        Немає вільних місць для бронювань
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                        {visibleSlots.map((t) => {
                          const ok = allowedHm.has(localHmFromMs(t));
                          const active = slotStartMs === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              disabled={!ok}
                              onClick={() => setSlotStartMs(t)}
                              className={`rounded-lg px-1.5 py-2 text-center text-[11px] font-semibold leading-tight transition ${
                                !ok
                                  ? 'cursor-not-allowed bg-gray-100 text-gray-300 line-through'
                                  : active
                                    ? appChipSelectedClass
                                    : appChipSlotAvailableClass
                              }`}
                            >
                              {fmtTime(t)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {slotStartMs !== null ? (
                    <p className="text-xs text-slate-700">
                      Обрано: {fmtTime(slotStartMs)} — {fmtTime(slotStartMs + durationMin * 60 * 1000)}
                    </p>
                  ) : null}
                </section>

                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ціноутворення</h3>
                    <button
                      type="button"
                      className="inline-flex shrink-0 rounded-md p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40"
                      aria-expanded={pricingInfoOpen}
                      aria-controls="booking-pricing-help"
                      title="Інформація про бронювання"
                      onClick={() => setPricingInfoOpen((o) => !o)}
                    >
                      <span className="sr-only">Інформація про бронювання</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                        aria-hidden
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>

                  {pricingInfoOpen ? (
                    <div
                      id="booking-pricing-help"
                      className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 text-xs leading-relaxed text-slate-700 shadow-sm ring-1 ring-slate-950/[0.03]"
                      role="region"
                      aria-label="Інформація про бронювання"
                    >
                      <p className="font-semibold text-slate-900">Інформація про бронювання</p>
                      <p className="mt-2">
                        У системі доступні дві стратегії бронювання зарядної сесії:
                      </p>

                      <div className="mt-3 space-y-2">
                        <p className="font-medium text-slate-800">1. Передплата </p>
                        <p>Вартість зарядки розраховується у день сесії</p>
                        <p className="font-medium text-slate-800">Формула:</p>
                        <p className="rounded-md bg-white/90 px-2.5 py-2 font-mono text-[11px] leading-snug text-slate-800 ring-1 ring-slate-200/90">
                          ціна = тариф на електроенергію в день зарядки × фактично спожита енергія (кВт·год)
                        </p>
                        <p>Додатково стягується завдаток {RESERVATION_FEE_UAH} грн за бронювання</p>
                       
                        <p className="text-slate-600">Підходить, якщо ви хочете платити по факту використання</p>
                      </div>

                      <div className="mt-4 space-y-2 border-t border-slate-200/90 pt-3">
                        <p className="font-medium text-slate-800">2. Динамічна ціна (CALC)</p>
                        <p>Вартість визначається одразу під час бронювання</p>
                        <p>
                          Базовий рядок мережі з API — у EUR/кВт·год, для показу перераховується в грн за курсом
                          з налаштувань; далі — орієнтовний прогноз на день і час слоту. Сума до сплати —
                          наближена (енергія за слот × ефективний тариф у грн).
                        </p>
                        <p className="font-medium text-slate-800">Можливі варіанти розрахунку:</p>
                        <p>
                          <span className="font-medium text-slate-800">За час бронювання:</span> оплата за весь
                          заброньований слот (наприклад, 30 хв), незалежно від фактичного використання
                        </p>
                      
                        <p className="text-slate-600">
                          Підходить, якщо вам важливо заздалегідь знати повну вартість
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <label className="flex cursor-pointer gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm ring-1 ring-slate-950/[0.04] transition has-[:checked]:border-green-600 has-[:checked]:bg-green-50/40">
                    <input
                      type="radio"
                      name="pricing"
                      className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                      checked={pricingModel === 'reservation_fee'}
                      onChange={() => setPricingModel('reservation_fee')}
                    />
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold text-slate-900">Передплата</p>
                      <p className="mt-0.5 text-xs text-slate-600">
                       Ціна буде обрахована в день сесії + 200 грн за бронювання
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm ring-1 ring-slate-950/[0.04] transition has-[:checked]:border-green-600 has-[:checked]:bg-green-50/40">
                    <input
                      type="radio"
                      name="pricing"
                      className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                      checked={pricingModel === 'dynamic_prepay'}
                      onChange={() => setPricingModel('dynamic_prepay')}
                    />
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold text-slate-900">Динамічна ціна</p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Ціна за всю сесію буде обрахована зараз
                      </p>
                    </div>
                  </label>

                  {pricingModel === 'dynamic_prepay' ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm ring-1 ring-slate-950/[0.04]">
                      <p className="text-xs font-semibold text-slate-900">Автомобіль для розрахунку</p>
                     
                      {cars.length === 0 ? (
                        <p className="mt-2 text-xs text-slate-600">
                          Додайте авто в гараж, щоб порахувати орієнтовну передплату{' '}
                          <Link to="/dashboard/cars/new" className="font-medium text-green-700 underline">
                            Додати авто
                          </Link>
                        </p>
                      ) : (
                        <>
                          <label htmlFor="booking-vehicle" className="mt-2 block text-[11px] font-medium text-slate-500">
                            Оберіть авто
                          </label>
                          <select
                            id="booking-vehicle"
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                            value={bookingVehicleId ?? ''}
                            onChange={(e) => setBookingVehicleId(e.target.value || null)}
                          >
                            {cars.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.model || c.plate} · {c.plate}
                              </option>
                            ))}
                          </select>
                          {selectedBookingCar ? (
                            <p className="mt-2 text-[11px] text-slate-600">
                              <span className="font-medium text-slate-700">Ємність АКБ:</span>{' '}
                              {selectedBookingCar.batteryCapacity != null
                                ? `${selectedBookingCar.batteryCapacity} кВт·год`
                                : '—'}
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}

                  {pricingModel === 'dynamic_prepay' && selected && selectedPort ? (
                    <div className="space-y-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3 ring-1 ring-emerald-600/10">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900/90">
                        Розрахунок динамічної ціни (CALC)
                      </p>
                      <p className="text-[11px] leading-relaxed text-emerald-950/90">
                        <span className="font-semibold">Орієнтовна вартість за 1 кВт·год</span> — прогноз у
                        гривнях: базовий тариф мережі з БД (EUR/кВт·год, день/ніч за часом початку слоту)
                        множиться на курс і далі коригується профілем навантаження на обраний день та надбавкою
                        за заповненість. Альтернатива — поле тарифу станції в EUR → також через курс у грн.
                      </p>
                      {gridTariffsLoading ? (
                        <p className="text-[11px] text-emerald-800/90">Завантаження тарифу мережі…</p>
                      ) : null}
                      {gridTariffsError ? (
                        <p className="text-[11px] text-amber-800">{gridTariffsError}</p>
                      ) : null}
                      {bookingDayLoadLoading ? (
                        <p className="text-[11px] text-emerald-800/90">Завантаження заповненості дня…</p>
                      ) : null}
                      {bookingDayLoadError ? (
                        <p className="text-[11px] text-amber-800">{bookingDayLoadError}</p>
                      ) : null}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-white/80 bg-white/90 px-2 py-2.5 text-center shadow-sm">
                          <p className="text-[10px] font-medium uppercase leading-tight text-slate-500">Потужність</p>
                          <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
                            {effectiveChargeKw.toLocaleString('uk-UA', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 1,
                            })}{' '}
                            <span className="text-xs font-semibold">кВт</span>
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/80 bg-white/90 px-2 py-2.5 text-center shadow-sm">
                          <p className="text-[10px] font-medium uppercase leading-tight text-slate-500">Тривалість</p>
                          <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">{durationChipLabel(durationMin)}</p>
                        </div>
                        <div className="rounded-lg border border-white/80 bg-white/90 px-2 py-2.5 text-center shadow-sm sm:col-span-1">
                          <p className="text-[10px] font-medium uppercase leading-tight text-slate-500">Базовий тариф</p>
                          <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
                            {dynamicTariffUahPerKwh.toLocaleString('uk-UA', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}
                          </p>
                          <p className="mt-0.5 text-[9px] text-slate-500">грн / кВт·год</p>
                        </div>
                        <div className="rounded-lg border border-white/80 bg-white/90 px-2 py-2.5 text-center shadow-sm">
                          <p className="text-[10px] font-medium uppercase leading-tight text-slate-500">Заповненість дня</p>
                          <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
                            {bookingDayLoad != null
                              ? `${bookingDayLoad.loadPct.toLocaleString('uk-UA', { maximumFractionDigits: 1 })}%`
                              : '—'}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/80 bg-white/90 px-2 py-2.5 text-center shadow-sm">
                          <p className="text-[10px] font-medium uppercase leading-tight text-slate-500">Надбавка</p>
                          <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
                            {bookingDayLoad != null
                              ? `+${loadSurchargeUahPerKwh.toLocaleString('uk-UA', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 4,
                                })}`
                              : '—'}
                          </p>
                          <p className="mt-0.5 text-[9px] text-slate-500">грн / кВт·год</p>
                        </div>
                        <div className="rounded-lg border border-emerald-300/80 bg-white/95 px-2 py-2.5 text-center shadow-sm ring-1 ring-emerald-600/15">
                          <p className="text-[10px] font-medium uppercase leading-tight text-emerald-900/90">Разом тариф</p>
                          <p className="mt-1 text-sm font-bold tabular-nums text-emerald-950">
                            {effectiveDynamicTariffUahPerKwh.toLocaleString('uk-UA', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}
                          </p>
                          <p className="mt-0.5 text-[9px] text-emerald-800/80">грн / кВт·год</p>
                        </div>
                      </div>
                      {approxSessionKwhForCalc != null ? (
                        <p className="text-[11px] leading-relaxed text-emerald-950/85">
                          <span className="font-semibold">Приблизна сума зараз</span> ≈ орієнтовні кВт·год за
                          слот (потужність порту × час, з урахуванням ємності АКБ) × ефективний тариф вище:{' '}
                          <span className="tabular-nums font-semibold">
                            {approxSessionKwhForCalc.toLocaleString('uk-UA', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            кВт·год
                          </span>
                          {' × '}
                          <span className="tabular-nums font-semibold">
                            {effectiveDynamicTariffUahPerKwh.toLocaleString('uk-UA', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}
                          </span>{' '}
                          грн/кВт·год — під час підтвердження броні на сервері сума може бути уточнена за тим
                          самим принципом.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-slate-200 bg-slate-900 px-3 py-2.5 text-white shadow-sm">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">До сплати зараз</p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums">
                      {payNow.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн
                    </p>
                    {pricingModel === 'dynamic_prepay' ? (
                      <p className="mt-2 border-t border-white/10 pt-2 text-[10px] font-normal leading-snug text-gray-400">
                        Показана сума — <span className="text-gray-300">приблизна</span>: енергія за слот ×
                        орієнтовний тариф грн/кВт·год; фактична передплата CALC на сервері рахується за тарифом
                        БД на час початку бронювання та завантаженістю дня.
                      </p>
                    ) : null}
                  </div>
                </div>

                {submitError ? (
                  <p className="text-sm text-red-600" role="alert">
                    {submitError}
                  </p>
                ) : null}

                <div className="flex flex-col gap-2 border-t border-slate-100 pt-2 sm:flex-row">
                  <PrimaryButton type="button" className="flex-1" disabled={!canConfirm} onClick={handleConfirm}>
                    Підтвердити
                  </PrimaryButton>
                  <Link to="/dashboard/bookings" className={`flex-1 text-center ${appSecondaryCtaClass}`}>
                    Скасувати
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Оберіть станцію на карті</p>
            )}
          </AppCard>
        </aside>

        <div className="flex min-h-[min(520px,75dvh)] min-w-0 flex-col xl:order-1">
          <AppCard className="flex h-full min-h-0 flex-1 flex-col overflow-hidden" padding={false}>
            <div className="shrink-0 border-b border-emerald-100/80 px-4 py-3 sm:px-5">
              <p className="text-sm font-semibold text-gray-900">Карта станцій</p>
             
              <StationMapLegend variant="inline" showSelectionNote={false} className="mt-3" />
            </div>
            <div className="min-h-[280px] flex-1 p-3">
              <div className="h-full min-h-[280px]">
                <StationMap
                  stations={mapStations}
                  selectedId={effectiveStationId ?? mapStations[0]?.id ?? ''}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setSlotStartMs(null);
                    setSearchParams({ stationId: id });
                  }}
                  onViewportChange={registerMapViewportBounds}
                  emphasizeSelected
                  flyToStationId={initialStationFromUrl}
                />
              </div>
            </div>
          </AppCard>
        </div>
      </div>
    </div>
  );
}
