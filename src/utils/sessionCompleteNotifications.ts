/** Тексти для системних сповіщень (Notification API) після завершення зарядки. */
const TITLE_DONE = 'Зарядку завершено';
const BODY_DONE = 'Сесію зарядки успішно завершено.';
const TITLE_PAY = 'Рахунок';
const BODY_PAY = 'Можете оплатити рахунок у розділі «Платежі».';

const SECOND_DELAY_MS = 2600;

/**
 * Показує два desktop-сповіщення, якщо `Notification.permission === 'granted'`.
 * Дозвіл краще запитувати раніше (наприклад при відкритті вікна підтвердження) — після `await` жест може втратитись.
 */
export function showSessionCompleteDesktopNotifications(): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(TITLE_DONE, { body: BODY_DONE, lang: 'uk' });
  } catch {
    /* ігноруємо */
  }
  window.setTimeout(() => {
    try {
      new Notification(TITLE_PAY, { body: BODY_PAY, lang: 'uk' });
    } catch {
      /* ігноруємо */
    }
  }, SECOND_DELAY_MS);
}

/** Запит дозволу на сповіщення (викликати з обробника кліку / відкриття діалогу). */
export function prefetchSessionCompleteNotificationPermission(): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'default') return;
  void Notification.requestPermission();
}
