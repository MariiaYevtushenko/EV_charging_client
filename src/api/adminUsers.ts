import { getJson } from "./http";
import type { EndUser, EvUserRole } from "../types/globalAdmin";

/** Відповідь GET /api/admin/users (без password_hash). */
export type EvUserPublicRow = {
  id: number;
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
  role: string;
  createdAt: string;
};

export type UsersRoleCounts = {
  USER: number;
  STATION_ADMIN: number;
  ADMIN: number;
};

export type PaginatedUsersResponse = {
  items: EvUserPublicRow[];
  total: number;
  page: number;
  pageSize: number;
  roleCounts: UsersRoleCounts;
};

const DEFAULT_ADMIN_USERS_PAGE_SIZE = 50;

/** Колонки сортування списку користувачів — узгоджено з GET /api/admin/users (`sort`, `order`). */
export type AdminUsersSortKey = 'name' | 'email' | 'phone' | 'role';

export function fetchAdminUsersPage(
  page: number,
  pageSize: number = DEFAULT_ADMIN_USERS_PAGE_SIZE,
  /** Фільтр списку за роллю; не передається — усі користувачі. */
  role?: EvUserRole | null,
  /** Пошук за ім’ям, прізвищем, email, телефоном (сервер). */
  search?: string | null,
  /** Сортування в БД по всій вибірці, потім пагінація. */
  sort: AdminUsersSortKey = 'name',
  order: 'asc' | 'desc' = 'asc'
): Promise<PaginatedUsersResponse> {
  const params = new URLSearchParams({
    page: String(Math.max(1, page)),
    pageSize: String(pageSize),
    sort,
    order,
  });
  if (role != null) {
    params.set("role", role);
  }
  const s = search?.trim();
  if (s) {
    params.set("q", s);
  }
  return getJson<PaginatedUsersResponse>(`/api/admin/users?${params.toString()}`);
}

/** Повна картка користувача (GET /api/admin/users/:id) — авто, бронювання, сесії, рахунки. */
export function fetchAdminUserDetail(userId: number): Promise<EndUser> {
  return getJson<EndUser>(`/api/admin/users/${userId}`);
}

/** Мінімальний `EndUser` для списку / кабінету (решта порожні масиви). */
export function mapEvUserPublicRowToEndUser(row: EvUserPublicRow): EndUser {
  const created =
    typeof row.createdAt === "string"
      ? row.createdAt
      : new Date(row.createdAt).toISOString();
  return {
    id: String(row.id),
    name: `${row.name} ${row.surname}`.trim(),
    email: row.email,
    phone: row.phoneNumber,
    role: row.role as EvUserRole,
    balance: 0,
    registeredAt: created,
    avatarUrl: undefined,
    blocked: false,
    cars: [],
    bookings: [],
    payments: [],
    sessions: [],
  };
}
