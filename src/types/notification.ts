export type AdminNotificationKind = 'daily' | 'info' | 'alert';

export interface AdminNotification {
  id: string;
  title: string;
  preview: string;
  body: string;
  createdAt: string;
  read: boolean;
  kind: AdminNotificationKind;
}
