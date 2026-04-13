/**
 * Спільні класи форм і CTA (узгоджено з Primitives, ui/Input та лейаутами).
 */

const INPUT_FOCUS =
  'outline-none transition placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(34,197,94,0.12)] focus:ring-0';

/** Поле на всю ширину (стандартна висота) — як `ui/Input` */
export const appInputClass =
  `w-full rounded-xl border border-emerald-100/90 bg-emerald-50/30 px-4 py-2.5 text-sm ${INPUT_FOCUS}`;

/** Під лейблом (вище поле) */
export const appFormInputClass =
  `mt-1 w-full rounded-xl border border-emerald-100/90 bg-emerald-50/30 px-4 py-3 text-sm ${INPUT_FOCUS}`;

/** Додати до `appFormInputClass`, якщо поле з помилкою валідації */
export const appFormInputErrorModifier =
  'border-red-300 bg-red-50/50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]';

/** Компактне поле (фільтри, другорядні форми) */
export const appInputCompactClass =
  `w-full rounded-xl border border-emerald-100/90 bg-emerald-50/30 px-3 py-2 text-sm ${INPUT_FOCUS}`;

export const appSelectClass =
  'w-full cursor-pointer appearance-none rounded-xl border-2 border-emerald-100/90 bg-emerald-50/25 py-3 pl-4 pr-11 text-sm font-medium text-gray-800 shadow-sm shadow-emerald-900/5 transition ' +
  'hover:border-emerald-300 hover:bg-white ' +
  'focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/15 ' +
  'bg-[length:1.125rem] bg-[position:right_0.875rem_center] bg-no-repeat ' +
  `bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234b5563'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")]`;

/** Вужчий select у панелі фільтрів / бронювання */
export const appSelectFilterClass =
  'w-full cursor-pointer appearance-none rounded-xl border-2 border-emerald-100/90 bg-emerald-50/25 py-2 pl-3 pr-10 text-sm font-medium text-gray-800 shadow-sm shadow-emerald-900/5 transition ' +
  'hover:border-emerald-300 hover:bg-white ' +
  'focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/15 ' +
  'bg-[length:1.125rem] bg-[position:right_0.75rem_center] bg-no-repeat ' +
  `bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234b5563'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")]`;

/** Основний CTA як посилання (`<Link>`) */
export const appPrimaryCtaClass =
  'inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98] motion-reduce:active:scale-100';

/** Компактніший CTA (тулбар, вузькі панелі) */
export const appPrimaryCtaMdClass =
  'inline-flex items-center justify-center rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98] motion-reduce:active:scale-100';

export const appPrimaryCtaSmClass =
  'inline-flex items-center justify-center rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98] motion-reduce:active:scale-100';

/** Другорядний CTA / скасування як посилання */
export const appSecondaryCtaClass =
  'inline-flex items-center justify-center rounded-xl border border-emerald-200/90 bg-white/90 px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm shadow-emerald-900/5 transition hover:border-emerald-300 hover:bg-emerald-50/80 active:scale-[0.99] motion-reduce:active:scale-100';

export const appSecondaryCtaSmClass =
  'inline-flex items-center justify-center rounded-xl border border-emerald-200/90 bg-white/90 px-3 py-2 text-xs font-semibold text-gray-800 shadow-sm shadow-emerald-900/5 transition hover:border-emerald-300 hover:bg-emerald-50/80';

/** Обраний чіп (дата, тривалість, слот) */
export const appChipSelectedClass =
  'bg-green-600 text-white shadow-sm shadow-green-600/20 ring-1 ring-green-700/20';

export const appChipIdleClass =
  'border border-emerald-100/90 bg-white text-gray-700 shadow-sm hover:bg-emerald-50/80 hover:border-emerald-200';

export const appChipSlotAvailableClass =
  'bg-white text-gray-800 shadow-sm ring-1 ring-emerald-100/90 hover:ring-green-400/60';

/** Неактивна вкладка списку (станції тощо) */
export const appTabIdleClass =
  'bg-emerald-50/40 text-gray-600 hover:bg-emerald-50/90 hover:text-gray-900';
