import { useMemo, useState } from 'react';
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
import { AppCard } from '../station-admin/Primitives';

export type TariffHistoryChartRow = {
  effectiveDate: string;
  dayPrice: number | null;
  nightPrice: number | null;
};

type HistoryRangeDays = 7 | 30 | 365;

const RANGE_OPTIONS: { value: HistoryRangeDays; label: string }[] = [
  { value: 7, label: '7 днів' },
  { value: 30, label: '30 днів' },
  { value: 365, label: 'Рік' },
];

function localTodayKey(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function addCalendarDaysToKey(key: string, deltaDays: number): string {
  const parts = key.split('-').map((x) => Number.parseInt(x, 10));
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (y === undefined || mo === undefined || d === undefined) return key;
  const dt = new Date(y, mo - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function shortLabel(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return isoDate;
    return new Date(y, m - 1, d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  } catch {
    return isoDate;
  }
}

type RowPayload = {
  label: string;
  effectiveDate: string;
  dayPrice: number | null;
  nightPrice: number | null;
};

function TariffHistoryTooltip(props: TooltipProps<number, string>) {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as RowPayload | undefined;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg ring-1 ring-slate-900/5">
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-[11px] text-slate-500">{row.effectiveDate}</p>
      <p className="mt-1.5 tabular-nums text-amber-800">
        День:{' '}
        {row.dayPrice != null
          ? `${row.dayPrice.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн/кВт·год`
          : '—'}
      </p>
      <p className="mt-0.5 tabular-nums text-sky-800">
        Ніч:{' '}
        {row.nightPrice != null
          ? `${row.nightPrice.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн/кВт·год`
          : '—'}
      </p>
    </div>
  );
}

type TariffHistoryChartCardProps = {
  /** Дати по зростанню (YYYY-MM-DD). */
  seriesAsc: TariffHistoryChartRow[];
  loading: boolean;
};

export default function TariffHistoryChartCard({ seriesAsc, loading }: TariffHistoryChartCardProps) {
  const [rangeDays, setRangeDays] = useState<HistoryRangeDays>(30);

  const chartRows = useMemo(() => {
    const today = localTodayKey();
    const start = addCalendarDaysToKey(today, -(rangeDays - 1));
    const slice = seriesAsc.filter((r) => r.effectiveDate >= start && r.effectiveDate <= today);
    return slice.map((r) => ({
      ...r,
      label: shortLabel(r.effectiveDate),
    }));
  }, [seriesAsc, rangeDays]);

  const hasAny = chartRows.some((r) => r.dayPrice != null || r.nightPrice != null);

  return (
    <AppCard className="space-y-4 border border-emerald-100/90 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50/30 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Графік цін</h2>
       
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Період графіка">
          {RANGE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRangeDays(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                rangeDays === value
                  ? 'bg-green-600 text-white shadow-sm shadow-green-600/20'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && seriesAsc.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Завантаження тарифів…</p>
      ) : !hasAny ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          Немає даних за цей період. Після сиду або оновлення тарифів графік з’явиться автоматично
        </p>
      ) : (
        <div className="h-[min(320px,45vh)] w-full min-h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval={rangeDays >= 90 ? 'preserveStartEnd' : 0}
                angle={rangeDays > 30 ? -40 : -25}
                textAnchor="end"
                height={rangeDays > 30 ? 52 : 44}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                domain={['auto', 'auto']}
                width={44}
                tickFormatter={(v) =>
                  typeof v === 'number' ? v.toLocaleString('uk-UA', { maximumFractionDigits: 0 }) : String(v)
                }
                label={{
                  value: 'грн/кВт·год',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 11, fill: '#64748b' },
                }}
              />
              <Tooltip content={<TariffHistoryTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="dayPrice"
                name="День"
                stroke="#d97706"
                strokeWidth={2}
                dot={{ r: rangeDays <= 30 ? 2 : 0 }}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="nightPrice"
                name="Ніч"
                stroke="#0284c7"
                strokeWidth={2}
                dot={{ r: rangeDays <= 30 ? 2 : 0 }}
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
