import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useStations } from '../../context/StationsContext';
import type { StationPort, StationStatus } from '../../types/station';
import { geocodeAddressParts, reverseGeocode } from '../../lib/nominatimGeocode';
import StationLocationPicker from '../../components/station-admin/StationLocationPicker';
import StationPortsEditor from '../../components/station-admin/StationPortsEditor';
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
import { joinStreetHouse, splitStreetHouse } from '../../utils/stationApiPayload';
import { MAP_HEIGHT_CLASS, REVERSE_DEBOUNCE_MS, SUBMIT_ERROR_TOAST_MS } from './stationNewPageConstants';
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

export default function StationEditPage() {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dashBase = pathname.startsWith('/admin-dashboard') ? '/admin-dashboard' : '/station-dashboard';
  const {
    getStation,
    updateStation,
    archiveStation,
    unarchiveStation,
    uniqueCities,
    error: stationsError,
    clearStationsError,
  } = useStations();
  const base = stationId ? getStation(stationId) : undefined;

  const [name, setName] = useState('');
  const [country, setCountry] = useState('UA');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [status, setStatus] = useState<StationStatus>('working');
  const [ports, setPorts] = useState<StationPort[]>([]);

  const [flyToKey, setFlyToKey] = useState(0);

  const [draftArchived, setDraftArchived] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const skipFirstReverse = useRef(true);

  useEffect(() => {
    skipFirstReverse.current = true;
  }, [base?.id]);

  useEffect(() => {
    return () => {
      if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
      if (submitErrorTimerRef.current) clearTimeout(submitErrorTimerRef.current);
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

  /** Лише при перемиканні станції — щоб після PATCH статусу reload() не скидав незбережені поля форми. */
  useEffect(() => {
    if (!base) return;
    setName(base.name);
    setCountry(base.country || 'UA');
    setCity(base.city);
    const addrParts = splitStreetHouse(base.address);
    setStreet(addrParts.street);
    setHouseNumber(addrParts.houseNumber);
    setLat(base.lat.toFixed(6));
    setLng(base.lng.toFixed(6));
    setStatus(base.status);
    setPorts(base.ports.map((p) => ({ ...p })));
    setDraftArchived(Boolean(base.archived));
  }, [base?.id]);

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

  const fieldErrors: StationFormErrors = useMemo(
    () =>
      validateStationForm(
        {
          name,
          city,
          street,
          houseNumber,
          country,
          lat: mapLat,
          lng: mapLng,
          ports,
        },
        { requireCountry: false }
      ),
    [name, city, street, houseNumber, country, mapLat, mapLng, ports]
  );

  const setPositionFromMap = (la: number, lo: number) => {
    setLat(la.toFixed(6));
    setLng(lo.toFixed(6));
    if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    reverseTimerRef.current = setTimeout(async () => {
      if (skipFirstReverse.current) {
        skipFirstReverse.current = false;
        return;
      }
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

  const handleStatusChange = (v: StationStatus) => {
    if (!base) return;
    setStatus(v);
    void updateStation(base.id, { status: v });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setAttempted(true);
    if (hasStationFormErrors(fieldErrors)) return;
    const wasArchived = Boolean(base.archived);
    const wantArchived = draftArchived;
    const statusForSave: StationStatus = status === 'archived' ? 'working' : status;
    try {
      if (wasArchived && !wantArchived) {
        await unarchiveStation(base.id);
      }
      await updateStation(base.id, {
        name: name.trim(),
        country: country.trim() || base.country,
        city: city.trim(),
        address: joinStreetHouse(street, houseNumber),
        lat: mapLat,
        lng: mapLng,
        status: statusForSave,
        ports: ports.map((p) => ({ ...p })),
      });
      if (!wasArchived && wantArchived) {
        await archiveStation(base.id);
      }
      navigate(`${dashBase}/stations/${base.id}`, {
        replace: true,
        state: {
          stationNotice: wantArchived && !wasArchived ? 'archived' : 'updated',
        },
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.message.trim()
          ? err.message
          : 'Не вдалося зберегти зміни. Перевірте дані та спробуйте ще раз';
      setSubmitError(msg);
    }
  };

  return (
    <div className={stationFormPageShell}>
      <FloatingToastRegion live="assertive">
        <FloatingToast
          show={Boolean(submitError ?? stationsError)}
          tone="danger"
          onDismiss={() => {
            setSubmitError(null);
            clearStationsError();
          }}
        >
          {submitError ?? stationsError}
        </FloatingToast>
      </FloatingToastRegion>
      <div className={stationFormPageHeaderRow}>
        <Link
          to={`${dashBase}/stations/${base.id}`}
          className={stationFormBackIconLink}
          title="Назад до станції"
          aria-label="Назад до станції"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={stationFormPageTitle}>Редагування станції</h1>
      </div>

      <div className={stationFormSplitGrid}>
        <div className={stationFormMapStickyClass}>
          <AppCard padding={false}>
            <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
              <h2 className={stationFormCardTitle}>Розташування</h2>
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
        </div>

        <AppCard className={stationFormDataScrollClass}>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {attempted && fieldErrors.coordinates ? (
              <p className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-800" role="alert">
                {fieldErrors.coordinates}
              </p>
            ) : null}
            <div>
              <label htmlFor="st-name" className={stationFormLabel}>
                Назва станції <span className="text-red-500">*</span>
              </label>
              <input
                id="st-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="напр. Станція «Вокзал»"
                className={inputClass(!attempted || !fieldErrors.name)}
                aria-invalid={attempted && Boolean(fieldErrors.name)}
                aria-describedby={attempted && fieldErrors.name ? 'st-name-err' : undefined}
              />
              {attempted && fieldErrors.name ? (
                <p id="st-name-err" className={fieldErrorText}>
                  {fieldErrors.name}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="st-city" className={stationFormLabel}>
                Місто <span className="text-red-500">*</span>
              </label>
              <input
                id="st-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onBlur={() => void applyCoordsFromAddressFields()}
                list="edit-city-suggestions"
                className={inputClass(!attempted || !fieldErrors.city)}
                aria-invalid={attempted && Boolean(fieldErrors.city)}
                aria-describedby={attempted && fieldErrors.city ? 'st-city-err' : undefined}
              />
              <datalist id="edit-city-suggestions">
                {uniqueCities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {attempted && fieldErrors.city ? (
                <p id="st-city-err" className={fieldErrorText}>
                  {fieldErrors.city}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
              <div className="min-w-0 flex-1">
                <label htmlFor="st-street" className={stationFormLabel}>
                  Вулиця <span className="text-red-500">*</span>
                </label>
                <input
                  id="st-street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  onBlur={() => void applyCoordsFromAddressFields()}
                  placeholder="напр. вул. Університетська"
                  className={inputClass(!attempted || !fieldErrors.street)}
                  autoComplete="street-address"
                  aria-invalid={attempted && Boolean(fieldErrors.street)}
                  aria-describedby={attempted && fieldErrors.street ? 'st-street-err' : undefined}
                />
                {attempted && fieldErrors.street ? (
                  <p id="st-street-err" className={fieldErrorText}>
                    {fieldErrors.street}
                  </p>
                ) : null}
              </div>
              <div className="w-full shrink-0 sm:w-[7.25rem]">
                <label htmlFor="st-house" className={stationFormLabel}>
                  Будинок
                </label>
                <input
                  id="st-house"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  onBlur={() => void applyCoordsFromAddressFields()}
                  placeholder="напр. 1"
                  className={inputClass(!attempted || !fieldErrors.houseNumber)}
                  aria-invalid={attempted && Boolean(fieldErrors.houseNumber)}
                  aria-describedby={attempted && fieldErrors.houseNumber ? 'st-house-err' : undefined}
                />
                {attempted && fieldErrors.houseNumber ? (
                  <p id="st-house-err" className={fieldErrorText}>
                    {fieldErrors.houseNumber}
                  </p>
                ) : null}
              </div>
            </div>

            {!draftArchived ? (
              <div>
                <span className={stationFormLabel}>Статус</span>
                <StationStatusSelect
                  variant="edit"
                  value={status === 'archived' ? 'working' : status}
                  onChange={handleStatusChange}
                />
              </div>
            ) : null}

            <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/90 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-900">В архіві</span>
                <button
                  type="button"
                  role="switch"
                  aria-label="В архіві"
                  aria-checked={draftArchived}
                  onClick={() => setDraftArchived((v) => !v)}
                  className={`relative inline-flex h-7 w-[2.75rem] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 ${
                    draftArchived ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none mt-0.5 inline-block h-6 w-6 rounded-full bg-white shadow ring-0 transition-transform ${
                      draftArchived ? 'translate-x-[1.35rem]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              
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
              <PrimaryButton type="submit">Зберегти зміни</PrimaryButton>
              <OutlineButton type="button" onClick={() => navigate(`${dashBase}/stations/${base.id}`)}>
                Скасувати
              </OutlineButton>
            </div>
          </form>
        </AppCard>
      </div>
    </div>
  );
}
