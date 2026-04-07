import { getJson, postJson, putJson } from "./http";
import type { User, UserRole } from "../types/auth";

type EvUserLoginRow = {
  id: number;
  name: string;
  surname: string;
  email: string;
  role: string;
  phoneNumber?: string;
};

/** Відповідь GET/PUT /api/user/:id та дані після логіну (без password_hash). */
export type EvUserPublicDto = {
  id: number;
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
  role: string;
  createdAt?: string;
};

function mapRole(role: string): UserRole {
  if (role === "ADMIN") return "GLOBAL_ADMIN";
  if (role === "STATION_ADMIN") return "STATION_ADMIN";
  return "USER";
}

export function mapEvUserRowToUser(u: EvUserLoginRow): User {
  return {
    id: String(u.id),
    email: u.email,
    name: `${u.name} ${u.surname}`.trim(),
    role: mapRole(u.role),
    phone: u.phoneNumber ?? "",
  };
}

export function mapPublicDtoToUser(dto: EvUserPublicDto): User {
  return {
    id: String(dto.id),
    email: dto.email,
    name: `${dto.name} ${dto.surname}`.trim(),
    role: mapRole(dto.role),
    phone: dto.phoneNumber,
  };
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<User> {
  const row = await postJson<EvUserLoginRow>("/api/users/login", {
    email: email.trim(),
    password,
  });
  return mapEvUserRowToUser(row);
}

/** Актуальний профіль з БД (GET /api/user/:userId). */
export function fetchUserProfile(userId: number): Promise<EvUserPublicDto> {
  return getJson<EvUserPublicDto>(`/api/user/${userId}`);
}

export type UserProfileUpdateBody = {
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
};

/** Оновлення профілю (PUT /api/user/:userId). */
export async function updateUserProfile(
  userId: number,
  body: UserProfileUpdateBody
): Promise<User> {
  const dto = await putJson<EvUserPublicDto>(`/api/user/${userId}`, body);
  return mapPublicDtoToUser(dto);
}

/** Зміна пароля (POST /api/user/:userId/change-password). */
export async function changeUserPassword(
  userId: number,
  payload: { currentPassword: string; newPassword: string }
): Promise<void> {
  await postJson<{ ok: boolean }>(`/api/user/${userId}/change-password`, payload);
}

/** Розбиття «Повне імʼя» на поля БД `name` + `surname` (обидва обовʼязкові в схемі). */
export function splitFullName(full: string): { name: string; surname: string } {
  const t = full.trim();
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: "Користувач", surname: "-" };
  if (parts.length === 1) return { name: parts[0]!.slice(0, 50), surname: "-" };
  return {
    name: parts[0]!.slice(0, 50),
    surname: parts.slice(1).join(" ").slice(0, 50),
  };
}
