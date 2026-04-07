// src/types/auth.ts

export type UserRole = 'USER' | 'STATION_ADMIN' | 'GLOBAL_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Телефон з БД (`ev_user.phone_number`) */
  phone?: string;
  balance?: number; // Опціонально для звичайного юзера
  /** data URL фото профілю (демо, без бекенду) */
  avatarUrl?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}