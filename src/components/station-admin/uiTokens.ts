/** Спільні класи для узгодження UI з Primitives / лейаутами. */

/** Основна дія: як PrimaryButton (для `<Link>` та кастомних кнопок). */
export const primaryCtaClass =
  'inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98] motion-reduce:active:scale-100';

/** Компактна основна дія (таблиці, щільні панелі). */
export const primaryCtaSmClass =
  'inline-flex items-center justify-center rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98] motion-reduce:active:scale-100';

/** Активний вибір (вкладки, чіпи, слоти). */
export const primarySelectedChipClass =
  'bg-green-600 text-white shadow-sm shadow-green-600/20 ring-1 ring-green-700/20';

/** Текстове поле / textarea в стилі порталу (повний рядок класів для input). */
export const appInputClass =
  'w-full rounded-xl border border-emerald-100/90 bg-emerald-50/30 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(34,197,94,0.12)] focus:ring-0';

/** Щільніші поля (фільтри, друга колонка). */
export const appInputSmClass =
  'w-full rounded-xl border border-emerald-100/90 bg-emerald-50/30 px-3 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(34,197,94,0.12)] focus:ring-0';

/** Рамка для неактивних карток вибору (бронювання тощо). */
export const appChoiceBorderClass = 'border border-emerald-100/90 bg-white';
export const appChoiceBorderStrongClass = 'border-2 border-emerald-100/90 bg-white';

/** Неактивний чіп (дата, тривалість). */
export const inactiveChipClass =
  'border border-emerald-100/90 bg-white text-gray-700 hover:bg-emerald-50/70';

/** Підсвічена інформаційна плашка всередині картки. */
export const appPanelMutedClass = 'rounded-xl border border-emerald-100/80 bg-emerald-50/40';
