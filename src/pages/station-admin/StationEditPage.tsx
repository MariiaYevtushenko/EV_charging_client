import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
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
import { FloatingToast, FloatingToastRegion } from '../../components/admin/FloatingToast';
import StationStatusSelect from '../../components/station-admin/StationStatusSelect';
import {
  stationFormBackIconLink,
  stationFormCardSubline,
  stationFormCardTitle,
  stationFormDataScrollClass,
  stationFormHelpText,
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
  const { getStation, updateStation, archiveStation, unarchiveStation, uniqueCities } = useStations();
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
  const [reverseLoading, setReverseLoading] = useState(false);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Не перезаписувати адресу з БД після першого moveend карти при відкритті сторінки. */
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
        { requireCountry: true }
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
      setReverseLoading(true);
      try {
        const r = await reverseGeocode(la, lo);
        if (r.ok) {
          if (r.city && r.city !== '—') setCity(r.city);
          const parts = splitStreetHouse(r.address);
          setStreet(parts.street);
          setHouseNumber(parts.houseNumber);
        }
      } finally {
        setReverseLoading(false);
      }
    }, REVERSE_DEBOUNCE_MS);
  };

  const applyCoordsFromAddressFields = async () => {
    const line = joinStreetHouse(street, houseNumber);
    const c = city.trim();
    if (!line || line === '—' || !c) return;
    setForwardLoading(true);
    try {
      const result = await geocodeAddressParts(line, c);
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
    setSubmitError(null);
    setAttempted(true);
    if (hasStationFormErrors(fieldErrors)) return;
    try {
      await updateStation(base.id, {
        name: name.trim(),
        country: country.trim() || base.country,
        city: city.trim(),
        address: joinStreetHouse(street, houseNumber),
        lat: mapLat,
        lng: mapLng,
        status,
        ports: ports.map((p) => ({ ...p })),
      });
      navigate(`${dashBase}/stations/${base.id}`, {
        replace: true,
        state: { stationNotice: 'updated' as const },
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.message.trim()
          ? err.message
          : 'Не вдалося зберегти зміни. Перевірте дані та спробуйте ще раз.';
      setSubmitError(msg);
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
            ? 'rounded-2xl border border-amber-200/90 bg-amber-50/40 p-3 ring-1 ring-amber-100/80 sm:p-4'
            : ''
        }
      >
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
          <h1 className={`${stationFormPageTitle} ${base.archived ? 'text-amber-950' : ''}`}>
            Редагування станції
          </h1>
        </div>
        {base.archived ? (
          <p className="mt-1.5 text-sm font-medium text-amber-900/90">Станція в архіві</p>
        ) : null}
      </div>

      <div className={stationFormSplitGrid}>
        <div className={stationFormMapStickyClass}>
          <AppCard padding={false}>
            <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
              <h2 className={stationFormCardTitle}>Розташування</h2>
              <p className={stationFormCardSubline}>
                {reverseLoading || forwardLoading
                  ? reverseLoading
                    ? 'Оновлюємо адресу за координатами…'
                    : 'Шукаємо координати за адресом…'
                  : 'Перетягніть маркер або змініть місто й вулицю в формі.'}
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
              <p className="text-sm leading-snug text-gray-600">
                <span className="font-medium text-gray-700">Координати: </span>
                {mapLat.toFixed(6)}, {mapLng.toFixed(6)}
              </p>
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
              <label htmlFor="st-country" className={stationFormLabel}>
                Країна (код ISO) <span className="text-red-500">*</span>
              </label>
              <input
                id="st-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="UA"
                maxLength={100}
                className={inputClass(!attempted || !fieldErrors.country)}
                autoComplete="country"
                aria-invalid={attempted && Boolean(fieldErrors.country)}
                aria-describedby={attempted && fieldErrors.country ? 'st-country-err' : undefined}
              />
              {attempted && fieldErrors.country ? (
                <p id="st-country-err" className={fieldErrorText}>
                  {fieldErrors.country}
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

            <div>
              <span className={stationFormLabel}>Статус</span>
              <StationStatusSelect variant="edit" value={status} onChange={setStatus} />
              <p className={stationFormHelpText}>
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

          {!base.archived ? (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <p className="text-sm font-semibold text-gray-900">Архів</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
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
