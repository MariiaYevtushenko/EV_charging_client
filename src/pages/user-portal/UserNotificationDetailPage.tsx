import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useUserNotifications } from '../../context/UserNotificationsContext';
import { AppCard } from '../../components/station-admin/Primitives';

export default function UserNotificationDetailPage() {
  const { notificationId } = useParams<{ notificationId: string }>();
  const { getNotification, markRead } = useUserNotifications();
  const n = notificationId ? getNotification(notificationId) : undefined;

  useEffect(() => {
    if (!notificationId) return;
    const item = getNotification(notificationId);
    if (item && !item.read) markRead(notificationId);
  }, [notificationId, getNotification, markRead]);

  if (!n) {
    return <Navigate to="/dashboard/notifications" replace />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/dashboard/notifications"
        className="text-sm font-medium text-green-600 hover:text-green-700"
      >
        ← До сповіщень
      </Link>

      <AppCard>
        <p className="text-xs text-gray-500">
          {new Date(n.createdAt).toLocaleString('uk-UA', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{n.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{n.preview}</p>
        <div className="mt-6 border-t border-gray-100 pt-6">
          <div className="text-sm leading-relaxed text-gray-800">
            {n.body.split('\n').map((line, i) => (
              <p key={i} className={line.trim() === '' ? 'min-h-[0.75rem]' : 'mb-3 last:mb-0'}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </AppCard>
    </div>
  );
}
