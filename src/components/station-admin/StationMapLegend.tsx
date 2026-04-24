/**
 * Пояснення кольорів маркерів на карті (узгоджено зі StationMap STATUS_UI).
 */

const INLINE_ITEMS: { dotClass: string; label: string }[] = [
  { dotClass: 'bg-[#16a34a]', label: 'Працює' },
  { dotClass: 'bg-[#f59e0b]', label: 'Ремонт' },
  { dotClass: 'bg-[#94a3b8]', label: 'Оффлайн' },
];

const ITEMS: { fill: string; stroke: string; title: string; hint: string }[] = [
  {
    fill: '#16a34a',
    stroke: '#14532d',
    title: 'Працює',
    hint: 'станція доступна для бронювання та зарядки',
  },
  {
    fill: '#f59e0b',
    stroke: '#b45309',
    title: 'Сервіс',
    hint: 'обслуговування / ремонт — бронь і зарядка недоступні',
  },
  {
    fill: '#9ca3af',
    stroke: '#4b5563',
    title: 'Офлайн',
    hint: 'немає звʼязку або станція вимкнена',
  },
  {
    fill: '#9ca3af',
    stroke: '#374151',
    title: 'Архів',
    hint: 'на карті бронювання не показується',
  },
];

export default function StationMapLegend({
  className = '',
  showSelectionNote = true,
  variant = 'default',
}: {
  className?: string;
  showSelectionNote?: boolean;
  /** `inline` — один рядок «Легенда:» і кольорові крапки (як у кабінеті користувача). */
  variant?: 'default' | 'inline';
}) {
  if (variant === 'inline') {
    return (
      <div
        className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-slate-200/90 bg-slate-50/90 px-3 py-2 text-sm text-slate-700 shadow-sm ${className}`}
        role="note"
        aria-label="Легенда кольорів станцій на карті"
      >
        <span className="font-medium text-slate-600">Легенда:</span>
        {INLINE_ITEMS.map((it) => (
          <span key={it.label} className="inline-flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/5 ${it.dotClass}`}
              aria-hidden
            />
            <span>{it.label}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Умовні позначення</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-gray-700">
        {ITEMS.map((it) => (
          <li key={it.title} className="flex min-w-0 max-w-[200px] items-start gap-2">
            <span className="mt-0.5 shrink-0" aria-hidden>
              <svg width="14" height="18" viewBox="0 0 24 32">
                <path
                  d="M12 32C12 32 23 18.5 23 12C23 5.9 18.1 1 12 1S1 5.9 1 12C1 18.5 12 32 12 32Z"
                  fill={it.fill}
                  stroke={it.stroke}
                  strokeWidth="1.75"
                />
                <circle cx="12" cy="11.5" r="3" fill="#fff" />
              </svg>
            </span>
            <span>
              <span className="font-semibold text-gray-900">{it.title}</span>
              <span className="text-gray-500"> — {it.hint}</span>
            </span>
          </li>
        ))}
      </ul>
      {showSelectionNote ? (
        <p className="text-[11px] text-gray-500">
          <span className="font-medium text-emerald-800">Обрана станція</span> — яскравіша зелена обводка навколо
          маркера
        </p>
      ) : null}
    </div>
  );
}
