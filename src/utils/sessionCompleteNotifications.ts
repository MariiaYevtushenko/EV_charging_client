import {
  SESSION_COMPLETE_NOTIFICATION_BODY_DONE,
  SESSION_COMPLETE_NOTIFICATION_BODY_PAY,
  SESSION_COMPLETE_NOTIFICATION_SECOND_DELAY_MS,
  SESSION_COMPLETE_NOTIFICATION_TITLE_DONE,
  SESSION_COMPLETE_NOTIFICATION_TITLE_PAY,
} from '../constants/sessionCompleteNotificationsConstants';

/**
 * Показує два desktop-сповіщення, якщо `Notification.permission === 'granted'`.
 * Дозвіл краще запитувати раніше (наприклад при відкритті вікна підтвердження) — після `await` жест може втратитись.
 */
export function showSessionCompleteDesktopNotifications(): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(SESSION_COMPLETE_NOTIFICATION_TITLE_DONE, {
      body: SESSION_COMPLETE_NOTIFICATION_BODY_DONE,
      lang: 'uk',
    });
  } catch {
    /* ігноруємо */
  }
  window.setTimeout(() => {
    try {
      new Notification(SESSION_COMPLETE_NOTIFICATION_TITLE_PAY, {
        body: SESSION_COMPLETE_NOTIFICATION_BODY_PAY,
        lang: 'uk',
      });
    } catch {
      /* ігноруємо */
    }
  }, SESSION_COMPLETE_NOTIFICATION_SECOND_DELAY_MS);
}

/** Запит дозволу на сповіщення (викликати з обробника кліку / відкриття діалогу). */
export function prefetchSessionCompleteNotificationPermission(): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'default') return;
  void Notification.requestPermission();
}
