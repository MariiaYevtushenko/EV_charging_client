import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Station } from '../../types/station';
import { useStations } from '../../context/StationsContext';
import { useUserPortal } from '../../context/UserPortalContext';
import StationMap from '../../components/station-admin/StationMap';
import { AppCard, PrimaryButton } from '../../components/station-admin/Primitives';
import {
  appChipIdleClass,
  appChipSelectedClass,
  appChipSlotAvailableClass,
  appSecondaryCtaClass,
  appSelectFilterClass,
} from '../../components/station-admin/formStyles';
import type { UserBookingPricingModel } from '../../types/userPortal';
import {
  buildHalfHourStarts,
  canBookDuration,
  occupiedFromBookings,
  SLOT_MINUTES,
} from '../../utils/bookingSlotGrid';

const RESERVATION_FEE_UAH = 50;

const DURATIONS = [
  { min: 30, label: '30 хв' },
  { min: 60, label: '1 год' },
  { min: 90, label: '1,5 год' },
] as const;

function stationMatchesConnector(station: Station, connector: string): boolean {
  if (connector === 'all') return true;
  return station.ports.some((p) => p.connector === connector);
}

function firstMatchingPort(station: Station, connector: string) {
  if (connector === 'all') return station.ports[0];
  return station.ports.find((p) => p.connector === connector) ?? station.ports[0];
}

function estimateDynamicPrepayUah(station: Station, durationMin: number): number {
  const hours = durationMin / 60;
  const avgKw = 7;
  const kwh = hours * avgKw;
  const raw = kwh * station.dayTariff;
  return Math.round(raw * 100) / 100;
}

