/**
 * Адмін-панель станцій — ті самі принципи, що й userPortalTheme:
 * один акцент (green-600), текст і обводки slate, без emerald/teal міксу.
 */
import {
  userPortalPageSubtitle,
  userPortalPageTitle,
  userPortalSearchInput,
} from './userPortalTheme';

export const stationAdminPageTitle = userPortalPageTitle;
export const stationAdminPageSubtitle = userPortalPageSubtitle;

/** Форми «Нова станція» / «Редагування станції» — компактніший верх (див. негативний margin до padding у layout). */
export const stationFormPageShell =
  'mx-auto max-w-7xl -mt-3 space-y-3 pb-8 sm:-mt-5 lg:pb-10';
/** Заголовок h1 у формі станції (нижче за звичайні сторінки, щоб швидше потрапити до полів). */
export const stationFormPageTitle = 'text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl';
/** Рядок: назад + заголовок на одній лінії від sm+. */
export const stationFormPageHeaderRow =
  'flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-0';
export const stationFormBackLink =
  'text-sm font-medium text-green-600 transition hover:text-green-700';
/** Лише іконка стрілки «назад». */
export const stationFormBackIconLink =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-green-600 transition hover:bg-green-50 hover:text-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40';

/** Двоколонкова форма: на lg карта зліва лишається на місці, форма справа скролиться. */
export const stationFormSplitGrid =
  'grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-start';
/** Обгортка картки з картою — sticky у межах головного скролу. */
export const stationFormMapStickyClass = 'lg:sticky lg:top-4 lg:z-[1] lg:self-start';
/** Картка з полями — внутрішній скрол на великому екрані. */
export const stationFormDataScrollClass =
  'lg:max-h-[calc(100vh-9rem)] lg:min-h-0 lg:overflow-y-auto lg:overscroll-y-contain lg:pr-1';
/** Заголовок картки (напр. «Розташування») */
export const stationFormCardTitle = 'text-base font-semibold tracking-tight text-gray-900';
/** Лейбл поля форми */
export const stationFormLabel = 'mb-0 block text-sm font-medium text-gray-700';
/** Рядок під заголовком картки (стан завантаження) */
export const stationFormCardSubline = 'mt-1 text-sm leading-snug text-gray-500';
/** Другорядний текст підказок у формі */
export const stationFormHelpText = 'mt-2 text-sm leading-relaxed text-gray-500';
/** Поле пошуку в контенті сторінок (таблиці тощо) */
export const stationAdminSearchInput = userPortalSearchInput;

/** Посилання-акцент у картках / зведеннях */
export const stationAdminLinkAccent = 'text-sm font-semibold text-green-700 transition hover:text-green-800';

/** Підзаголовок секції (uppercase label) */
export const stationAdminSectionLabel =
  'mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500';

/** Іконка в картці швидкого доступу */
export const stationAdminKpiIconTile =
  'flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-800 ring-1 ring-green-200/80';

/** Навігація сайдбара */
const navBase =
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200';
export const stationAdminNavLinkActive = `${navBase} bg-green-600 text-white shadow-md shadow-green-600/25`;
export const stationAdminNavLinkIdle = `${navBase} text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm`;

export const stationAdminSidebar =
  'flex h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white px-4 py-6 shadow-sm';
export const stationAdminSidebarFooterBorder = 'mt-auto flex flex-col gap-3 border-t border-slate-200 pt-4';
export const stationAdminLogoutButton =
  'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900';

export const stationAdminHeaderBar =
  'z-10 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 shadow-sm backdrop-blur-md sm:px-6';

/** Пошук у шапці (округліший за userPortal) */
export const stationAdminHeaderSearchInput =
  'w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(34,197,94,0.12)] focus:ring-0';

export const stationAdminMobileMenuButton =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500';

/** Банер завантаження (аналітика) */
export const stationAdminLoadingBanner =
  'flex items-center gap-3 rounded-2xl border border-slate-200 bg-green-50/50 px-5 py-4 text-sm text-green-950';
export const stationAdminLoadingSpinner =
  'inline-block h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent';

/** Вкладки з нижньою межею (аналітика) */
export const stationAdminUnderlineTabActive =
  'relative shrink-0 border-b-2 border-green-600 px-1 pb-3 text-sm font-semibold text-green-800 transition';
export const stationAdminUnderlineTabIdle =
  'relative shrink-0 border-b-2 border-transparent px-1 pb-3 text-sm font-semibold text-slate-500 transition hover:border-slate-200 hover:text-slate-800';

/** Великий промо-блок (головна → карта) */
export const stationAdminMapPromo =
  'group relative block overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-green-600 to-green-800 p-6 text-white shadow-lg shadow-slate-900/15 ring-1 ring-white/10 transition hover:shadow-xl sm:p-8';
