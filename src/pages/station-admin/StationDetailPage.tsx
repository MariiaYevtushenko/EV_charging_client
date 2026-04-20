import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  fetchStationDashboard,
  fetchStationEnergyAnalytics,
  fetchStationUpcomingBookings,
} from '../../api/stations';
import type {
  StationEnergyAnalyticsDto,
  StationEnergyPeriod,
  StationUpcomingBookingDto,
} from '../../types/stationApi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Station, StationPort, StationStatus } from '../../types/station';
import { useStations } from '../../context/StationsContext';
import { stationFromDashboardDto } from '../../utils/stationFromDashboardDto';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import StationPortsEditor from '../../components/station-admin/StationPortsEditor';
import StationMiniMap from '../../components/station-admin/StationMiniMap';
import {
  AppCard,
  DangerButton,
  OutlineButton,
  PrimaryButton,
  StatusPill,
} from '../../components/station-admin/Primitives';
import { portStatusLabel, portStatusTone, stationStatusLabel, stationStatusTone } from '../../utils/stationLabels';
import { countryIsoTooltip, formatCountryLabel } from '../../utils/countryDisplay';
import {
  stationAdminPageTitle,
  stationAdminUnderlineTabActive,
  stationAdminUnderlineTabIdle,
  stationFormBackIconLink,
} from '../../styles/stationAdminTheme';
import { FloatingToast, FloatingToastRegion } from '../../components/admin/FloatingToast';
import { SUCCESS_TOAST_MS } from './stationNewPageConstants';

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  );
}

type StationDetailLocationState = { stationNotice?: 'created' | 'updated' | 'archived' };

type DetailTab = 'overview' | 'analytics' | 'bookings' | 'ports';

const tabClass = (active: boolean) =>
  active ? stationAdminUnderlineTabActive : stationAdminUnderlineTabIdle;

function tabFromHash(hash: string, isGlobalAdmin: boolean): DetailTab {
  if (hash === '#station-analytics') return 'analytics';
  if (hash === '#station-bookings') return 'bookings';
  if (hash === '#station-ports') return 'ports';
  if (isGlobalAdmin) return 'analytics';
  return 'overview';
}