function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(d: Date) {
  return d.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function UserBookingNewPage() {
  const navigate = useNavigate();
  const { stations: allStations } = useStations();
  const { cars, bookings, addBooking } = useUserPortal();

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
  const [dayOffset, setDayOffset] = useState(0);
  const [durationMin, setDurationMin] = useState<number>(60);
  const [slotStartMs, setSlotStartMs] = useState<number | null>(null);
  const [pricingModel, setPricingModel] = useState<UserBookingPricingModel>('reservation_fee');

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

  const selectedDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);

  const occupied = useMemo(
    () => (selected ? occupiedFromBookings(selected.id, bookings) : []),
    [selected, bookings]
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

  const payNow = useMemo(() => {
    if (!selected) return 0;
    if (pricingModel === 'reservation_fee') return RESERVATION_FEE_UAH;
    return estimateDynamicPrepayUah(selected, durationMin);
  }, [selected, pricingModel, durationMin]);

  const canConfirm =
    selected &&
    slotStartMs !== null &&
    canBookDuration(slotStartMs, durationMin, occupied, selected.id);

  const handleConfirm = () => {
    if (!selected || slotStartMs === null || !canConfirm) return;
    const endMs = slotStartMs + durationMin * 60 * 1000;
    const port = firstMatchingPort(selected, connector);
    const slotLabel = port ? `${port.label} · ${port.connector}` : 'Слот';
    addBooking({
      stationId: selected.id,
      stationName: selected.name,
      slotLabel,
      start: new Date(slotStartMs).toISOString(),
      end: new Date(endMs).toISOString(),
      durationMin,
      pricingModel,
      payNowAmount: payNow,
    });
    navigate('/dashboard/bookings');
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard/bookings" className="text-sm font-medium text-green-700 transition hover:text-emerald-800">
          ← До бронювань
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Нове бронювання</h1>
        <p className="mt-1 text-sm text-gray-500">
          Карта зліва (на широкому екрані); усі параметри пошуку та оплати — у правій панелі.
        </p>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch">
        <aside className="w-full shrink-0 xl:order-2 xl:sticky xl:top-0 xl:w-[420px] xl:self-start">
          <AppCard className="space-y-5 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto">
            <div className="border-b border-emerald-100/80 pb-3">
              <h2 className="text-base font-bold text-gray-900">Параметри бронювання</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Порт, дата, тривалість, час і тип оплати — в одному блоці
              </p>
            </div>

            <div>
              <label htmlFor="conn-filter" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Тип порту (під авто)
              </label>
              <p className="mt-0.5 text-[11px] text-gray-400">Фільтр станцій на карті</p>
              <select
                id="conn-filter"
                value={connector}
                onChange={(e) => {
                  setConnector(e.target.value);
                  setSelectedId(null);
                  setSlotStartMs(null);
                }}
                className={`mt-1.5 ${appSelectFilterClass}`}
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
                <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/40 p-3 shadow-sm shadow-emerald-900/5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Станція</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{selected.name}</p>
                  <p className="text-xs text-gray-600">{selected.address}</p>
                  <p className="mt-2 text-[11px] text-gray-500">
                    Тариф день: {selected.dayTariff} грн/кВт·год
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Дата</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[0, 1, 2, 3, 4, 5, 6].map((off) => (
                      <button
                        key={off}
                        type="button"
                        onClick={() => {
                          setDayOffset(off);
                          setSlotStartMs(null);
                        }}
                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                          dayOffset === off ? appChipSelectedClass : appChipIdleClass
                        }`}
                      >
                        {dayLabel(
                          (() => {
                            const d = new Date();
                            d.setHours(0, 0, 0, 0);
                            d.setDate(d.getDate() + off);
                            return d;
                          })()
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Тривалість</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DURATIONS.map((d) => (
                      <button
                        key={d.min}
                        type="button"
                        onClick={() => {
                          setDurationMin(d.min);
                          setSlotStartMs(null);
                        }}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          durationMin === d.min ? appChipSelectedClass : appChipIdleClass
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-400">Сітка слотів: {SLOT_MINUTES} хв</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Час початку</p>
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-emerald-100/80 bg-emerald-50/30 p-2">
                    <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
                      {visibleSlots.map((t) => {
                        const ok = canBookDuration(t, durationMin, occupied, selected.id);
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
                  </div>
                  {slotStartMs !== null ? (
                    <p className="mt-2 text-xs text-gray-700">
                      {fmtTime(slotStartMs)} — {fmtTime(slotStartMs + durationMin * 60 * 1000)}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3 border-t border-emerald-100/80 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ціноутворення</p>

                  <label className="flex cursor-pointer gap-2.5 rounded-xl border-2 border-emerald-100/90 bg-white/90 p-3 shadow-sm shadow-emerald-900/5 transition has-[:checked]:border-green-500 has-[:checked]:bg-emerald-50/50">
                    <input
                      type="radio"
                      name="pricing"
                      className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                      checked={pricingModel === 'reservation_fee'}
                      onChange={() => setPricingModel('reservation_fee')}
                    />
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold text-gray-900">Попереднє бронювання</p>
                      <p className="mt-0.5 text-xs text-gray-600">
                        Збір <strong>{RESERVATION_FEE_UAH} грн</strong> за резерв; енергію — окремо після сесії.
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer gap-2.5 rounded-xl border-2 border-emerald-100/90 bg-white/90 p-3 shadow-sm shadow-emerald-900/5 transition has-[:checked]:border-green-500 has-[:checked]:bg-emerald-50/50">
                    <input
                      type="radio"
                      name="pricing"
                      className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                      checked={pricingModel === 'dynamic_prepay'}
                      onChange={() => setPricingModel('dynamic_prepay')}
                    />
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold text-gray-900">Динамічне (оплата зараз)</p>
                      <p className="mt-0.5 text-xs text-gray-600">
                        Демо-оцінка за очікувану сесію; пізніше — ваш алгоритм.
                      </p>
                    </div>
                  </label>

                  <div className="rounded-xl bg-gray-900 px-3 py-2.5 text-white shadow-md">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                      До сплати зараз  
                    </p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums">
                      {payNow.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      грн
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-emerald-100/80 pt-2 sm:flex-row">
                  <PrimaryButton type="button" className="flex-1" disabled={!canConfirm} onClick={handleConfirm}>
                    Підтвердити
                  </PrimaryButton>
                  <Link to="/dashboard/bookings" className={`flex-1 text-center ${appSecondaryCtaClass}`}>
                    Скасувати
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Немає станцій для відображення.</p>
            )}
          </AppCard>
        </aside>

        <div className="min-w-0 flex-1 xl:order-1">
          <AppCard className="min-h-[min(520px,70dvh)]" padding={false}>
            <div className="border-b border-emerald-100/80 px-5 py-3">
              <p className="text-sm font-semibold text-gray-900">Карта станцій</p>
              <p className="text-xs text-gray-500">Клік по маркеру — вибір станції</p>
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
                    setSlotStartMs(null);
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
