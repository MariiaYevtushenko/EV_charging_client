import type { ReactNode } from 'react';
import { AppCard } from '../station-admin/Primitives';
import { userPortalIconTileLg, userPortalIconTileMd } from '../../styles/userPortalTheme';

/**
 * Єдиний порожній стан списків у кабінеті користувача: іконка в зеленій плитці, заголовок, підзаголовок, опційна дія.
 * Зразок — порожній список бронювань.
 */
export function UserPortalEmptyState({
  icon,
  title,
  description,
  footer,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  footer?: ReactNode;
}) {
  return (
    <AppCard>
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <div className={userPortalIconTileLg}>{icon}</div>
        <div>
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>
        </div>
        {footer}
      </div>
    </AppCard>
  );
}

/** Порожній стан всередині картки з графіком (менша іконка, без окремого AppCard). */
export function UserPortalChartEmpty({
  icon,
  description,
}: {
  icon: ReactNode;
  description: string;
}) {
  return (
    <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 px-4 text-center">
      <div className={userPortalIconTileMd}>{icon}</div>
      <p className="max-w-sm text-sm text-slate-600">{description}</p>
    </div>
  );
}
