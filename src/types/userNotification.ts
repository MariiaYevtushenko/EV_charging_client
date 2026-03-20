export type UserNotificationKind = 'charge' | 'booking' | 'promo' | 'system';

export interface UserNotification {
  id: string;
  title: string;
  preview: string;
  body: string;
  createdAt: string;
  read: boolean;
  kind: UserNotificationKind;
}
