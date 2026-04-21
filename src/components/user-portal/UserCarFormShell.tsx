import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AppCard } from '../station-admin/Primitives';
import { DEFAULT_CAR_IMAGE } from '../../utils/carImageSuggest';

export function UserCarImagePreview({
  src,
  alt = 'Попередній перегляд авто',
  variant = 'banner',
  className = '',
}: {
  src: string;
  alt?: string;
  /** `banner` — горизонтальне прев’ю з фіксованим співвідношенням сторін; `side` — заливка колонки (форма справа від фото). */
  variant?: 'banner' | 'side';
  className?: string;
}) {
  if (variant === 'side') {
    return (
      <div
        className={`relative h-full min-h-[200px] w-full overflow-hidden bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-100 md:min-h-0${className ? ` ${className}` : ''}`}
      >
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
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-100${className ? ` ${className}` : ''}`}
    >
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

/** Оболонка форми авто в стилі «Профіль»: заголовок як у редагування користувача, зліва — фото. */
export function UserCarFormShell({
  title,
  description,
  previewSrc,
  children,
  rightColumnHeader,
  rightColumnJustify = 'center',
  compact = false,
}: {
  title: string;
  description?: string;
  previewSrc: string;
  children: ReactNode;
  /** Блок над полями (наприклад модель і номер на сторінці редагування). */
  rightColumnHeader?: ReactNode;
  /** Для довгого контенту (деталі авто) — вирівнювання зверху. */
  rightColumnJustify?: 'center' | 'start';
  /** Менші відступи й прев’ю без штучної висоти — для коротких сторін (деталі авто). */
  compact?: boolean;
}) {
  return (
    <div className={`mx-auto w-full min-w-0 max-w-5xl ${compact ? 'space-y-4' : 'space-y-6'} pb-2`}>
      <Link
        to="/dashboard/cars"
        className="inline-flex text-sm font-semibold text-emerald-700 transition hover:text-emerald-900 hover:underline"
      >
        ← До моїх авто
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>

      <AppCard padding={false} className="flex flex-col overflow-hidden md:flex-row md:items-stretch">
        <div className="relative w-full shrink-0 border-b border-gray-100 bg-gray-50/80 md:w-[min(40%,22rem)] md:max-w-sm md:min-h-0 md:border-b-0 md:border-r md:self-stretch">
          <UserCarImagePreview src={previewSrc} variant="side" />
        </div>
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col ${compact ? 'p-4 sm:p-5' : 'p-6 sm:p-8'} ${
            rightColumnJustify === 'start' ? 'justify-start' : 'justify-center'
          }`}
        >
          {rightColumnHeader ? (
            <div
              className={`border-b border-gray-100 ${compact ? 'mb-4 pb-4' : 'mb-6 pb-6'}`}
            >
              {rightColumnHeader}
            </div>
          ) : null}
          <div className="mx-auto w-full max-w-xl">{children}</div>
        </div>
      </AppCard>
    </div>
  );
}