function formatChartAxisLabel(iso: string, period: StationEnergyPeriod): string {
  const d = new Date(iso);
  if (period === '1d') {
    return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  }
  if (period === '7d') {
    return d.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}

function fmtBookingRange(startIso: string, endIso: string) {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sameDay =
      s.getFullYear() === e.getFullYear() &&
      s.getMonth() === e.getMonth() &&
      s.getDate() === e.getDate();
    const dateStr = s.toLocaleDateString('uk-UA', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const t1 = s.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const t2 = e.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    if (sameDay) {
      return { dateLine: dateStr, timeLine: `${t1} — ${t2}` };
    }
    return {
      dateLine: `${s.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })} ${t1}`,
      timeLine: `→ ${e.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })}, ${t2}`,
    };
  } catch {
    return { dateLine: startIso, timeLine: '' };
  }
}

const STATION_STATUS_OPTIONS: { value: StationStatus; label: string }[] = [
  { value: 'working', label: 'Працює' },
  { value: 'offline', label: 'Оффлайн' },
  { value: 'maintenance', label: 'Обслуговування' },
];

export default function StationDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dashBase = location.pathname.startsWith('/admin-dashboard')
    ? '/admin-dashboard'
    : '/station-dashboard';
  const isGlobalAdminDash = location.pathname.startsWith('/admin-dashboard');
  const { getStation, unarchiveStation, updateStation, archiveStation } = useStations();
  /** Глобальний адмін: на цій сторінці лише перегляд аналітики/броней (без зміни статусу та портів тут); форма картки — через олівець → редагування. */
  const readOnlyStationDetail = isGlobalAdminDash;
  const { stationId } = useParams<{ stationId: string }>();
  const stationFromCtx = stationId ? getStation(stationId) : undefined;
  const [stationFallback, setStationFallback] = useState<Station | null>(null);
  /** Поки true — не редіректити на список; на першому рендері true, якщо картку треба тягнути з API (станції немає в контексті). */
  const [stationResolveLoading, setStationResolveLoading] = useState(() => {
    if (!stationId) return false;
    if (!Number.isFinite(Number(stationId))) return false;
    return !getStation(stationId);
  });
  const station = stationFromCtx ?? stationFallback ?? undefined;

  const [tab, setTab] = useState<DetailTab>(() =>
    typeof window !== 'undefined'
      ? tabFromHash(window.location.hash, isGlobalAdminDash)
      : isGlobalAdminDash
        ? 'analytics'
        : 'overview'
  );
  const [portsModalOpen, setPortsModalOpen] = useState(false);
  const [portsDraft, setPortsDraft] = useState<StationPort[]>([]);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [upcomingBookings, setUpcomingBookings] = useState<StationUpcomingBookingDto[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);

  const [energyPeriod, setEnergyPeriod] = useState<StationEnergyPeriod>('1d');
  const [energyAnalytics, setEnergyAnalytics] = useState<StationEnergyAnalyticsDto | null>(null);
  const [energyLoading, setEnergyLoading] = useState(false);
  const [energyError, setEnergyError] = useState<string | null>(null);
  const [stationSuccessMessage, setStationSuccessMessage] = useState<string | null>(null);
  const successToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chartRows = useMemo(() => {
    if (!energyAnalytics?.points.length) return [];
    return energyAnalytics.points.map((p) => ({
      t: formatChartAxisLabel(p.bucketStart, energyAnalytics.period),
      kwh: p.kwh,
      fullLabel: new Date(p.bucketStart).toLocaleString('uk-UA'),
    }));
  }, [energyAnalytics]);

  const energyDayTotal = useMemo(
    () => (station ? station.energyByHour.reduce((a, b) => a + b, 0) : 0),
    [station]
  );

  /** Спочатку знімаємо stationNotice з history, щоб інші navigate не втратили повідомлення. */
  useEffect(() => {
    const st = location.state as StationDetailLocationState | null | undefined;
    const n = st?.stationNotice;
    if (n !== 'created' && n !== 'updated' && n !== 'archived') return;
    setStationSuccessMessage(
      n === 'created'
        ? 'Станцію успішно створено.'
        : n === 'archived'
          ? 'Станцію переведено в архів.'
          : 'Дані про станцію успішно оновлено.'
    );
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: {} }
    );
  }, [location.state, location.pathname, location.search, location.hash, navigate]);

  useEffect(() => {
    if (!stationSuccessMessage) return;
    if (successToastTimerRef.current) clearTimeout(successToastTimerRef.current);
    successToastTimerRef.current = setTimeout(() => {
      setStationSuccessMessage(null);
      successToastTimerRef.current = null;
    }, SUCCESS_TOAST_MS);
    return () => {
      if (successToastTimerRef.current) clearTimeout(successToastTimerRef.current);
    };
  }, [stationSuccessMessage]);

  useEffect(() => {
    setTab(tabFromHash(location.hash, isGlobalAdminDash));
  }, [station?.id, location.hash, isGlobalAdminDash]);

  useEffect(() => {
    if (!readOnlyStationDetail || tab !== 'overview' || !station) return;
    setTab('analytics');
    navigate(
      { pathname: `${dashBase}/stations/${station.id}`, hash: 'station-analytics' },
      { replace: true }
    );
  }, [readOnlyStationDetail, tab, station, dashBase, navigate]);

  useEffect(() => {
    if (!stationId) {
      setStationFallback(null);
      return;
    }
    if (getStation(stationId)) {
      setStationFallback(null);
      return;
    }
    const nid = Number(stationId);
    if (!Number.isFinite(nid)) {
      setStationFallback(null);
      return;
    }
    let cancelled = false;
    setStationResolveLoading(true);
    fetchStationDashboard(nid)
      .then((dto) => {
        if (!cancelled) setStationFallback(stationFromDashboardDto(dto));
      })
      .catch(() => {
        if (!cancelled) setStationFallback(null);
      })
      .finally(() => {
        if (!cancelled) setStationResolveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stationId, getStation]);

  useEffect(() => {
    if (!station || tab !== 'bookings') return;
    const sid = Number(station.id);
    if (!Number.isFinite(sid)) return;
    let cancelled = false;
    setUpcomingLoading(true);
    setUpcomingError(null);
    fetchStationUpcomingBookings(sid)
      .then((res) => {
        if (!cancelled) setUpcomingBookings(res.items);
      })
      .catch(() => {
        if (!cancelled) setUpcomingError('Не вдалося завантажити бронювання');
      })
      .finally(() => {
        if (!cancelled) setUpcomingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [station?.id, tab]);

  useEffect(() => {
    if (!station || tab !== 'analytics') return;
    const sid = Number(station.id);
    if (!Number.isFinite(sid)) return;
    let cancelled = false;
    setEnergyLoading(true);
    setEnergyError(null);
    fetchStationEnergyAnalytics(sid, energyPeriod)
      .then((data) => {
        if (!cancelled) setEnergyAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) {
          setEnergyAnalytics(null);
          setEnergyError('Не вдалося завантажити аналітику');
        }
      })
      .finally(() => {
        if (!cancelled) setEnergyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [station?.id, tab, energyPeriod]);

  const openPortsEditor = () => {
    if (!station) return;
    setPortsDraft(station.ports.map((p) => ({ ...p })));
    setPortsModalOpen(true);
  };

  const savePorts = async () => {
    if (!station) return;
    try {
      await updateStation(station.id, { ports: portsDraft.map((p) => ({ ...p })) });
      setPortsModalOpen(false);
    } catch {
      /* помилка в контексті */
    }
  };

  const numericStationId = stationId != null ? Number(stationId) : NaN;
  if (!stationId || !Number.isFinite(numericStationId)) {
    return <Navigate to={`${dashBase}/stations`} replace />;
  }

  if (stationResolveLoading && !station) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-gray-700">Завантаження картки станції…</p>
        <p className="max-w-sm text-xs text-gray-500">
          Якщо ви перейшли з іншого розділу, дані підвантажуються напряму з сервера.
        </p>
      </div>
    );
  }

  if (!station) {
    return <Navigate to={`${dashBase}/stations`} replace />;
  }

  const goTab = (t: DetailTab) => {
    setTab(t);
    const pathname = `${dashBase}/stations/${station.id}`;
    const hash =
      t === 'analytics'
        ? 'station-analytics'
        : t === 'bookings'
          ? 'station-bookings'
          : t === 'ports'
            ? 'station-ports'
            : '';
    navigate({ pathname, hash }, { replace: true });
  };

  const confirmArchive = async () => {
    try {
      await archiveStation(station.id);
      setArchiveConfirmOpen(false);
      setStationSuccessMessage('Станцію переведено в архів');
    } catch {
      /* помилка в контексті */
    }
  };

  return (
    <div className="space-y-6">
      <FloatingToastRegion>
        <FloatingToast
          show={Boolean(stationSuccessMessage)}
          tone="success"
          onDismiss={() => setStationSuccessMessage(null)}
        >
          {stationSuccessMessage}
        </FloatingToast>
      </FloatingToastRegion>
      {!readOnlyStationDetail && portsModalOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ports-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-gray-900/35"
            aria-label="Закрити"
            onClick={() => setPortsModalOpen(false)}
          />
          <div className="relative z-10 max-h-[min(92dvh,780px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h2 id="ports-modal-title" className="text-lg font-bold text-gray-900">
              Редагування портів
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Зміни збережено
            </p>
            <div className="mt-4 max-h-[min(65dvh,520px)] overflow-y-auto pr-1">
              <StationPortsEditor
                ports={portsDraft}
                onChange={setPortsDraft}
                priceDefault={0}
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              <PrimaryButton type="button" onClick={savePorts}>
                Зберегти порти
              </PrimaryButton>
              <OutlineButton type="button" onClick={() => setPortsModalOpen(false)}>
                Скасувати
              </OutlineButton>
            </div>
          </div>
        </div>
      ) : null}

      {station.archived ? (
        <div className="rounded-2xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm shadow-sm shadow-red-900/5">
          <p className="font-bold text-red-900">
            {readOnlyStationDetail
              ? 'Станція в архіві — не показується на карті та у списку «Усі»'
              : 'Станція в архіві — не показується на карті та у списку «Усі». Для зміни статусу розархівуйте станцію'}
          </p>
        </div>
      ) : null}

      {!readOnlyStationDetail ? (
        <ConfirmDialog
          open={archiveConfirmOpen}
          onClose={() => setArchiveConfirmOpen(false)}
          onConfirm={confirmArchive}
          title="Перемістити станцію в архів?"
          description="Вона зникне з карти та зі списку «Усі»; її можна буде знайти у вкладці «Архів»."
          confirmLabel="Так, в архів"
          cancelLabel="Скасувати"
          variant="danger"
        />
      ) : null}

      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
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
            <div className="min-w-0 flex-1">
              <div className="min-w-0">
                <h1 className={stationAdminPageTitle}>{station.name}</h1>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-gray-600">
                <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                </svg>
                <span className="min-w-0 font-medium text-gray-800">
                  {station.city.trim() || '—'}
                </span>
                <span className="text-gray-300" aria-hidden>
                  |
                </span>
                <span
                  className="min-w-0 text-gray-600"
                  title={countryIsoTooltip(station.country) ?? undefined}
                >
                  {formatCountryLabel(station.country)}
                </span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:ml-auto sm:pt-0.5">
            <StatusPill tone={stationStatusTone(station.status)} size="md">
              {stationStatusLabel(station.status)}
            </StatusPill>
            <Link
              to={`${dashBase}/stations/${station.id}/edit`}
              className={stationFormBackIconLink}
              title="Редагувати станцію"
              aria-label="Редагувати станцію"
            >
              <PencilIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-0 overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
        <div className="flex min-w-[100px] flex-1 flex-col justify-center border-b border-gray-100 px-4 py-3 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Дохід сьогодні</p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-green-700">
            {station.todayRevenue.toLocaleString('uk-UA')}{' '}
            <span className="text-xs font-semibold">грн</span>
          </p>
        </div>
        <div className="flex min-w-[88px] flex-1 flex-col justify-center border-b border-gray-100 px-4 py-3 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Сесії</p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-gray-900">{station.todaySessions}</p>
        </div>
        <div className="flex min-w-[120px] flex-[1.15] flex-col justify-center px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Енергія за добу</p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-gray-900">
            {energyDayTotal.toLocaleString('uk-UA')}{' '}
            <span className="text-xs font-semibold text-gray-500">кВт·год</span>
          </p>
        </div>
      </div>

      <div
        className={`flex flex-col gap-4 border-b border-gray-200 sm:gap-6 ${readOnlyStationDetail ? '' : 'sm:flex-row sm:items-end sm:justify-between'}`}
      >
        <nav
          className="-mx-1 flex min-w-0 gap-6 overflow-x-auto px-1 pb-3"
          aria-label="Розділи станції"
        >
          {!readOnlyStationDetail ? (
            <button type="button" className={tabClass(tab === 'overview')} onClick={() => goTab('overview')}>
              Загалом
            </button>
          ) : null}
          <button type="button" className={tabClass(tab === 'analytics')} onClick={() => goTab('analytics')}>
            Аналітика
          </button>
          <button type="button" className={tabClass(tab === 'bookings')} onClick={() => goTab('bookings')}>
            Бронювання
          </button>
          <button type="button" className={tabClass(tab === 'ports')} onClick={() => goTab('ports')}>
            Порти ({station.ports.length})
          </button>
        </nav>
        {!readOnlyStationDetail ? (
          <div
            className="flex shrink-0 flex-col gap-2 pb-3 sm:items-end"
            aria-label="Управління станцією"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Статус</p>
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`inline-flex rounded-xl border p-0.5 shadow-sm ${
                  station.archived
                    ? 'border-amber-200/80 bg-amber-100/50'
                    : 'border-slate-200 bg-green-50/35'
                }`}
                role="group"
                aria-label="Зміна статусу станції"
              >
                {STATION_STATUS_OPTIONS.map(({ value, label }) => {
                  const active = station.status === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={station.archived}
                      onClick={() => void updateStation(station.id, { status: value })}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                        active
                          ? 'bg-white text-green-800 shadow-sm ring-1 ring-gray-200/80'
                          : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {station.archived ? (
                <OutlineButton
                  type="button"
                  className="!px-3 !py-1.5 !text-xs"
                  onClick={async () => {
                    try {
                      await unarchiveStation(station.id);
                    } catch {
                      /* помилка в контексті */
                    }
                  }}
                >
                  Розархівувати
                </OutlineButton>
              ) : (
                <button
                  type="button"
                  onClick={() => setArchiveConfirmOpen(true)}
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 shadow-sm transition hover:bg-red-50"
                >
                  В архів
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {!readOnlyStationDetail && tab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <AppCard className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">Про станцію</h2>
              <p className="text-sm text-gray-600">
                Адреса: <span className="font-medium text-gray-900">{station.address}</span>
              </p>
              <p className="text-sm text-gray-600">
                Місто: <span className="font-medium text-gray-900">{station.city}</span>
              </p>
              <p className="text-sm text-gray-600">
                Країна:{' '}
                <span
                  className="font-medium text-gray-900"
                  title={countryIsoTooltip(station.country)}
                >
                  {formatCountryLabel(station.country)}
                </span>
              </p>
              
             
            </AppCard>
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-900">На карті</h2>
              <StationMiniMap
                lat={station.lat}
                lng={station.lng}
                status={station.status}
                label={station.name}
              />
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'bookings' ? (
        <AppCard className="overflow-hidden border-slate-200 bg-gradient-to-br from-white to-green-50/35 p-0 shadow-sm">
          <div className="border-b border-slate-200 bg-green-50/50 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Заплановані бронювання</h2>
                <p className="mt-0.5 text-xs text-gray-600">
                  Майбутні слоти на цій станції зі статусом «підтверджено», від найближчого до найпізнішого
                </p>
              </div>
              {!upcomingLoading && !upcomingError ? (
                <span className="inline-flex items-center rounded-full bg-green-600/10 px-3 py-1 text-xs font-semibold tabular-nums text-green-900">
                  {upcomingBookings.length}{' '}
                  {upcomingBookings.length === 1
                    ? 'запис'
                    : upcomingBookings.length < 5
                      ? 'записи'
                      : 'записів'}
                </span>
              ) : null}
            </div>
          </div>

          <div className="px-5 py-4">
            {upcomingLoading ? (
              <p className="text-sm text-gray-500">Завантаження списку…</p>
            ) : upcomingError ? (
              <p className="text-sm text-red-600">{upcomingError}</p>
            ) : upcomingBookings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center">
                <p className="text-sm font-medium text-gray-700">Немає запланованих бронювань</p>
                <p className="mt-1 text-xs text-gray-500">
                  Коли з’являться нові підтверджені слоти, вони з’являться тут автоматично.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcomingBookings.map((b) => {
                  const { dateLine, timeLine } = fmtBookingRange(b.start, b.end);
                  const portLabel = `Порт ${b.portNumber}`;
                  const connectorBit = b.connectorName ? ` · ${b.connectorName}` : '';
                  const inner = (
                    <>
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-green-600/10 text-green-900">
                        <span className="text-[10px] font-bold uppercase leading-none opacity-80">
                          {new Date(b.start).toLocaleDateString('uk-UA', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold leading-tight tabular-nums">
                          {new Date(b.start).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{dateLine}</p>
                        <p className="mt-0.5 text-sm tabular-nums text-gray-600">{timeLine}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          <span className="font-semibold text-gray-700">{portLabel}</span>
                          {connectorBit}
                        </p>
                      </div>
                      <div className="min-w-0 text-right text-sm sm:max-w-[min(100%,280px)]">
                        <p className="truncate font-medium text-gray-900">
                          {b.userDisplayName ?? 'Користувач не вказаний'}
                        </p>
                        {b.userEmail ? (
                          <p className="truncate text-xs text-gray-500">{b.userEmail}</p>
                        ) : null}
                        {b.vehicleLicensePlate ? (
                          <p className="mt-1 inline-flex rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-800">
                            {b.vehicleLicensePlate}
                          </p>
                        ) : null}
                      </div>
                    </>
                  );
                  const rowClass =
                    'flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-5';
                  if (isGlobalAdminDash) {
                    return (
                      <li key={b.id}>
                        <Link
                          to={`${dashBase}/bookings/${b.id}`}
                          className={`${rowClass} -mx-2 rounded-xl px-2 transition hover:bg-green-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/35`}
                        >
                          {inner}
                        </Link>
                      </li>
                    );
                  }
                  return (
                    <li key={b.id} className={rowClass}>
                      {inner}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </AppCard>
      ) : null}

      {tab === 'analytics' ? (
        <AppCard className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Споживання енергії</h2>
              {energyLoading ? (
                <p className="mt-2 text-xs text-gray-400">Завантаження…</p>
              ) : energyError ? (
                <p className="mt-2 text-xs text-red-600">{energyError}</p>
              ) : energyAnalytics ? (
                <p className="mt-2 text-xs text-gray-600">
                  Усього за період:{' '}
                  <span className="font-semibold text-gray-900">
                    {energyAnalytics.totalKwh.toLocaleString('uk-UA')} кВт·год
                  </span>
                  <span className="text-gray-500">
                    {' '}
                    · сесій у відрізку: {energyAnalytics.sessionCount}
                  </span>
                </p>
              ) : null}
            </div>
            <div
              className="flex shrink-0 flex-wrap gap-1.5 rounded-xl border border-gray-200/90 bg-gray-50/80 p-1"
              role="group"
              aria-label="Період аналітики"
            >
              {(
                [
                  { id: '1d' as const, label: '24 год' },
                  { id: '7d' as const, label: '7 днів' },
                  { id: '30d' as const, label: '30 днів' },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setEnergyPeriod(id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    energyPeriod === id
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartRows}
                margin={{
                  top: 8,
                  right: 8,
                  left: -8,
                  bottom: energyAnalytics?.period === '30d' ? 32 : 6,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: 9 }}
                  stroke="#9ca3af"
                  interval={energyAnalytics?.period === '1d' ? 3 : energyAnalytics?.period === '30d' ? 2 : 0}
                  angle={energyAnalytics?.period === '30d' ? -30 : 0}
                  textAnchor={energyAnalytics?.period === '30d' ? 'end' : 'middle'}
                  height={energyAnalytics?.period === '30d' ? 48 : undefined}
                />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    fontSize: 12,
                  }}
                  formatter={(value) => {
                    const n = typeof value === 'number' ? value : Number(value);
                    return [`${Number.isFinite(n) ? n.toLocaleString('uk-UA') : '—'} кВт·год`, 'Споживання'];
                  }}
                  labelFormatter={(_label, payload) =>
                    payload?.[0]?.payload?.fullLabel != null
                      ? String(payload[0].payload.fullLabel)
                      : ''
                  }
                />
                <Bar dataKey="kwh" fill="#22c55e" radius={[6, 6, 0, 0]} name="кВт·год" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AppCard>
      ) : null}

      {tab === 'ports' ? (
        <AppCard className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900">Порти та конектори</h2>
            {!readOnlyStationDetail ? (
              <PrimaryButton type="button" className="!text-xs !py-2" onClick={openPortsEditor}>
                Змінити порти
              </PrimaryButton>
            ) : null}
          </div>
          {station.ports.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-gray-100 bg-gray-50/90 p-4 shadow-inner"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">
                    {p.label} · {p.connector}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{p.powerKw} кВт</p>
                  {p.occupiedEta ? (
                    <p className="mt-1 text-xs font-medium text-sky-700">Орієнтовно {p.occupiedEta}</p>
                  ) : null}
                </div>
                <StatusPill tone={portStatusTone(p.status)}>{portStatusLabel(p.status)}</StatusPill>
              </div>
              {!readOnlyStationDetail && p.status === 'busy' ? (
                <DangerButton type="button" className="mt-4 w-full">
                  Зупинити зарядку
                </DangerButton>
              ) : null}
            </div>
          ))}
        </AppCard>
      ) : null}
    </div>
  );
}
