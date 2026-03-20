import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useStations } from '../../context/StationsContext';
import type { StationPort, StationStatus } from '../../types/station';
import { geocodeAddressParts } from '../../lib/nominatimGeocode';
import StationLocationPicker from '../../components/station-admin/StationLocationPicker';
import StationPortsEditor from '../../components/station-admin/StationPortsEditor';
import {
  AppCard,
  DangerButton,
  OutlineButton,
  PrimaryButton,
} from '../../components/station-admin/Primitives';
import { appSelectClass } from '../../components/station-admin/formStyles';

const inputClass =
  'mt-1 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition hover:border-gray-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/15';

const MAP_HEIGHT_CLASS =
  'min-h-[380px] h-[min(600px,calc(100dvh-10rem))] w-full sm:min-h-[440px]';

export default function StationEditPage() {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const { getStation, updateStation, archiveStation, uniqueCities } = useStations();
  const base = stationId ? getStation(stationId) : undefined;

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [status, setStatus] = useState<StationStatus>('working');
  const [dayTariff, setDayTariff] = useState('');
  const [nightTariff, setNightTariff] = useState('');
  const [ports, setPorts] = useState<StationPort[]>([]);

  const [flyToKey, setFlyToKey] = useState(0);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeHint, setGeocodeHint] = useState<string | null>(null);

  useEffect(() => {
    if (!base) return;
    setName(base.name);
    setCity(base.city);
    setAddress(base.address);
    setLat(base.lat.toFixed(6));
    setLng(base.lng.toFixed(6));
    setStatus(base.status);
    setDayTariff(String(base.dayTariff));
    setNightTariff(String(base.nightTariff));
    setPorts(base.ports.map((p) => ({ ...p })));
    setGeocodeHint(null);
  }, [base?.id, base]);

  if (!base) {
    return <Navigate to="/station-dashboard/stations" replace />;
  }

  const parseNum = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  };

  const latNum = parseNum(lat);
  const lngNum = parseNum(lng);
  const mapLat = Number.isFinite(latNum) ? latNum : base.lat;
  const mapLng = Number.isFinite(lngNum) ? lngNum : base.lng;

  const setPositionFromMap = (la: number, lo: number) => {
    setLat(la.toFixed(6));
    setLng(lo.toFixed(6));
    setGeocodeHint(null);
  };

  const bumpMapView = () => setFlyToKey((k) => k + 1);

  const handleGeocode = async () => {
    setGeocodeHint(null);
    setGeocodeLoading(true);
    try {
      const result = await geocodeAddressParts(address, city);
      if (result.ok) {
        setLat(result.lat.toFixed(6));
        setLng(result.lng.toFixed(6));
        bumpMapView();
        setGeocodeHint(
          result.displayName
            ? `Знайдено: ${result.displayName.slice(0, 120)}${result.displayName.length > 120 ? '…' : ''}`
            : 'Координати оновлено.'
        );
      } else {
        setGeocodeHint(result.message);
      }
    } finally {
      setGeocodeLoading(false);
    }
  };

  const handleCoordsFieldBlur = () => {
    if (Number.isFinite(parseNum(lat)) && Number.isFinite(parseNum(lng))) {
      bumpMapView();
    }
  };

  const dayN = parseNum(dayTariff);
  const nightN = parseNum(nightTariff);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateStation(base.id, {
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      lat: mapLat,
      lng: mapLng,
      status,
      dayTariff: Number.isFinite(dayN) ? dayN : base.dayTariff,
      nightTariff: Number.isFinite(nightN) ? nightN : base.nightTariff,
      ports: ports.map((p) => ({ ...p })),
    });
    navigate(`/station-dashboard/stations/${base.id}`, { replace: true });
  };

  const handleArchive = () => {
    if (!window.confirm('Архівувати станцію? Вона зникне з карти та зі списку «Усі».')) return;
    archiveStation(base.id);
    navigate('/station-dashboard/stations', { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Link
          to={`/station-dashboard/stations/${base.id}`}
          className="text-sm font-medium text-green-600 hover:text-green-700"
        >
          ← Назад до станції
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Редагування станції</h1>
        <p className="mt-1 text-sm text-gray-500">
          Як при створенні: зліва карта, справа дані та порти. Зміни в пам&apos;яті до перезавантаження.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-start">
        <AppCard className="lg:sticky lg:top-2" padding={false}>
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Розташування</h2>
            <p className="mt-1 text-xs text-gray-500">
              Центр карти = координати станції. Можна змінити адресу й отримати координати з Nominatim.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <OutlineButton
                type="button"
                className="!text-xs"
                disabled={geocodeLoading}
                onClick={handleGeocode}
              >
                {geocodeLoading ? 'Пошук…' : 'Координати за адресою'}
              </OutlineButton>
              <OutlineButton type="button" className="!text-xs" onClick={bumpMapView}>
                Показати координати з полів
              </OutlineButton>
            </div>
            {geocodeHint ? (
              <p
                className={`mt-2 text-xs ${geocodeHint.startsWith('Знайдено') || geocodeHint.startsWith('Координати') ? 'text-emerald-700' : 'text-amber-800'}`}
              >
                {geocodeHint}
              </p>
            ) : null}
          </div>
          <div className="p-3">
            <StationLocationPicker
              lat={mapLat}
              lng={mapLng}
              onPositionChange={setPositionFromMap}
              flyToKey={flyToKey}
              mapClassName={MAP_HEIGHT_CLASS}
            />
          </div>
        </AppCard>

        <AppCard>
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Дані станції</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="st-name" className="text-sm font-medium text-gray-700">
                Назва
              </label>
              <input
                id="st-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="st-city" className="text-sm font-medium text-gray-700">
                Місто
              </label>
              <input
                id="st-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                list="edit-city-suggestions"
                className={inputClass}
                required
              />
              <datalist id="edit-city-suggestions">
                {uniqueCities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="st-addr" className="text-sm font-medium text-gray-700">
                Адреса
              </label>
              <input
                id="st-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="st-lat" className="text-sm font-medium text-gray-700">
                  Широта (lat)
                </label>
                <input
                  id="st-lat"
                  inputMode="decimal"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  onBlur={handleCoordsFieldBlur}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="st-lng" className="text-sm font-medium text-gray-700">
                  Довгота (lng)
                </label>
                <input
                  id="st-lng"
                  inputMode="decimal"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  onBlur={handleCoordsFieldBlur}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="st-status" className="text-sm font-medium text-gray-700">
                Статус станції
              </label>
              <select
                id="st-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StationStatus)}
                className={`mt-1 ${appSelectClass}`}
              >
                <option value="working">Працює</option>
                <option value="maintenance">На обслуговуванні</option>
                <option value="offline">Оффлайн</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="st-day" className="text-sm font-medium text-gray-700">
                  Денний тариф (грн/кВт·год)
                </label>
                <input
                  id="st-day"
                  inputMode="decimal"
                  value={dayTariff}
                  onChange={(e) => setDayTariff(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="st-night" className="text-sm font-medium text-gray-700">
                  Нічний тариф (грн/кВт·год)
                </label>
                <input
                  id="st-night"
                  inputMode="decimal"
                  value={nightTariff}
                  onChange={(e) => setNightTariff(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <StationPortsEditor
                ports={ports}
                onChange={setPorts}
                priceDefault={Number.isFinite(dayN) ? dayN : base.dayTariff}
              />
            </div>

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
              <PrimaryButton type="submit">Зберегти</PrimaryButton>
              <OutlineButton type="button" onClick={() => navigate(`/station-dashboard/stations/${base.id}`)}>
                Скасувати
              </OutlineButton>
            </div>
          </form>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <p className="text-sm font-semibold text-gray-900">Архів</p>
            <p className="mt-1 text-xs text-gray-500">
              Архівні станції не відображаються на карті та у списку «Усі» — лише у фільтрі «Архів».
            </p>
            <DangerButton type="button" className="mt-4" onClick={handleArchive}>
              Архівувати станцію
            </DangerButton>
          </div>
        </AppCard>
      </div>
    </div>
  );
}
