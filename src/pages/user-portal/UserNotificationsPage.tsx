import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUserNotifications } from '../../context/UserNotificationsContext';
import { AppCard, OutlineButton } from '../../components/station-admin/Primitives';

const kindLabel: Record<string, string> = {
  charge: 'Зарядка',
  booking: 'Бронювання',
  promo: 'Акція',
  system: 'Система',
};

const kindTone: Record<string, string> = {
  charge: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  booking: 'bg-sky-50 text-sky-800 ring-sky-200',
  promo: 'bg-amber-50 text-amber-900 ring-amber-200',
  system: 'bg-gray-100 text-gray-700 ring-gray-200',
};

export default function UserNotificationsPage() {
  const { notifications, unreadCount, markAllRead } = useUserNotifications();

  const sorted = useMemo(
    () => [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notifications]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Сповіщення</h1>
          <p className="mt-1 text-sm text-gray-500">Нагадування про зарядку, бронювання та акції.</p>
        </div>
        {unreadCount > 0 ? (
          <OutlineButton type="button" className="!text-xs shrink-0" onClick={markAllRead}>
            Позначити всі прочитаними
          </OutlineButton>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <AppCard className="py-12 text-center text-sm text-gray-500">Немає сповіщень.</AppCard>
      ) : (
        <ul className="space-y-3">
          {sorted.map((n) => (
            <li key={n.id}>
              <Link to={`/dashboard/notifications/${n.id}`}>
                <AppCard className="!p-4 transition hover:border-green-200 hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${kindTone[n.kind] ?? kindTone.system}`}
                        >
                          {kindLabel[n.kind] ?? n.kind}
                        </span>
                        {!n.read ? (
                          <span className="text-[10px] font-bold uppercase text-green-600">Нове</span>
                        ) : null}
                      </div>
                      <p className="mt-2 font-semibold text-gray-900">{n.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">{n.preview}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(n.createdAt).toLocaleString('uk-UA', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </AppCard>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
