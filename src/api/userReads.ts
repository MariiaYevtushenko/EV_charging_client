import { getJson } from "./http";
import type { VehicleApiRow } from "./userVehicles";
import { fetchUserProfile } from "./authApi";

export { fetchUserProfile };

/** GET /api/user/:userId/vehicles */
export function fetchUserVehicles(userId: number) {
  return getJson<VehicleApiRow[]>(`/api/user/${userId}/vehicles`);
}

/** GET /api/user/:userId/bookings */
export function fetchUserBookings(userId: number) {
  return getJson<unknown[]>(`/api/user/${userId}/bookings`);
}
