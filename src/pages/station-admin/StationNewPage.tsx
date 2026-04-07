import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStations } from '../../context/StationsContext';
import type { StationPort, StationStatus } from '../../types/station';
import StationPortsEditor, { emptyPort } from '../../components/station-admin/StationPortsEditor';
import { geocodeAddressParts, reverseGeocode } from '../../lib/nominatimGeocode';
import StationLocationPicker from '../../components/station-admin/StationLocationPicker';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appSelectClass } from '../../components/station-admin/formStyles';

const inputClass =
  'mt-1 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition hover:border-gray-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/15';

const DEFAULT_LAT = 49.8397;
const DEFAULT_LNG = 24.0297;

const MAP_HEIGHT_CLASS =
  'min-h-[380px] h-[min(600px,calc(100dvh-10rem))] w-full sm:min-h-[440px]';

const REVERSE_DEBOUNCE_MS = 650;

export default function StationNewPage() {
  const { addStation, uniqueCities } = useStations();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dashBase = pathname.startsWith('/admin-dashboard') ? '/admin-dashboard' : '/station-dashboard';

  const [name, setName] = useState('');
  const [city, setCity] = useState('Львів');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(String(DEFAULT_LAT));
  const [lng, setLng] = useState(String(DEFAULT_LNG));
  const [status, setStatus] = useState<StationStatus>('working');
  const [ports, setPorts] = useState<StationPort[]>(() => [emptyPort()]);

  const [flyToKey, setFlyToKey] = useState(0);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [forwardLoading, setForwardLoading] = useState(false);

  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    };
  }, []);

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
    if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    reverseTimerRef.current = setTimeout(async () => {
      setReverseLoading(true);
      try {
        const r = await reverseGeocode(la, lo);
        if (r.ok) {
          if (r.city && r.city !== '—') setCity(r.city);
          setAddress(r.address);
        }
      } finally {
        setReverseLoading(false);
      }
    }, REVERSE_DEBOUNCE_MS);
  };

  /** Після введення міста та вулиці — підібрати координати (без окремої кнопки). */
  const applyCoordsFromAddressFields = async () => {
    const a = address.trim();
    const c = city.trim();
    if (!a || !c) return;
    setForwardLoading(true);
    try {
      const result = await geocodeAddressParts(a, c);
      if (result.ok) {
        setLat(result.lat.toFixed(6));
        setLng(result.lng.toFixed(6));
        setFlyToKey((k) => k + 1);
      }
    } finally {
      setForwardLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const station = await addStation({
        name: name.trim() || 'Нова станція',
        city: city.trim() || 'Львів',
        address: address.trim() || '—',
        status,
        archived: false,
        lat: mapLat,
        lng: mapLng,
        todayRevenue: 0,
        todaySessions: 0,
        dayTariff: 0,
        nightTariff: 0,
        energyByHour: Array(24).fill(0),
        ports: ports.map((p) => ({ ...p, id: p.id || `p-${Math.random().toString(36).slice(2)}` })),
      });
      navigate(`${dashBase}/stations/${station.id}`);
    } catch {
      /* помилка вже в контексті */
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Link
          to={`${dashBase}/stations`}
          className="text-sm font-medium text-green-600 hover:text-green-700"
        >
          ← До списку станцій
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Нова станція</h1>
       
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-start">
        <AppCard className="lg:sticky lg:top-2" padding={false}>
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Розташування</h2>
            <p className="mt-1 text-xs text-gray-500">
              {reverseLoading || forwardLoading
                ? reverseLoading
                  ? 'Визначаємо місто й вулицю за координатами…'
                  : 'Шукаємо координати за адресою…'
                : 'Координати — центр карти; адреса оновлюється після зупинки карти або з полів нижче.'}
            </p>
          </div>
          <div className="space-y-2 p-3">
            <StationLocationPicker
              lat={mapLat}
              lng={mapLng}
              onPositionChange={setPositionFromMap}
              flyToKey={flyToKey}
              mapClassName={MAP_HEIGHT_CLASS}
            />
            <p className="text-xs text-gray-600">
              <span className="font-medium text-gray-700">Координати: </span>
              {mapLat.toFixed(6)}, {mapLng.toFixed(6)}
            </p>
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
                onBlur={() => void applyCoordsFromAddressFields()}
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
                Вулиця, будинок
              </label>
              <input
                id="nw-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => void applyCoordsFromAddressFields()}
                placeholder="напр. вул. Університетська, 1"
                className={inputClass}
                required
              />
             
            </div>

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

            <div className="border-t border-gray-100 pt-6">
              <StationPortsEditor ports={ports} onChange={setPorts} onlyMaxPower />
            </div>

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
              <PrimaryButton type="submit">Створити станцію</PrimaryButton>
              <OutlineButton type="button" onClick={() => navigate(`${dashBase}/stations`)}>
                Скасувати
              </OutlineButton>
            </div>
          </form>
        </AppCard>
      </div>
    </div>
  );
}
