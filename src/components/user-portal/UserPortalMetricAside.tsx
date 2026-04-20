import type { ReactNode } from 'react';

/** Правий блок з метриками (як у списку сесій / платежів / бронювань). */
export function UserPortalMetricAside({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={`flex shrink-0 flex-col justify-center gap-3 border-t border-emerald-100/90 bg-gradient-to-br from-emerald-50/95 via-emerald-50/60 to-white px-4 py-3.5 sm:w-[min(100%,260px)] sm:border-l sm:border-t-0 sm:px-5 ${className}`}
    >
      {children}
    </aside>
  );
}

export function UserPortalMetricRow({
  label,
  value,
  valueClassName = '',
  emphasize,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  /** Виділити значення (наприклад сума). */
  emphasize?: boolean;
}) {
  return (
    <div className="flex flex-col items-end gap-0.5 text-right">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/55">{label}</span>
      <span
        className={`tabular-nums text-slate-900 ${emphasize ? 'text-base font-bold sm:text-lg' : 'text-sm font-semibold'} ${valueClassName}`}
      >
        {value}
      </span>
    </div>
  );
}
