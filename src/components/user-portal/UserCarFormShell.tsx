import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AppCard } from '../station-admin/Primitives';
import { DEFAULT_CAR_IMAGE } from '../../utils/carImageSuggest';
import { userPortalPageSubtitle, userPortalPageTitle } from '../../styles/userPortalTheme';

export function UserCarImagePreview({
  src,
  alt = 'Попередній перегляд авто',
  variant = 'banner',
}: {
  src: string;
  alt?: string;
  /** `banner` — горизонтальне прев’ю з фіксованим співвідношенням сторін; `side` — заливка колонки (форма зліва/справа від фото). */
  variant?: 'banner' | 'side';
}) {
  if (variant === 'side') {
    return (
      <div className="relative min-h-[220px] w-full overflow-hidden bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-100 md:min-h-[min(420px,65vh)]">
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(ev) => {
            (ev.target as HTMLImageElement).src = DEFAULT_CAR_IMAGE;
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900/35 to-transparent"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-100">
      <div className="aspect-[16/9] w-full sm:aspect-[2/1]">
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={(ev) => {
            (ev.target as HTMLImageElement).src = DEFAULT_CAR_IMAGE;
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900/30 to-transparent"
        aria-hidden
      />
    </div>
  );
}

export function UserCarFormShell({
  title,
  description,
  previewSrc,
  children,
}: {
  title: string;
  description: string;
  previewSrc: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-8">
      <Link
        to="/dashboard/cars"
        className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 transition hover:text-emerald-900 hover:underline"
      >
        ← До моїх авто
      </Link>

      <section className="relative overflow-hidden rounded-2xl border border-emerald-100/90 bg-gradient-to-br from-emerald-50/80 via-white to-slate-50/50 p-5 shadow-sm ring-1 ring-emerald-950/[0.04] sm:p-6">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-200/20 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <h1 className={userPortalPageTitle}>{title}</h1>
          <p className={userPortalPageSubtitle}>{description}</p>
        </div>
      </section>

      <AppCard className="flex flex-col overflow-hidden p-0 shadow-md shadow-slate-900/[0.05] ring-emerald-950/[0.04] md:flex-row md:items-stretch">
        <div className="relative w-full shrink-0 md:w-[min(42%,28rem)] md:max-w-md lg:w-[38%] lg:max-w-lg">
          <UserCarImagePreview src={previewSrc} variant="side" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center space-y-6 p-6 sm:p-8">{children}</div>
      </AppCard>
    </div>
  );
}
