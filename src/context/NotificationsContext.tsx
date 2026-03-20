import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AdminNotification } from '../types/notification';
import { INITIAL_NOTIFICATIONS } from '../data/notificationsMock';

type NotificationsContextValue = {
  notifications: AdminNotification[];
  unreadCount: number;
  getNotification: (id: string) => AdminNotification | undefined;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>(() => [
    ...INITIAL_NOTIFICATIONS,
  ]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const getNotification = useCallback(
    (id: string) => notifications.find((n) => n.id === id),
    [notifications]
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      getNotification,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, getNotification, markRead, markAllRead]
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
