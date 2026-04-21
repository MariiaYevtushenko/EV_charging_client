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
import { eurToUah } from '../../utils/tariffCurrency';

export default function UserStationDetailPage() {
  const { getStation } = useStations();
  const { stationId } = useParams<{ stationId: string }>();
  const station = stationId ? getStation(stationId) : undefined;

  const energyDayTotal = useMemo(
    () => (station ? station.energyByHour.reduce((a, b) => a + b, 0) : 0),
    [station]
  );

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
          <p className="text-[10px] font-semibold uppercase text-gray-400">Денний тариф</p>
          <p className="text-lg font-bold text-amber-700">
            {eurToUah(station.dayTariff).toLocaleString('uk-UA', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            грн/кВт·год
          </p>
        </div>
        <div className="min-w-[120px] flex-1">
          <p className="text-[10px] font-semibold uppercase text-gray-400">Нічний</p>
          <p className="text-lg font-bold text-sky-700">
            {eurToUah(station.nightTariff).toLocaleString('uk-UA', {
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

     
    </div>
  );
}
