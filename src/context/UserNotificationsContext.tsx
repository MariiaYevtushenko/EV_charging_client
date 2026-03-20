import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserNotification } from '../types/userNotification';
import { INITIAL_USER_NOTIFICATIONS } from '../data/userNotificationsMock';

type UserNotificationsContextValue = {
  notifications: UserNotification[];
  unreadCount: number;
  getNotification: (id: string) => UserNotification | undefined;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const UserNotificationsContext = createContext<UserNotificationsContextValue | undefined>(undefined);

export function UserNotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<UserNotification[]>(() =>
    INITIAL_USER_NOTIFICATIONS.map((n) => ({ ...n }))
  );

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
    <UserNotificationsContext.Provider value={value}>{children}</UserNotificationsContext.Provider>
  );
}

export function useUserNotifications() {
  const ctx = useContext(UserNotificationsContext);
  if (!ctx) throw new Error('useUserNotifications must be used within UserNotificationsProvider');
  return ctx;
}
