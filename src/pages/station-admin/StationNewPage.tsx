import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStations } from '../../context/StationsContext';
import type { StationPort, StationStatus } from '../../types/station';
import StationPortsEditor, { emptyPort } from '../../components/station-admin/StationPortsEditor';
import { geocodeAddressParts, reverseGeocode } from '../../lib/nominatimGeocode';
import StationLocationPicker from '../../components/station-admin/StationLocationPicker';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { FloatingToast, FloatingToastRegion } from '../../components/admin/FloatingToast';
import StationStatusSelect from '../../components/station-admin/StationStatusSelect';
import {
  stationFormBackIconLink,
  stationFormCardTitle,
  stationFormDataScrollClass,
  stationFormLabel,
  stationFormMapStickyClass,
  stationFormPageHeaderRow,
  stationFormPageShell,
  stationFormPageTitle,
  stationFormSplitGrid,
} from '../../styles/stationAdminTheme';
import {
  DEFAULT_LAT,
  DEFAULT_LNG,
  MAP_HEIGHT_CLASS,
  REVERSE_DEBOUNCE_MS,
  SUBMIT_ERROR_TOAST_MS,
} from './stationNewPageConstants';
import { joinStreetHouse, splitStreetHouse } from '../../utils/stationApiPayload';
import {
  hasStationFormErrors,
  validateStationForm,
  type StationFormErrors,
} from '../../utils/stationFormValidation';

const inputClassBase =
  'mt-1 w-full rounded-xl border-2 bg-white px-4 py-3 text-sm outline-none transition focus:ring-4';

function inputClass(ok: boolean) {
  return ok
    ? `${inputClassBase} border-gray-200 hover:border-gray-300 focus:border-green-500 focus:ring-green-500/15`
    : `${inputClassBase} border-red-400 hover:border-red-400 focus:border-red-500 focus:ring-red-500/20`;
}

const fieldErrorText = 'mt-1.5 text-xs text-red-600';

