import { getJson, postJson, putJson } from "./http";
import type { UserCar } from "../types/userPortal";

/** Відповідь Prisma / JSON для vehicle */
export type VehicleApiRow = {
  id: number;
  userId: number;
  licensePlate: string;
  brand: string;
  vehicleModel: string;
  batteryCapacity: string | number;
};

export type CreateVehicleBody = {
  licensePlate: string;
  brand: string;
  vehicleModel: string;
  batteryCapacity: number;
};

export type UpdateVehicleBody = CreateVehicleBody;

/** GET /api/user/:userId/vehicle/:vehicleId/stats — агрегати session + bill. */
export type UserVehiclePeriodAgg = {
  sessionCount: number;
  kwhTotal: number;
  revenueUah: number;
};

export type UserVehicleAggregatesDto = {
  vehicleId: number;
  all: UserVehiclePeriodAgg;
  today: UserVehiclePeriodAgg;
  last7d: UserVehiclePeriodAgg;
  last30d: UserVehiclePeriodAgg;
};

export function fetchUserVehicleAggregates(userId: number, vehicleId: number) {
  return getJson<UserVehicleAggregatesDto>(`/api/user/${userId}/vehicle/${vehicleId}/stats`);
}

/** POST /api/user/:userId/vehicle */
export function postUserVehicle(userId: number, body: CreateVehicleBody) {
  return postJson<VehicleApiRow>(`/api/user/${userId}/vehicle`, body);
}

/** PUT /api/user/:userId/vehicle/:vehicleId */
export function putUserVehicle(userId: number, vehicleId: number, body: UpdateVehicleBody) {
  return putJson<VehicleApiRow>(`/api/user/${userId}/vehicle/${vehicleId}`, body);
}

/** Рядок для поля «ємність акумулятора» у формі. */
export function userCarBatteryCapacityInput(car: UserCar): string {
  const b = car.batteryCapacity;
  if (b == null || !Number.isFinite(b)) return '';
  return Number.isInteger(b) ? String(b) : String(b).replace('.', ',');
}

/** Початкові значення бренду/моделі, якщо в об’єкті лише рядок `model` (наприклад, старий стан). */
export function userCarInitialBrandModel(car: UserCar): { brand: string; vehicleModel: string } {
  const b = car.brand.trim();
  const vm = car.vehicleModel.trim();
  if (b || vm) return { brand: b, vehicleModel: vm };
  const m = car.model.trim();
  const idx = m.indexOf(' ');
  if (idx === -1) return { brand: m, vehicleModel: '' };
  return { brand: m.slice(0, idx).trim(), vehicleModel: m.slice(idx + 1).trim() };
}

/** Мапінг у модель кабінету (конектор у БД немає — дефолт для фільтрів бронювання/головної). */
function parseBatteryCapacity(raw: string | number | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = typeof raw === 'string' ? Number(raw.replace(',', '.')) : Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function mapVehicleApiRowToUserCar(row: VehicleApiRow, connectorLabel = 'Type 2'): UserCar {
  const brand = row.brand.trim();
  const vehicleModel = row.vehicleModel.trim();
  const batteryCapacity = parseBatteryCapacity(row.batteryCapacity);
  return {
    id: String(row.id),
    plate: row.licensePlate,
    brand,
    vehicleModel,
    model: `${brand} ${vehicleModel}`.trim(),
    batteryCapacity,
    connector: connectorLabel,
    imageUrl: undefined,
  };
}
