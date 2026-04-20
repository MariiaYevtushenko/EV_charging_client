import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useStations } from '../../context/StationsContext';
import type { StationPort, StationStatus } from '../../types/station';
import { geocodeAddressParts, reverseGeocode } from '../../lib/nominatimGeocode';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import StationLocationPicker from '../../components/station-admin/StationLocationPicker';
import StationPortsEditor from '../../components/station-admin/StationPortsEditor';
import {
  AppCard,
  DangerButton,
  OutlineButton,
  PrimaryButton,
} from '../../components/station-admin/Primitives';
import { appSelectClass } from '../../components/station-admin/formStyles';
import { stationAdminPageTitle } from '../../styles/stationAdminTheme';

const inputClass =
  'mt-1 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition hover:border-gray-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/15';

const MAP_HEIGHT_CLASS =
  'min-h-[380px] h-[min(600px,calc(100dvh-10rem))] w-full sm:min-h-[440px]';

const REVERSE_DEBOUNCE_MS = 650;

export default function StationEditPage() {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dashBase = pathname.startsWith('/admin-dashboard') ? '/admin-dashboard' : '/station-dashboard';
  const { getStation, updateStation, archiveStation, unarchiveStation, uniqueCities } = useStations();
  const base = stationId ? getStation(stationId) : undefined;

  const [name, setName] = useState('');
  const [country, setCountry] = useState('UA');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [status, setStatus] = useState<StationStatus>('working');
  const [ports, setPorts] = useState<StationPort[]>([]);

  const [flyToKey, setFlyToKey] = useState(0);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Не перезаписувати адресу з БД після першого moveend карти при відкритті сторінки. */
  const skipFirstReverse = useRef(true);

  useEffect(() => {
    skipFirstReverse.current = true;
  }, [base?.id]);

  useEffect(() => {
    return () => {
      if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!base) return;
    setName(base.name);
    setCountry(base.country || 'UA');
    setCity(base.city);
    setAddress(base.address);
    setLat(base.lat.toFixed(6));
    setLng(base.lng.toFixed(6));
    setStatus(base.status);
    setPorts(base.ports.map((p) => ({ ...p })));
  }, [base?.id, base]);

  if (!base) {
    return <Navigate to={`${dashBase}/stations`} replace />;
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
    if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    reverseTimerRef.current = setTimeout(async () => {
      if (skipFirstReverse.current) {
        skipFirstReverse.current = false;
        return;
      }
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
      await updateStation(base.id, {
        name: name.trim() || base.name,
        country: country.trim() || base.country,
        city: city.trim() || base.city,
        address: address.trim() || base.address,
        lat: mapLat,
        lng: mapLng,
        status,
        ports: ports.map((p) => ({ ...p })),
      });
      navigate(`${dashBase}/stations/${base.id}`, { replace: true });
    } catch {
      /* помилка в контексті */
    }
  };

  const confirmArchive = async () => {
    if (!base) return;
    try {
      await archiveStation(base.id);
      setArchiveConfirmOpen(false);
      navigate(`${dashBase}/stations`, { replace: true });
    } catch {
      /* помилка в контексті */
    }
  };

  const handleUnarchive = async () => {
    try {
      await unarchiveStation(base.id);
    } catch {
      /* помилка в контексті */
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ConfirmDialog
        open={archiveConfirmOpen}
        onClose={() => setArchiveConfirmOpen(false)}
        onConfirm={confirmArchive}
        title="Перемістити станцію в архів?"
        description="Вона зникне з карти та зі списку «Усі»; після цього ви перейдете до списку станцій."
        confirmLabel="Так, в архів"
        cancelLabel="Скасувати"
        variant="danger"
      />

      <div
        className={
          base.archived
            ? 'rounded-2xl border border-amber-200/90 bg-amber-50/40 p-4 ring-1 ring-amber-100/80 sm:p-5'
            : ''
        }
      >
        <Link
          to={`${dashBase}/stations/${base.id}`}
          className="text-sm font-medium text-green-600 hover:text-green-700"
        >
          ← Назад до станції
        </Link>
        <h1
          className={`mt-2 ${stationAdminPageTitle} ${base.archived ? 'text-amber-950' : ''}`}
        >
          Редагування станції
        </h1>
        {base.archived ? (
          <p className="mt-2 text-sm font-medium text-amber-900/90">Станція в архіві</p>
        ) : null}
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
              <label htmlFor="st-name" className="text-sm font-medium text-gray-700">
                Назва станції
              </label>
              <input
                id="st-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="напр. Станція «Вокзал»"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="st-country" className="text-sm font-medium text-gray-700">
                Країна (код ISO)
              </label>
              <input
                id="st-country"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                placeholder="UA"
                maxLength={100}
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
                onBlur={() => void applyCoordsFromAddressFields()}
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
                Вулиця, будинок
              </label>
              <input
                id="st-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => void applyCoordsFromAddressFields()}
                placeholder="напр. вул. Університетська, 1"
                className={inputClass}
                required
              />
             
            </div>

            <div>
              <label htmlFor="st-status" className="text-sm font-medium text-gray-700">
                Статус
              </label>
              <select
                id="st-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StationStatus)}
                className={`mt-1 ${appSelectClass}`}
              >
                <option value="working">Працює</option>
                <option value="maintenance">Ремонт</option>
                <option value="offline">Оффлайн</option>
                <option value="archived">Архів</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                «Архів» приховує станцію з основного списку. Можна також скористатися кнопкою нижче або
                відновити станцію кнопкою «Відновити з архіву».
              </p>
            </div>

            {base.archived ? (
              <div className="rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/95 to-white px-4 py-4 shadow-sm shadow-amber-900/5">
                <p className="text-sm font-semibold text-amber-950">Станція в архіві</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900/85">
                  Після відновлення статус стане «Працює»; за потреби змініть його в списку вище й збережіть
                  форму.
                </p>
                <PrimaryButton type="button" className="mt-3" onClick={() => void handleUnarchive()}>
                  Відновити з архіву
                </PrimaryButton>
              </div>
            ) : null}

            <div className="border-t border-gray-100 pt-6">
              <StationPortsEditor ports={ports} onChange={setPorts} onlyMaxPower />
            </div>

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
              <PrimaryButton type="submit">Зберегти зміни</PrimaryButton>
              <OutlineButton type="button" onClick={() => navigate(`${dashBase}/stations/${base.id}`)}>
                Скасувати
              </OutlineButton>
            </div>
          </form>

          {!base.archived ? (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <p className="text-sm font-semibold text-gray-900">Архів</p>
              <p className="mt-1 text-xs text-gray-500">
                Архівні станції не відображаються на карті та у списку «Усі» — лише у фільтрі «Архів».
              </p>
              <DangerButton type="button" className="mt-4" onClick={() => setArchiveConfirmOpen(true)}>
                Архівувати станцію
              </DangerButton>
            </div>
          ) : null}
        </AppCard>
      </div>
    </div>
  );
}
