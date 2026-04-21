import type { NetworkListPeriod } from '../../api/adminNetwork';

const OPTIONS: { id: NetworkListPeriod; label: string }[] = [
  { id: '7d', label: '7 днів' },
  { id: '30d', label: '30 днів' },
  { id: 'all', label: 'Весь час' },
];

type Props = {
  value: NetworkListPeriod;
  onChange: (period: NetworkListPeriod) => void;
  /** Якщо true — період видно, але перемикання недоступне (напр. доки не обрано «минулі» записи). */
  disabled?: boolean;
};

/** Сегментований вибір періоду для списків глобальної адмінки (бронювання / сесії / платежі). */
export default function NetworkListPeriodControl({ value, onChange, disabled = false }: Props) {
  return (
    <div
      className={`flex flex-row flex-wrap items-center gap-2 sm:gap-3 ${disabled ? 'select-none' : ''}`}
      title={disabled ? 'Оберіть вкладку «У минулому», щоб фільтрувати за періодом' : undefined}
    >
      <p
        className={`shrink-0 text-xs font-semibold uppercase tracking-wide ${
          disabled ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        Період
      </p>
      <div
        className={`inline-flex max-w-full flex-wrap rounded-xl border bg-slate-50/90 p-1 shadow-inner shadow-slate-900/5 ${
          disabled ? 'border-slate-200/80 opacity-[0.72]' : 'border-slate-200'
        }`}
        role="group"
        aria-label="Період відображення списку"
        aria-disabled={disabled}
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            aria-pressed={value === opt.id}
            aria-disabled={disabled}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
              value === opt.id
                ? 'bg-white text-green-900 shadow-sm ring-1 ring-green-600/30'
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
