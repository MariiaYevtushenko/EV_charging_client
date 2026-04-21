import { Link, type LinkProps } from 'react-router-dom';
import type { ReactNode } from 'react';

const ACCENT = {
  amber: { strip: 'bg-amber-50', iconWrap: 'ring-amber-100/80', icon: 'text-amber-600' },
  green: { strip: 'bg-green-50', iconWrap: 'ring-green-200/90', icon: 'text-green-700' },
  sky: { strip: 'bg-sky-50', iconWrap: 'ring-sky-100/80', icon: 'text-sky-600' },
  slate: { strip: 'bg-slate-100', iconWrap: 'ring-slate-200/90', icon: 'text-slate-600' },
  rose: { strip: 'bg-rose-50', iconWrap: 'ring-rose-100/80', icon: 'text-rose-600' },
} as const;

export type UserPortalRowAccent = keyof typeof ACCENT;

type Props = {
  to: string;
  accent: UserPortalRowAccent;
  icon: ReactNode;
  title: string;
  /** Другий рядок (сірий), напр. слот або порт */
  subtitle?: string;
  /** Додатковий рядок дрібнішим шрифтом (час, коментар) */
  metaLine?: string;
  /** Дата у форматі списку (напр. 02.11.2025) */
  dateLine: string;
  statusLabel: string;
  /** Клас кольору для статусу (напр. text-amber-600) */
  statusTextClassName: string;
  /** `inline` — статус у правому верхньому рядку поруч із назвою; `bottom` — окремим рядком знизу */
  statusPlacement?: 'bottom' | 'inline';
  /** `bottom-right` — `metaLine` (напр. сума) у нижньому правому куті картки */
  metaPlacement?: 'default' | 'bottom-right';
  className?: string;
} & Omit<LinkProps, 'to' | 'className' | 'children'>;

/**
 * Горизонтальна картка списку: зліва смуга з іконкою в білому колі, справа — назва, дата, статус.
 */
export function UserPortalRowCard({
  to,
  accent,
  icon,
  title,
  subtitle,
  metaLine,
  dateLine,
  statusLabel,
  statusTextClassName,
  statusPlacement = 'bottom',
  metaPlacement = 'default',
  className = '',
  ...linkRest
}: Props) {
  const a = ACCENT[accent];
  const statusInline = statusPlacement === 'inline';
  const metaBottomRight = metaPlacement === 'bottom-right' && Boolean(metaLine);
  return (
    <Link
      to={to}
      className={`group flex w-full min-h-[4.75rem] min-w-0 items-stretch overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-green-300/90 hover:shadow-md hover:ring-green-950/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 ${className}`}
      {...linkRest}
    >
      <div
        className={`flex w-[3.5rem] shrink-0 flex-col items-center justify-center rounded-l-2xl py-2.5 sm:w-16 sm:py-3 ${a.strip}`}
        aria-hidden
      >
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 sm:h-10 sm:w-10 ${a.iconWrap}`}
        >
          <span className={`[&>svg]:h-[1.15rem] [&>svg]:w-[1.15rem] sm:[&>svg]:h-5 sm:[&>svg]:w-5 ${a.icon}`}>
            {icon}
          </span>
        </div>
      </div>
      <div
        className={`flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2.5 pr-3 pl-2 sm:py-3 sm:pr-3.5 sm:pl-2.5 ${
          metaBottomRight ? 'min-h-0 justify-between' : ''
        }`}
      >
        <div className="min-w-0 space-y-0.5">
          {statusInline ? (
            <div className="flex min-w-0 items-start justify-between gap-2">
              <p
                className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold leading-snug text-slate-900 sm:text-base"
                title={title}
              >
                {title}
              </p>
              <span className={`shrink-0 text-sm font-bold leading-snug ${statusTextClassName}`}>{statusLabel}</span>
            </div>
          ) : (
            <p
              className="truncate text-[0.9375rem] font-semibold leading-snug text-slate-900 sm:text-base"
              title={title}
            >
              {title}
            </p>
          )}
          {subtitle ? (
            <p className="truncate text-sm text-slate-500" title={subtitle}>
              {subtitle}
            </p>
          ) : null}
          {dateLine ? (
            <p className="text-xs tabular-nums text-slate-500 sm:text-sm">{dateLine}</p>
          ) : null}
          {metaLine && !metaBottomRight ? (
            <p className="truncate text-xs text-slate-500 sm:text-sm" title={metaLine}>
              {metaLine}
            </p>
          ) : null}
          {!statusInline ? (
            <p className={`text-xs font-bold sm:text-sm ${statusTextClassName}`}>{statusLabel}</p>
          ) : null}
        </div>
        {metaBottomRight ? (
          <div className="flex min-w-0 justify-end pt-2">
            <p
              className="text-right text-base font-bold tabular-nums text-slate-900 sm:text-lg"
              title={metaLine}
            >
              {metaLine}
            </p>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
