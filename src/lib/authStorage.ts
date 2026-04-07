import type { User } from '../types/auth';

const USER_KEY = 'ev_auth_user';

/** Мінімальні поля для відновлення сесії після перезавантаження сторінки. */
export function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as User;
    if (u && typeof u.id === 'string' && u.role) return u;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStoredUser(u: User | null): void {
  try {
    if (!u) {
      localStorage.removeItem(USER_KEY);
      return;
    }
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  } catch {
    /* ignore quota / private mode */
  }
}
