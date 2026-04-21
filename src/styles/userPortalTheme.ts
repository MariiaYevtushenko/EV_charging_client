/**
 * Єдиний візуальний стиль кабінету користувача: один акцент (green-600),
 * нейтральна палітра slate/zinc для тексту й обводок.
 * Шрифт — глобальний з index.css (--font-sans).
 */
import { appPrimaryCtaClass } from '../components/station-admin/formStyles';

export const userPortalPrimaryCta = appPrimaryCtaClass;

export const userPortalPageTitle = 'text-2xl font-semibold tracking-tight text-slate-900';
export const userPortalPageSubtitle = 'mt-1 max-w-xl text-sm leading-relaxed text-slate-600';

/** Лівий/правий падінг для всього вмісту на сторінках списків (сесії, бронювання, платежі). */
export const userPortalListPageShell = 'px-4 sm:px-6 lg:px-8';

/** Один рядок: заголовок сторінки зліва, блок «Період» справа (з sm+). */
export const userPortalPageHeaderRow =
  'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4';

/** Сегментовані вкладки (Заплановані / Історія) */
export const userPortalTabBar =
  'inline-flex items-stretch rounded-xl border border-slate-200 bg-white p-1 shadow-sm';
/** Однакова висота активної та неактивної вкладки — без «стрибка» при перемиканні */
export const userPortalTabActive =
  'inline-flex min-h-[2.75rem] items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-green-600/15 ring-1 ring-green-800/20';
export const userPortalTabIdle =
  'inline-flex min-h-[2.75rem] items-center justify-center rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50';
/** Лічильник на обраній вкладці (темний фон кнопки) */
export const userPortalTabBadgeOnAccent =
  'ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold tabular-nums';
/** Лічильник на неактивній вкладці */
export const userPortalTabBadgeIdle =
  'ml-1.5 rounded-full bg-slate-200/90 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-slate-700';

/** Поле пошуку в шапці сторінок кабінету */
export const userPortalSearchInput =
  'w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20';

/** Іконка в порожньому стані / на картці */
export const userPortalIconTileLg =
  'flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-700 ring-1 ring-green-600/10';
/** Компактніша плитка (графіки, вузькі блоки) */
export const userPortalIconTileMd =
  'flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700 ring-1 ring-green-600/10';
export const userPortalIconTileSm =
  'hidden shrink-0 sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700 ring-1 ring-green-600/10';

/** Заголовок картки бронювання при наведенні */
export const userPortalCardTitleHover = 'font-semibold text-slate-900 group-hover:text-green-800';

/** Статуси бронювання (без змішування emerald/blue/teal) */
export const userPortalBookingStatus = {
  upcoming: 'bg-slate-100 text-slate-800 ring-slate-400/25',
  active: 'bg-green-50 text-green-900 ring-green-600/20',
  completed: 'bg-zinc-100 text-zinc-800 ring-zinc-400/20',
  cancelled: 'bg-rose-50 text-rose-900 ring-rose-400/25',
  missed: 'bg-sky-50 text-sky-900 ring-sky-400/30',
} as const;
