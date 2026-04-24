import { Link, Navigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStations } from '../../context/StationsContext';
import { useTodayGridTariffsFromDb } from '../../hooks/useTodayGridTariffsFromDb';
import { fetchStationEnergyAnalytics } from '../../api/stations';
import type { StationEnergyAnalyticsDto, StationEnergyPeriod } from '../../types/stationApi';
import { formatStationEnergyChartAxisLabel } from '../../utils/stationEnergyChartLabels';
import StationMiniMap from '../../components/station-admin/StationMiniMap';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import {
  portStatusLabel,
  portStatusTone,
  stationStatusLabel,
  stationStatusTone,
} from '../../utils/stationLabels';
import { eurToUah } from '../../utils/tariffCurrency';

export default function UserStationDetailPage() {
  const { getStation } = useStations();
  const { stationId } = useParams<{ stationId: string }>();
  const station = stationId ? getStation(stationId) : undefined;
  const { data: todayTariffs, loading: todayTariffsLoading } = useTodayGridTariffsFromDb();

  const [analyticsPeriod, setAnalyticsPeriod] = useState<StationEnergyPeriod>('7d');
  const [analytics, setAnalytics] = useState<StationEnergyAnalyticsDto | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const energyDayTotal = useMemo(
    () => (station ? station.energyByHour.reduce((a, b) => a + b, 0) : 0),
    [station]
  );

  const chartRows = useMemo(() => {
    if (!analytics?.points.length) return [];
    return analytics.points.map((p) => ({
      t: formatStationEnergyChartAxisLabel(p.bucketStart, analytics.period),
      kwh: p.kwh,
      sessions: p.sessions,
      revenueUah: p.revenueUah,
      fullLabel: new Date(p.bucketStart).toLocaleString('uk-UA'),
    }));
  }, [analytics]);

  useEffect(() => {
    if (!station) return;
    const sid = Number(station.id);
    if (!Number.isFinite(sid)) return;
    let cancelled = false;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    fetchStationEnergyAnalytics(sid, analyticsPeriod)
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) {
          setAnalytics(null);
          setAnalyticsError('Не вдалося завантажити аналітику');
        }
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [station, analyticsPeriod]);

  if (!station || station.archived) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="text-sm font-medium text-green-600 hover:text-green-700">
        ← До карти
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{station.city}</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">{station.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{station.address}</p>
        </div>
        <StatusPill tone={stationStatusTone(station.status)} size="md">
          {stationStatusLabel(station.status)}
        </StatusPill>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm">
        <div className="min-w-[120px] flex-1">
          <p className="text-[10px] font-semibold uppercase text-gray-400">Денний тариф (БД, сьогодні)</p>
          <p className="text-lg font-bold text-amber-700">
            {todayTariffsLoading
              ? '…'
              : (todayTariffs?.dayPriceUah ?? 0).toLocaleString('uk-UA', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
            грн/кВт·год
          </p>
        </div>
        <div className="min-w-[120px] flex-1">
          <p className="text-[10px] font-semibold uppercase text-gray-400">Нічний (БД, сьогодні)</p>
          <p className="text-lg font-bold text-sky-700">
            {todayTariffsLoading
              ? '…'
              : (todayTariffs?.nightPriceUah ?? 0).toLocaleString('uk-UA', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
            грн/кВт·год
          </p>
        </div>
        <div className="min-w-[100px] flex-1">
          <p className="text-[10px] font-semibold uppercase text-gray-400">Енергія за добу</p>
          <p className="text-lg font-bold text-gray-900">{energyDayTotal.toLocaleString('uk-UA')} кВт·год</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AppCard className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Порти</h2>
          {station.ports.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/90 p-3"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {p.label} · {p.connector}
                </p>
                <p className="text-xs text-gray-500">
                  {p.powerKw} кВт ·{' '}
                  {eurToUah(p.pricePerKwh).toLocaleString('uk-UA', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  грн/кВт·год
                </p>
              </div>
              <StatusPill tone={portStatusTone(p.status)}>{portStatusLabel(p.status)}</StatusPill>
            </div>
          ))}
        </AppCard>
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Розташування</h2>
          <StationMiniMap
            lat={station.lat}
            lng={station.lng}
            status={station.status}
            label={station.name}
          />
        </div>
      </div>

      <AppCard className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Аналітика станції</h2>
           
            {analyticsLoading ? (
              <p className="mt-2 text-xs text-gray-400">Завантаження…</p>
            ) : analyticsError ? (
              <p className="mt-2 text-xs text-red-600">{analyticsError}</p>
            ) : analytics ? (
              <p className="mt-2 text-xs text-gray-600">
                Усього:{' '}
                <span className="font-semibold text-gray-900">
                  {analytics.totalKwh.toLocaleString('uk-UA')} кВт·год
                </span>
                <span className="text-gray-500">
                  {' '}
                  · сесій: {analytics.sessionCount}
                  {' '}
                  · рахунки:{' '}
                  <span className="font-semibold text-gray-800">
                    {analytics.totalRevenueUah.toLocaleString('uk-UA', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    грн
                  </span>
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
                { id: '1d' as const, label: 'Сьогодні' },
                { id: '7d' as const, label: '7 днів' },
                { id: '30d' as const, label: '30 днів' },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setAnalyticsPeriod(id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  analyticsPeriod === id
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {analyticsLoading ? (
          <p className="text-sm text-gray-500">Формування діаграм…</p>
        ) : analyticsError ? null : chartRows.length === 0 ? (
          <p className="text-sm text-gray-500">Немає сесій за цей період — графіки з’являться після зарядок</p>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Енергія (кВт·год)
              </h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartRows}
                    margin={{
                      top: 8,
                      right: 8,
                      left: -8,
                      bottom: analytics?.period === '30d' ? 32 : 6,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="t"
                      tick={{ fontSize: 9 }}
                      stroke="#9ca3af"
                      interval={analytics?.period === '1d' ? 3 : analytics?.period === '30d' ? 2 : 0}
                      angle={analytics?.period === '30d' ? -30 : 0}
                      textAnchor={analytics?.period === '30d' ? 'end' : 'middle'}
                      height={analytics?.period === '30d' ? 48 : undefined}
                    />
                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      formatter={(v) => [
                        `${Number(v ?? 0).toLocaleString('uk-UA')} кВт·год`,
                        'Енергія',
                      ]}
                      labelFormatter={(_l, p) => String(p?.[0]?.payload?.fullLabel ?? '')}
                    />
                    <Bar dataKey="kwh" fill="#22c55e" radius={[6, 6, 0, 0]} name="кВт·год" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Кількість сесій
              </h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartRows}
                    margin={{
                      top: 8,
                      right: 8,
                      left: -8,
                      bottom: analytics?.period === '30d' ? 32 : 6,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="t"
                      tick={{ fontSize: 9 }}
                      stroke="#9ca3af"
                      interval={analytics?.period === '1d' ? 3 : analytics?.period === '30d' ? 2 : 0}
                      angle={analytics?.period === '30d' ? -30 : 0}
                      textAnchor={analytics?.period === '30d' ? 'end' : 'middle'}
                      height={analytics?.period === '30d' ? 48 : undefined}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      formatter={(v) => [String(Math.round(Number(v ?? 0))), 'Сесій']}
                      labelFormatter={(_l, p) => String(p?.[0]?.payload?.fullLabel ?? '')}
                    />
                    <Bar dataKey="sessions" fill="#6366f1" radius={[6, 6, 0, 0]} name="Сесії" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Сума рахунків (грн)
              </h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartRows}
                    margin={{
                      top: 8,
                      right: 8,
                      left: -8,
                      bottom: analytics?.period === '30d' ? 32 : 6,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="t"
                      tick={{ fontSize: 9 }}
                      stroke="#9ca3af"
                      interval={analytics?.period === '1d' ? 3 : analytics?.period === '30d' ? 2 : 0}
                      angle={analytics?.period === '30d' ? -30 : 0}
                      textAnchor={analytics?.period === '30d' ? 'end' : 'middle'}
                      height={analytics?.period === '30d' ? 48 : undefined}
                    />
                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      formatter={(v) => [
                        `${Number(v ?? 0).toLocaleString('uk-UA', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} грн`,
                        'Рахунки',
                      ]}
                      labelFormatter={(_l, p) => String(p?.[0]?.payload?.fullLabel ?? '')}
                    />
                    <Bar dataKey="revenueUah" fill="#f59e0b" radius={[6, 6, 0, 0]} name="грн" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </AppCard>
    </div>
  );
}
