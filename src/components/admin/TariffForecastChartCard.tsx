import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { AppCard, OutlineButton } from '../station-admin/Primitives';
import { fetchForecastPredictions, type ForecastPredictionsDto } from '../../api/forecastBias';
import { userFacingApiErrorMessage } from '../../api/http';

const CHART_DAYS = 21;

function shortLabel(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return isoDate;
    return new Date(y, m - 1, d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  } catch {
    return isoDate;
  }
}

type RowPayload = { label: string; date: string; dayUah: number | null; nightUah: number | null };

function TariffForecastTooltip(props: TooltipProps<number, string>) {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as RowPayload | undefined;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg ring-1 ring-slate-900/5">
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-[11px] text-slate-500">{row.date}</p>
      <p className="mt-1.5 tabular-nums text-amber-800">
        День:{' '}
        {row.dayUah != null
          ? `${row.dayUah.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн/кВт·год`
          : '—'}
      </p>
      <p className="mt-0.5 tabular-nums text-sky-800">
        Ніч:{' '}
        {row.nightUah != null
          ? `${row.nightUah.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн/кВт·год`
          : '—'}
      </p>
    </div>
  );
}

export default function TariffForecastChartCard() {
  const [data, setData] = useState<ForecastPredictionsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    void fetchForecastPredictions(CHART_DAYS)
      .then(setData)
      .catch((e: unknown) => {
        setError(userFacingApiErrorMessage(e, 'Не вдалося завантажити прогноз'));
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const chartRows = useMemo(() => {
    if (!data?.points.length) return [];
    return data.points.map((p) => ({
      ...p,
      label: shortLabel(p.date),
      dayUah: p.dayUah,
      nightUah: p.nightUah,
    }));
  }, [data]);

  const hasAny = chartRows.some((r) => r.dayUah != null || r.nightUah != null);

  return (
    <AppCard className="space-y-4 border border-indigo-100/90 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50/30 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
       
        <OutlineButton type="button" disabled={loading} onClick={load} className="shrink-0">
          {loading ? 'Оновлення…' : 'Оновити графік'}
        </OutlineButton>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading && !data ? (
        <p className="py-12 text-center text-sm text-slate-500">Завантаження прогнозу…</p>
      ) : !hasAny ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          Прогноз тарифів відсутній
        </p>
      ) : (
        <div className="h-[min(360px,55vh)] w-full min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval="preserveStartEnd"
                angle={-35}
                textAnchor="end"
                height={56}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                domain={['auto', 'auto']}
                tickFormatter={(v) =>
                  typeof v === 'number'
                    ? v.toLocaleString('uk-UA', { maximumFractionDigits: 0 })
                    : String(v)
                }
                label={{
                  value: 'грн/кВт·год',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 11, fill: '#64748b' },
                }}
              />
              <Tooltip content={<TariffForecastTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="dayUah"
                name="Денний тариф"
                stroke="#d97706"
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="nightUah"
                name="Нічний тариф"
                stroke="#0284c7"
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </AppCard>
  );
}