export default function StationNewPage() {
  const { addStation, uniqueCities } = useStations();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dashBase = pathname.startsWith('/admin-dashboard') ? '/admin-dashboard' : '/station-dashboard';

  const [name, setName] = useState('');
  /** ISO 3166-1 alpha-2 зворотним геокодуванням за поточними координатами (без окремого поля). */
  const [country, setCountry] = useState('UA');
  const [city, setCity] = useState('Львів');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [lat, setLat] = useState(String(DEFAULT_LAT));
  const [lng, setLng] = useState(String(DEFAULT_LNG));
  const [status, setStatus] = useState<StationStatus>('working');
  const [ports, setPorts] = useState<StationPort[]>(() => [emptyPort()]);

  const [flyToKey, setFlyToKey] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
      if (submitErrorTimerRef.current) clearTimeout(submitErrorTimerRef.current);
    };
  }, []);

  /** Початкові координати → код країни з Nominatim. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await reverseGeocode(DEFAULT_LAT, DEFAULT_LNG);
      if (!cancelled && r.ok && r.countryCode) setCountry(r.countryCode);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!submitError) return;
    if (submitErrorTimerRef.current) clearTimeout(submitErrorTimerRef.current);
    submitErrorTimerRef.current = setTimeout(() => {
      setSubmitError(null);
      submitErrorTimerRef.current = null;
    }, SUBMIT_ERROR_TOAST_MS);
    return () => {
      if (submitErrorTimerRef.current) clearTimeout(submitErrorTimerRef.current);
    };
  }, [submitError]);

  const parseNum = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  };

  const latNum = parseNum(lat);
  const lngNum = parseNum(lng);
  const mapLat = Number.isFinite(latNum) ? latNum : DEFAULT_LAT;
  const mapLng = Number.isFinite(lngNum) ? lngNum : DEFAULT_LNG;

  const fieldErrors: StationFormErrors = useMemo(
    () =>
      validateStationForm(
        {
          name,
          city,
          street,
          houseNumber,
          lat: mapLat,
          lng: mapLng,
          ports,
        },
        { requireCountry: false }
      ),
    [name, city, street, houseNumber, mapLat, mapLng, ports]
  );

  const setPositionFromMap = (la: number, lo: number) => {
    setLat(la.toFixed(6));
    setLng(lo.toFixed(6));
    if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    reverseTimerRef.current = setTimeout(async () => {
      try {
        const r = await reverseGeocode(la, lo);
        if (r.ok) {
          if (r.city && r.city !== '—') setCity(r.city);
          const parts = splitStreetHouse(r.address);
          setStreet(parts.street);
          setHouseNumber(parts.houseNumber);
          if (r.countryCode) setCountry(r.countryCode);
        }
      } catch {
        /* мережа / Nominatim */
      }
    }, REVERSE_DEBOUNCE_MS);
  };

  // Підбір координат по адресі
  const applyCoordsFromAddressFields = async () => {
    const line = joinStreetHouse(street, houseNumber);
    const c = city.trim();
    if (!line || line === '—' || !c) return;
    try {
      const result = await geocodeAddressParts(line, c);
      if (result.ok) {
        setLat(result.lat.toFixed(6));
        setLng(result.lng.toFixed(6));
        setFlyToKey((k) => k + 1);
        const rev = await reverseGeocode(result.lat, result.lng);
        if (rev.ok && rev.countryCode) setCountry(rev.countryCode);
      }
    } catch {
      /* мережа / геокодер */
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setAttempted(true);
    if (hasStationFormErrors(fieldErrors)) return;
    try {
      const station = await addStation({
        name: name.trim(),
        country: country.trim() || 'UA',
        city: city.trim() || 'Львів',
        address: joinStreetHouse(street, houseNumber),
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
      navigate(`${dashBase}/stations/${station.id}`, { state: { stationNotice: 'created' as const } });
    } catch (err) {
      const msg =
        err instanceof Error && err.message.trim()
          ? err.message
          : 'Не вдалося створити станцію. Перевірте дані та спробуйте ще раз.';
      setSubmitError(msg);
    }
  };

  return (
    <div className={stationFormPageShell}>
      <FloatingToastRegion live="assertive">
        <FloatingToast
          show={Boolean(submitError)}
          tone="danger"
          onDismiss={() => setSubmitError(null)}
        >
          {submitError}
        </FloatingToast>
      </FloatingToastRegion>
      <div className={stationFormPageHeaderRow}>
        <Link
          to={`${dashBase}/stations`}
          className={stationFormBackIconLink}
          title="До списку станцій"
          aria-label="До списку станцій"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={stationFormPageTitle}>Нова станція</h1>
      </div>

      <div className={stationFormSplitGrid}>
        <div className={stationFormMapStickyClass}>
          <AppCard padding={false}>
            <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
              <h2 className={stationFormCardTitle}>Розташування</h2>
            </div>
            <div className="space-y-2 p-3">
              <StationLocationPicker
                lat={mapLat}
                lng={mapLng}
                onPositionChange={setPositionFromMap}
                flyToKey={flyToKey}
                mapClassName={MAP_HEIGHT_CLASS}
              />
            </div>
          </AppCard>
        </div>

        <AppCard className={stationFormDataScrollClass}>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {attempted && fieldErrors.coordinates ? (
              <p className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-800" role="alert">
                {fieldErrors.coordinates}
              </p>
            ) : null}
            <div>
              <label htmlFor="nw-name" className={stationFormLabel}>
                Назва станції <span className="text-red-500">*</span>
              </label>
              <input
                id="nw-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="напр. Станція «Вокзал»"
                className={inputClass(!attempted || !fieldErrors.name)}
                aria-invalid={attempted && Boolean(fieldErrors.name)}
                aria-describedby={attempted && fieldErrors.name ? 'nw-name-err' : undefined}
              />
              {attempted && fieldErrors.name ? (
                <p id="nw-name-err" className={fieldErrorText}>
                  {fieldErrors.name}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="nw-city" className={stationFormLabel}>
                Місто <span className="text-red-500">*</span>
              </label>
              <input
                id="nw-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onBlur={() => void applyCoordsFromAddressFields()}
                list="city-suggestions"
                className={inputClass(!attempted || !fieldErrors.city)}
                aria-invalid={attempted && Boolean(fieldErrors.city)}
                aria-describedby={attempted && fieldErrors.city ? 'nw-city-err' : undefined}
              />
              <datalist id="city-suggestions">
                {uniqueCities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {attempted && fieldErrors.city ? (
                <p id="nw-city-err" className={fieldErrorText}>
                  {fieldErrors.city}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
              <div className="min-w-0 flex-1">
                <label htmlFor="nw-street" className={stationFormLabel}>
                  Вулиця <span className="text-red-500">*</span>
                </label>
                <input
                  id="nw-street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  onBlur={() => void applyCoordsFromAddressFields()}
                  placeholder="напр. вул. Університетська"
                  className={inputClass(!attempted || !fieldErrors.street)}
                  autoComplete="street-address"
                  aria-invalid={attempted && Boolean(fieldErrors.street)}
                  aria-describedby={attempted && fieldErrors.street ? 'nw-street-err' : undefined}
                />
                {attempted && fieldErrors.street ? (
                  <p id="nw-street-err" className={fieldErrorText}>
                    {fieldErrors.street}
                  </p>
                ) : null}
              </div>
              <div className="w-full shrink-0 sm:w-[7.25rem]">
                <label htmlFor="nw-house" className={stationFormLabel}>
                  Будинок
                </label>
                <input
                  id="nw-house"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  onBlur={() => void applyCoordsFromAddressFields()}
                  placeholder="напр. 1"
                  className={inputClass(!attempted || !fieldErrors.houseNumber)}
                  aria-invalid={attempted && Boolean(fieldErrors.houseNumber)}
                  aria-describedby={attempted && fieldErrors.houseNumber ? 'nw-house-err' : undefined}
                />
                {attempted && fieldErrors.houseNumber ? (
                  <p id="nw-house-err" className={fieldErrorText}>
                    {fieldErrors.houseNumber}
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <span className={stationFormLabel}>Статус</span>
              <StationStatusSelect variant="new" value={status} onChange={setStatus} />
            </div>

            <div className="border-t border-gray-100 pt-6">
              {attempted && fieldErrors.ports ? (
                <p className="mb-2 text-sm text-red-600" role="alert">
                  {fieldErrors.ports}
                </p>
              ) : null}
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
