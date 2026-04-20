import type { NetworkListPeriod } from '../../api/adminNetwork';

const OPTIONS: { id: NetworkListPeriod; label: string }[] = [
  { id: '7d', label: '7 днів' },
  { id: '30d', label: '30 днів' },
  { id: 'all', label: 'Весь час' },
];

type Props = {
  value: NetworkListPeriod;
  onChange: (period: NetworkListPeriod) => void;
};

/** Сегментований вибір періоду для списків глобальної адмінки (бронювання / сесії / платежі). */
export default function NetworkListPeriodControl({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Період</p>
      <div
        className="inline-flex max-w-full flex-wrap rounded-xl border border-slate-200 bg-slate-50/90 p-1 shadow-inner shadow-slate-900/5"
        role="group"
        aria-label="Період відображення списку"
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={value === opt.id}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 ${
              value === opt.id
                ? 'bg-white text-green-900 shadow-sm ring-1 ring-slate-200/90'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
