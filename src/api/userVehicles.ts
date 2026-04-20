import { postJson } from "./http";
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

/** POST /api/user/:userId/vehicle */
export function postUserVehicle(userId: number, body: CreateVehicleBody) {
  return postJson<VehicleApiRow>(`/api/user/${userId}/vehicle`, body);
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
export function mapVehicleApiRowToUserCar(row: VehicleApiRow, connectorLabel = 'Type 2'): UserCar {
  const brand = row.brand.trim();
  const vehicleModel = row.vehicleModel.trim();
  return {
    id: String(row.id),
    plate: row.licensePlate,
    brand,
    vehicleModel,
    model: `${brand} ${vehicleModel}`.trim(),
    connector: connectorLabel,
    imageUrl: undefined,
  };
}
