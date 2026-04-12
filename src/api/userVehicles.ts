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

/** Мапінг у модель кабінету (конектор у БД немає — з форми або дефолт). */
export function mapVehicleApiRowToUserCar(row: VehicleApiRow, connectorLabel = "—"): UserCar {
  return {
    id: String(row.id),
    plate: row.licensePlate,
    model: `${row.brand} ${row.vehicleModel}`.trim(),
    connector: connectorLabel,
    imageUrl: undefined,
  };
}
