import type { ReactNode } from 'react';

/** Іконка блискавки в білому колі (як у референсі карток адміна). */
export function AdminLightningIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

const shellBase =
  'overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-950/[0.04]';

/**
 * Горизонтальна картка адміна: пастельна смуга зліва, біле коло з іконкою, контент справа.
 * Для адміна станцій і глобального адміна.
 */
export function AdminAccentCard({
  children,
  className = '',
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`${shellBase} h-full ${hover ? 'transition hover:shadow-md' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function AdminAccentRow({
  icon,
  children,
  stripClassName = '',
  className = '',
}: {
  /** Якщо не передано — блискавка */
  icon?: ReactNode;
  children: ReactNode;
  stripClassName?: string;
  className?: string;
}) {
  return (
    <div className={`flex h-full min-h-[80px] ${className}`.trim()}>
      <div
        className={`flex w-[18%] min-w-[72px] max-w-[100px] shrink-0 items-center justify-center self-stretch bg-emerald-50/95 py-3 sm:py-4 ${stripClassName}`.trim()}
        aria-hidden
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-200/90 sm:h-12 sm:w-12">
          {icon ?? <AdminLightningIcon />}
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center px-4 py-3.5 sm:px-5">
        {children}
      </div>
    </div>
  );
}

/** Нижній рядок-статус темно-зеленим, як у референсі («Завершено»). */
export function AdminAccentStatus({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm font-semibold text-emerald-800">{children}</p>;
}

const stripOuter =
  'flex w-[72px] max-w-[100px] shrink-0 items-center justify-center self-stretch bg-emerald-50/95 py-4 sm:w-[18%] sm:min-w-[72px] sm:max-w-[100px]';

/** Блок зведення на головній: смуга зліва + довільний контент (сітка метрик). */
export function AdminAccentSummaryShell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <AdminAccentCard className={`overflow-hidden !shadow-sm ${className}`.trim()}>
      <div className="flex min-h-0 h-full">
        <div className={stripOuter} aria-hidden>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-200/90 sm:h-12 sm:w-12">
            <AdminLightningIcon />
          </div>
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AdminAccentCard>
  );
}
