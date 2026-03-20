import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStations } from '../../context/StationsContext';
import type { StationPort, StationStatus } from '../../types/station';
import StationPortsEditor, { emptyPort } from '../../components/station-admin/StationPortsEditor';
import { geocodeAddressParts } from '../../lib/nominatimGeocode';
import StationLocationPicker from '../../components/station-admin/StationLocationPicker';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appSelectClass } from '../../components/station-admin/formStyles';

const inputClass =
  'mt-1 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition hover:border-gray-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/15';

const DEFAULT_LAT = 49.8397;
const DEFAULT_LNG = 24.0297;

const MAP_HEIGHT_CLASS =
  'min-h-[380px] h-[min(600px,calc(100dvh-10rem))] w-full sm:min-h-[440px]';

export default function StationNewPage() {
  const { addStation, uniqueCities } = useStations();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [city, setCity] = useState('Львів');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(String(DEFAULT_LAT));
  const [lng, setLng] = useState(String(DEFAULT_LNG));
  const [status, setStatus] = useState<StationStatus>('working');
  const [dayTariff, setDayTariff] = useState('7.5');
  const [nightTariff, setNightTariff] = useState('4.2');
  const [ports, setPorts] = useState<StationPort[]>(() => [emptyPort(7.5)]);

  const [flyToKey, setFlyToKey] = useState(0);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeHint, setGeocodeHint] = useState<string | null>(null);

  const parseNum = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  };

  const latNum = parseNum(lat);
  const lngNum = parseNum(lng);
  const mapLat = Number.isFinite(latNum) ? latNum : DEFAULT_LAT;
  const mapLng = Number.isFinite(lngNum) ? lngNum : DEFAULT_LNG;

  const setPositionFromMap = (la: number, lo: number) => {
    setLat(la.toFixed(6));
    setLng(lo.toFixed(6));
    setGeocodeHint(null);
  };

  const bumpMapView = () => {
    setFlyToKey((k) => k + 1);
  };

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const day = parseNum(dayTariff);
    const night = parseNum(nightTariff);
    const station = addStation({
      name: name.trim() || 'Нова станція',
      city: city.trim() || 'Львів',
      address: address.trim() || '—',
      status,
      archived: false,
      lat: mapLat,
      lng: mapLng,
      todayRevenue: 0,
      todaySessions: 0,
      dayTariff: Number.isFinite(day) ? day : 0,
      nightTariff: Number.isFinite(night) ? night : 0,
      energyByHour: Array(24).fill(0),
      ports: ports.map((p) => ({ ...p, id: p.id || `p-${Math.random().toString(36).slice(2)}` })),
    });
    navigate(`/station-dashboard/stations/${station.id}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Link
          to="/station-dashboard/stations"
          className="text-sm font-medium text-green-600 hover:text-green-700"
        >
          ← До списку станцій
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Нова станція</h1>
        <p className="mt-1 text-sm text-gray-500">
          Зліва — карта та позиція (центр = точка станції). Справа — усі поля форми.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-start">
        <AppCard className="lg:sticky lg:top-2" padding={false}>
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Розташування</h2>
            <p className="mt-1 text-xs text-gray-500">
              Пересувайте карту під фіксовану шпильку. Nominatim — геокод за адресою.
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
              <label htmlFor="nw-name" className="text-sm font-medium text-gray-700">
                Назва станції
              </label>
              <input
                id="nw-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="напр. Станція «Вокзал»"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="nw-city" className="text-sm font-medium text-gray-700">
                Місто
              </label>
              <input
                id="nw-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                list="city-suggestions"
                className={inputClass}
                required
              />
              <datalist id="city-suggestions">
                {uniqueCities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="nw-addr" className="text-sm font-medium text-gray-700">
                Адреса
              </label>
              <input
                id="nw-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="вулиця, будинок"
                className={inputClass}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="nw-lat" className="text-sm font-medium text-gray-700">
                  Широта (lat)
                </label>
                <input
                  id="nw-lat"
                  inputMode="decimal"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  onBlur={handleCoordsFieldBlur}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="nw-lng" className="text-sm font-medium text-gray-700">
                  Довгота (lng)
                </label>
                <input
                  id="nw-lng"
                  inputMode="decimal"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  onBlur={handleCoordsFieldBlur}
                  className={inputClass}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Після редагування полів натисніть «Показати координати з полів» або вийдіть з поля (blur).
            </p>

            <div>
              <label htmlFor="nw-status" className="text-sm font-medium text-gray-700">
                Статус
              </label>
              <select
                id="nw-status"
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
                <label htmlFor="nw-day" className="text-sm font-medium text-gray-700">
                  Денний тариф (грн/кВт·год)
                </label>
                <input
                  id="nw-day"
                  inputMode="decimal"
                  value={dayTariff}
                  onChange={(e) => setDayTariff(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="nw-night" className="text-sm font-medium text-gray-700">
                  Нічний тариф (грн/кВт·год)
                </label>
                <input
                  id="nw-night"
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
                priceDefault={
                  Number.isFinite(parseNum(dayTariff)) ? parseNum(dayTariff) : 7.5
                }
              />
            </div>

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
              <PrimaryButton type="submit">Створити станцію</PrimaryButton>
              <OutlineButton type="button" onClick={() => navigate('/station-dashboard/stations')}>
                Скасувати
              </OutlineButton>
            </div>
          </form>
        </AppCard>
      </div>
    </div>
  );
}
