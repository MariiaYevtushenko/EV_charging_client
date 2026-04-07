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

export function fetchAdminUsersList(): Promise<EvUserPublicRow[]> {
  return getJson<EvUserPublicRow[]>("/api/admin/users");
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
    charges: [],
  };
}
