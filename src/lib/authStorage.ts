import type { User } from '../types/auth';
import { AUTH_USER_LOCAL_STORAGE_KEY } from '../constants/storageKeys';

export function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_LOCAL_STORAGE_KEY);
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
      localStorage.removeItem(AUTH_USER_LOCAL_STORAGE_KEY);
      return;
    }
    localStorage.setItem(AUTH_USER_LOCAL_STORAGE_KEY, JSON.stringify(u));
  } catch {
    /* ignore quota / private mode */
  }
}
