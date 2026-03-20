import type { User } from '../types/auth';

/** Демо-акаунти для тестування без бекенду. Пароль для всіх однаковий. */
export const DEMO_PASSWORD = 'password';

type DemoAccount = Pick<User, 'id' | 'name' | 'role'> & { balance?: number };

export const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  'admin@test.com': {
    id: 'demo-global-admin',
    name: 'Глобальний адмін',
    role: 'GLOBAL_ADMIN',
  },
  'station_admin@test.com': {
    id: 'demo-station-admin',
    name: 'Олена Коваленко',
    role: 'STATION_ADMIN',
    balance: 12450,
  },
  'user@test.com': {
    id: 'demo-user',
    name: 'Тестовий користувач',
    role: 'USER',
  },
};

export function findDemoAccount(email: string): DemoAccount | undefined {
  return DEMO_ACCOUNTS[email.trim().toLowerCase()];
}
