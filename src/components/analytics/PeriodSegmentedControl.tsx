export type PeriodSegmentOption = { value: string; label: string };


export function PeriodSegmentedControl({
  value,
  onChange,
  options,
  disabled,
  className = '',
  showLabel = true,
  ariaLabel = 'Період аналізу',
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly PeriodSegmentOption[];
  disabled?: boolean;
  className?: string;
  showLabel?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 sm:gap-4 ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      {showLabel ? (
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 sm:text-xs">
          Період
        </span>
      ) : null}
      <div
        className="inline-flex max-w-full items-stretch rounded-xl border border-slate-200 bg-white p-1 shadow-sm shadow-slate-900/5"
        role="tablist"
      >
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={disabled}
              className={
                selected
                  ? 'min-h-[2.5rem] shrink-0 whitespace-nowrap rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-green-700/20 transition sm:min-h-[2.625rem] sm:px-3.5'
                  : 'min-h-[2.5rem] shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:min-h-[2.625rem] sm:px-3.5'
              }
              onClick={() => onChange(o.value)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
