import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { StationPort, StationStatus } from '../../types/station';
import { useStations } from '../../context/StationsContext';
import StationPortsEditor from '../../components/station-admin/StationPortsEditor';
import StationMiniMap from '../../components/station-admin/StationMiniMap';
import {
  AppCard,
  DangerButton,
  OutlineButton,
  PrimaryButton,
  StatusPill,
} from '../../components/station-admin/Primitives';
import {
  portStatusLabel,
  portStatusTone,
  stationStatusLabel,
  stationStatusTone,
} from '../../utils/stationLabels';

type DetailTab = 'overview' | 'analytics' | 'ports';

const tabClass = (active: boolean) =>
  `relative shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
    active
      ? 'border-green-600 text-green-800'
      : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800'
  }`;

function tabFromHash(hash: string): DetailTab {
  if (hash === '#station-analytics') return 'analytics';
  if (hash === '#station-ports') return 'ports';
  return 'overview';
}

const STATION_STATUS_OPTIONS: { value: StationStatus; label: string }[] = [
  { value: 'working', label: 'Працює' },
  { value: 'offline', label: 'Оффлайн' },
  { value: 'maintenance', label: 'Обслуговування' },
];

export default function StationDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getStation, unarchiveStation, updateStation, archiveStation } = useStations();
  const { stationId } = useParams<{ stationId: string }>();
  const station = stationId ? getStation(stationId) : undefined;

  const [tab, setTab] = useState<DetailTab>(() =>
    typeof window !== 'undefined' ? tabFromHash(window.location.hash) : 'overview'
  );
  const [portsModalOpen, setPortsModalOpen] = useState(false);
  const [portsDraft, setPortsDraft] = useState<StationPort[]>([]);

  const hourly = useMemo(
    () =>
      station
        ? station.energyByHour.map((kwh, i) => ({
            t: `${String(i).padStart(2, '0')}:00`,
            kwh,
          }))
        : [],
    [station]
  );

  const energyDayTotal = useMemo(
    () => (station ? station.energyByHour.reduce((a, b) => a + b, 0) : 0),
    [station]
  );

  useEffect(() => {
    setTab(tabFromHash(location.hash));
  }, [station?.id, location.hash]);

  const openPortsEditor = () => {
    if (!station) return;
    setPortsDraft(station.ports.map((p) => ({ ...p })));
    setPortsModalOpen(true);
  };

  const savePorts = () => {
    if (!station) return;
    updateStation(station.id, { ports: portsDraft.map((p) => ({ ...p })) });
    setPortsModalOpen(false);
  };

  if (!station) {
    return <Navigate to="/station-dashboard/stations" replace />;
  }

  const goTab = (t: DetailTab) => {
    setTab(t);
    const pathname = `/station-dashboard/stations/${station.id}`;
    const hash =
      t === 'analytics' ? 'station-analytics' : t === 'ports' ? 'station-ports' : '';
    navigate({ pathname, hash }, { replace: true });
  };

  const handleArchive = () => {
    if (!window.confirm('Архівувати станцію? Вона зникне з карти та зі списку «Усі».')) return;
    archiveStation(station.id);
  };

  return (
    <div className="space-y-6">
      {portsModalOpen ? (
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
              Зміни зберігаються в пам&apos;яті застосунку до перезавантаження сторінки.
            </p>
            <div className="mt-4 max-h-[min(65dvh,520px)] overflow-y-auto pr-1">
              <StationPortsEditor
                ports={portsDraft}
                onChange={setPortsDraft}
                priceDefault={station.dayTariff}
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Станція в архіві — не показується на карті та у списку «Усі».</p>
          <OutlineButton
            type="button"
            className="!text-xs"
            onClick={() => unarchiveStation(station.id)}
          >
            Повернути з архіву
          </OutlineButton>
        </div>
      ) : null}

      <div>
        <Link
          to="/station-dashboard/stations"
          className="text-sm font-medium text-green-600 hover:text-green-700"
        >
          ← До списку станцій
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{station.city}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">{station.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
              <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
              </svg>
              <span className="min-w-0">{station.address}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <StatusPill tone={stationStatusTone(station.status)} size="md">
              {stationStatusLabel(station.status)}
            </StatusPill>
            <OutlineButton
              type="button"
              onClick={() => navigate(`/station-dashboard/stations/${station.id}/edit`)}
            >
              Редагувати дані
            </OutlineButton>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-0 overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
        <div className="flex min-w-[140px] flex-1 flex-col justify-center border-b border-gray-100 px-4 py-3 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Тарифи</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-gray-900">
            <span className="text-amber-700">☀ {station.dayTariff}</span>
            <span className="mx-1.5 font-normal text-gray-300">/</span>
            <span className="text-sky-700">🌙 {station.nightTariff}</span>
            <span className="ml-1 text-xs font-medium text-gray-500">грн/кВт·год</span>
          </p>
        </div>
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

      <div className="flex flex-col gap-4 border-b border-gray-200 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <nav
          className="-mx-1 flex min-w-0 gap-6 overflow-x-auto px-1"
          aria-label="Розділи станції"
        >
          <button type="button" className={tabClass(tab === 'overview')} onClick={() => goTab('overview')}>
            Загалом
          </button>
          <button type="button" className={tabClass(tab === 'analytics')} onClick={() => goTab('analytics')}>
            Аналітика
          </button>
          <button type="button" className={tabClass(tab === 'ports')} onClick={() => goTab('ports')}>
            Порти ({station.ports.length})
          </button>
        </nav>
        <div
          className="flex shrink-0 flex-col gap-2 pb-3 sm:items-end"
          aria-label="Управління станцією"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Статус</p>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex rounded-xl border border-emerald-100/90 bg-emerald-50/40 p-0.5 shadow-sm"
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
                    onClick={() => updateStation(station.id, { status: value })}
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
              <span className="max-w-[220px] text-right text-[11px] text-amber-800">
                Щоб змінити статус, спочатку поверніть станцію з архіву.
              </span>
            ) : (
              <button
                type="button"
                onClick={handleArchive}
                className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 shadow-sm transition hover:bg-red-50"
              >
                В архів
              </button>
            )}
          </div>
        </div>
      </div>

      {tab === 'overview' ? (
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
              Координати:{' '}
              <span className="font-mono text-xs text-gray-800">
                {station.lat.toFixed(5)}, {station.lng.toFixed(5)}
              </span>
            </p>
            <p className="text-xs text-gray-500">
              Аналітика та порти — у вкладках вище. Тарифи й показники за добу — у рядку під заголовком.
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
      ) : null}

      {tab === 'analytics' ? (
        <AppCard>
          <h2 className="text-sm font-semibold text-gray-900">Споживання енергії за добу</h2>
          <p className="mt-1 text-xs text-gray-500">
            кВт·год по годинах (демо). Суму за добу дивіться у рядку статистики під заголовком сторінки.
          </p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={3} />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    fontSize: 12,
                  }}
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
            <PrimaryButton type="button" className="!text-xs !py-2" onClick={openPortsEditor}>
              Змінити порти
            </PrimaryButton>
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
                  <p className="mt-1 text-xs text-gray-500">
                    {p.powerKw} кВт · {p.pricePerKwh} грн/кВт·год
                  </p>
                  {p.occupiedEta ? (
                    <p className="mt-1 text-xs font-medium text-sky-700">Орієнтовно {p.occupiedEta}</p>
                  ) : null}
                </div>
                <StatusPill tone={portStatusTone(p.status)}>{portStatusLabel(p.status)}</StatusPill>
              </div>
              {p.status === 'busy' ? (
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
