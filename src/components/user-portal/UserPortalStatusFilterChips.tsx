/**
 * Горизонтальні картки-фільтри за статусом: без вибору — показуємо всі; клік обирає статус,
 * повторний клік по обраному — знімає фільтр.
 * Підсвітка обраної картки відповідає кольору статусу (`accent`).
 */
export type UserPortalStatusChipAccent = 'amber' | 'emerald' | 'sky' | 'rose';

export type UserPortalStatusChip = {
  id: string;
  label: string;
  /** Класи для «бейджа» статусу (фон + текст) */
  badgeClass: string;
  count: number;
  /** Колір рамки / фону / ring під час вибору (узгоджено з бейджем) */
  accent: UserPortalStatusChipAccent;
};

const SELECTED_SHELL: Record<UserPortalStatusChipAccent, string> = {
  amber:
    'border-amber-500 bg-amber-50/95 shadow-md shadow-amber-900/10 ring-2 ring-amber-500/55 ring-offset-2 ring-offset-amber-50/95',
  emerald:
    'border-emerald-600 bg-emerald-50/95 shadow-md shadow-emerald-900/10 ring-2 ring-emerald-600/55 ring-offset-2 ring-offset-emerald-50/95',
  sky: 'border-sky-500 bg-sky-50/95 shadow-md shadow-sky-900/10 ring-2 ring-sky-500/55 ring-offset-2 ring-offset-sky-50/95',
  rose: 'border-rose-500 bg-rose-50/95 shadow-md shadow-rose-900/10 ring-2 ring-rose-500/55 ring-offset-2 ring-offset-rose-50/95',
};

const SELECTED_BADGE_RING: Record<UserPortalStatusChipAccent, string> = {
  amber: 'ring-2 ring-amber-500/55 ring-offset-1 ring-offset-amber-50/95',
  emerald: 'ring-2 ring-emerald-600/50 ring-offset-1 ring-offset-emerald-50/95',
  sky: 'ring-2 ring-sky-500/50 ring-offset-1 ring-offset-sky-50/95',
  rose: 'ring-2 ring-rose-500/50 ring-offset-1 ring-offset-rose-50/95',
};

const SELECTED_NUMBER: Record<UserPortalStatusChipAccent, string> = {
  amber: 'text-amber-950',
  emerald: 'text-emerald-950',
  sky: 'text-sky-950',
  rose: 'text-rose-950',
};

type Props = {
  chips: UserPortalStatusChip[];
  selectedId: string | null;
  onChange: (next: string | null) => void;
  ariaLabel: string;
  /** Напр. `grid-cols-2 sm:grid-cols-3` або `sm:grid-cols-4` */
  gridClassName?: string;
};

export default function UserPortalStatusFilterChips({
  chips,
  selectedId,
  onChange,
  ariaLabel,
  gridClassName = 'grid-cols-2 sm:grid-cols-4',
}: Props) {
  return (
    <div
      className={`grid shrink-0 gap-3 sm:gap-4 ${gridClassName}`}
      role="group"
      aria-label={ariaLabel}
    >
      {chips.map((c) => {
        const selected = selectedId === c.id;
        const a = c.accent;
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : c.id)}
            className={`rounded-2xl border px-3 py-3 text-center shadow-sm transition sm:px-4 sm:py-3.5 ${
              selected
                ? SELECTED_SHELL[a]
                : 'border-slate-200/90 bg-white ring-1 ring-slate-950/[0.04] hover:border-slate-300 hover:bg-slate-50/80'
            }`}
          >
            <span
              className={`inline-block max-w-full truncate rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:text-xs ${
                selected ? `${SELECTED_BADGE_RING[a]} ${c.badgeClass}` : c.badgeClass
              }`}
            >
              {c.label}
            </span>
            <p
              className={`mt-2 text-xl font-bold tabular-nums sm:text-2xl ${
                selected ? SELECTED_NUMBER[a] : 'text-slate-900'
              }`}
            >
              {c.count.toLocaleString('uk-UA')}
            </p>
          </button>
        );
      })}
    </div>
  );
}
