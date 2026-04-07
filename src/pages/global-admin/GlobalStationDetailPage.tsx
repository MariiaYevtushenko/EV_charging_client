import { Link, Navigate, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useStations } from '../../context/StationsContext';
import StationMiniMap from '../../components/station-admin/StationMiniMap';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import {
  portStatusLabel,
  portStatusTone,
  stationStatusLabel,
  stationStatusTone,
} from '../../utils/stationLabels';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function GlobalStationDetailPage() {
  const { getStation } = useStations();
  const { stationId } = useParams<{ stationId: string }>();
  const station = stationId ? getStation(stationId) : undefined;

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

  if (!station) {
    return <Navigate to="/admin-dashboard/stations" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin-dashboard/stations"
          className="text-sm font-medium text-green-600 hover:text-green-700"
        >
          ← До списку станцій
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{station.city}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">{station.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{station.address}</p>
            {station.archived ? (
              <p className="mt-2 text-xs font-medium text-amber-800">Станція в архіві</p>
            ) : null}
          </div>
          <StatusPill tone={stationStatusTone(station.status)} size="md">
            {stationStatusLabel(station.status)}
          </StatusPill>
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-0 overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
        <div className="flex min-w-[100px] flex-1 flex-col justify-center border-b border-gray-100 px-4 py-3 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Дохід сьогодні</p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-green-700">
            {station.todayRevenue.toLocaleString('uk-UA')} грн
          </p>
        </div>
        <div className="flex min-w-[88px] flex-1 flex-col justify-center border-b border-gray-100 px-4 py-3 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Сесії</p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-gray-900">{station.todaySessions}</p>
        </div>
        <div className="flex min-w-[120px] flex-[1.15] flex-col justify-center px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Енергія за добу</p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-gray-900">
            {energyDayTotal.toLocaleString('uk-UA')} кВт·год
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <AppCard className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Споживання за добу</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={5} />
                <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" />
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

      <AppCard className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Порти</h2>
        <div className="space-y-3">
          {station.ports.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/90 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {p.label} · {p.connector}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {p.powerKw} кВт
                  {p.occupiedEta ? ` · ${p.occupiedEta}` : ''}
                </p>
              </div>
              <StatusPill tone={portStatusTone(p.status)}>{portStatusLabel(p.status)}</StatusPill>
            </div>
          ))}
        </div>
      </AppCard>
    </div>
  );
}
